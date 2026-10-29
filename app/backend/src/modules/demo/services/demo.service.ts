import { createHash, randomBytes } from "node:crypto";
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThanOrEqual, MoreThan, Repository } from "typeorm";
import { auth } from "../../../auth/auth.config.js";
import { fromNodeHeaders } from "better-auth/node";
import type {
  DemoEndResponse,
  DemoRole,
  DemoStartResponse,
  DemoStatus,
} from "@tiby/ts-shared";
import { DemoSession } from "../entities/demo-session.entity.js";
import { AuthUser } from "../../../auth/entities/auth-user.entity.js";
import { Facility } from "../../facilities/entities/facilities.entity.js";
import { TreatmentPlan } from "../../patients/entities/treatment-plan.entity.js";
import { PmoAssignment } from "../../patients/entities/pmo-assignment.entity.js";
import { DailyCheckIn } from "../../check-ins/entities/daily-check-in.entity.js";
import { ConsentRecord } from "../../consent/entities/consent-record.entity.js";
import { UserNotification } from "../../notifications/entities/user-notification.entity.js";
import { AuditLog } from "../../internal/audit/entities/audit-log.entity.js";

export const DEMO_COOKIE = "tiby_demo";
export const DEMO_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_STARTS_PER_HOUR = 5;
const MAX_ACTIVE_DEMOS = 10;

/** Every demo account: persona users sign in; extras only populate dashboards. */
const ACCOUNTS = [
  {
    key: "pasien",
    role: "PASIEN" as const,
    name: "Budi Santoso",
    mustConfirmConsent: true,
    persona: true,
  },
  {
    key: "pmo",
    role: "PMO" as const,
    name: "Ratna Dewi",
    mustConfirmConsent: false,
    persona: true,
  },
  {
    key: "nakes",
    role: "NAKES" as const,
    name: "dr. Rini Suryani",
    mustConfirmConsent: false,
    persona: true,
  },
  {
    key: "pasien2",
    role: "PASIEN" as const,
    name: "Siti Aminah",
    mustConfirmConsent: false,
    persona: false,
  },
  {
    key: "pasien3",
    role: "PASIEN" as const,
    name: "Agus Prasetyo",
    mustConfirmConsent: false,
    persona: false,
  },
];

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  // ponytail: in-memory per-instance limit; a shared store if the backend scales out.
  private readonly starts = new Map<string, number[]>();

  constructor(
    @InjectRepository(DemoSession)
    private readonly demoRepo: Repository<DemoSession>,
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
    @InjectRepository(TreatmentPlan)
    private readonly planRepo: Repository<TreatmentPlan>,
    @InjectRepository(PmoAssignment)
    private readonly pmoRepo: Repository<PmoAssignment>,
    @InjectRepository(DailyCheckIn)
    private readonly checkInRepo: Repository<DailyCheckIn>,
    @InjectRepository(ConsentRecord)
    private readonly consentRepo: Repository<ConsentRecord>,
    @InjectRepository(UserNotification)
    private readonly notificationRepo: Repository<UserNotification>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  readToken(req: { headers?: unknown }): string | null {
    const cookies = (req.headers as Record<string, unknown> | undefined)
      ?.cookie;
    if (typeof cookies !== "string") return null;
    const pair = cookies
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${DEMO_COOKIE}=`));
    return pair ? decodeURIComponent(pair.slice(DEMO_COOKIE.length + 1)) : null;
  }

  private tokenHash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async findActive(token: string | null): Promise<DemoSession | null> {
    if (!token) return null;
    const demo = await this.demoRepo.findOneBy({
      tokenHash: this.tokenHash(token),
    });
    return demo && demo.expiresAt.getTime() > Date.now() ? demo : null;
  }

  async status(token: string | null): Promise<DemoStatus> {
    const demo = await this.findActive(token);
    // The live list doubles as the availability indicator: max 10 rows, and
    // expired rows are excluded before the cleanup cron deletes them.
    const live = await this.demoRepo.find({
      where: { expiresAt: MoreThan(new Date()) },
      order: { createdAt: "ASC" },
    });
    return {
      active: !!demo,
      expiresAt: demo ? demo.expiresAt.toISOString() : null,
      activeCount: live.length,
      maxActive: MAX_ACTIVE_DEMOS,
      sessions: live.map((session) => ({
        label: session.id.slice(-4).toUpperCase(),
        startedAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        isMine: session.id === demo?.id,
      })),
    };
  }

  private async assertAllowed(ip: string | undefined): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60 * 60 * 1000;
    const key = ip ?? "unknown";
    const attempts = (this.starts.get(key) ?? []).filter((at) => at > windowStart);
    attempts.push(now);
    this.starts.set(key, attempts);
    const active = await this.demoRepo.count({
      where: { expiresAt: MoreThan(new Date()) },
    });
    if (attempts.length > MAX_STARTS_PER_HOUR || active >= MAX_ACTIVE_DEMOS) {
      throw new HttpException(
        {
          code: "DEMO_LIMIT",
          message: "Semua sesi demo sedang dipakai. Coba lagi saat sesi lain berakhir.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Creates a demo; returns the raw token for the httpOnly cookie. */
  async create(ip: string | undefined): Promise<DemoStartResponse & { token: string }> {
    await this.assertAllowed(ip);
    const suffix = randomBytes(4).toString("hex");
    const token = randomBytes(32).toString("hex");
    const password = randomBytes(18).toString("base64url");
    const expiresAt = new Date(Date.now() + DEMO_TTL_MS);
    const today = new Date().toISOString().slice(0, 10);
    const targetEnd = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    // Reminder lands after the demo window so crons never fire for demo plans.
    const reminderAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const reminderTimeLocal = `${String(reminderAt.getHours()).padStart(2, "0")}:${String(reminderAt.getMinutes()).padStart(2, "0")}`;

    let facilityId: string | null = null;
    let demoId: string | null = null;
    try {
      const facility = await this.facilityRepo.save(
        this.facilityRepo.create({
          code: `DEMO-${suffix.toUpperCase()}`,
          name: "Puskesmas Demo Argon",
          district: "Jakarta Pusat",
          emergencyPhone: "0811-0000-0000",
        }),
      );
      facilityId = facility.id;

      const demo = await this.demoRepo.save(
        this.demoRepo.create({
          tokenHash: this.tokenHash(token),
          passwordEncrypted: password,
          facilityId: facility.id,
          patientUserId: "",
          pmoUserId: "",
          nakesUserId: "",
          expiresAt,
        }),
      );
      demoId = demo.id;

      const userIds: Record<string, string> = {};
      for (const account of ACCOUNTS) {
        const created = await auth.api.createUser({
          body: {
            name: account.name,
            email: `demo_${suffix}_${account.key}@demo.tiby.internal`,
            password,
            role: account.role,
            data: {
              username: `demo_${suffix}_${account.key}`,
              displayUsername: `demo_${suffix}_${account.key}`,
              role: account.role,
              facility_id: facility.id,
              full_name_encrypted: account.name,
              whatsapp_verified: false,
              must_confirm_consent: account.mustConfirmConsent,
              demo_session_id: demo.id,
            },
          },
        });
        userIds[account.key] = created.user.id;
      }

      const plans: Array<{ id: string; patientUserId: string }> = [];
      const planSpecs = [
        { patientKey: "pasien", streak: 0, withHistory: false },
        { patientKey: "pasien2", streak: 4, withHistory: true },
        { patientKey: "pasien3", streak: 3, withHistory: true },
      ];
      for (const spec of planSpecs) {
        const plan = await this.planRepo.save(
          this.planRepo.create({
            patientUserId: userIds[spec.patientKey],
            facilityId: facility.id,
            registeredByNakesId: userIds.nakes,
            phase: "INTENSIF",
            patientState: "AKTIF",
            regimenCode: "FDC-4",
            dailyPillQuota: 4,
            reminderTimeLocal,
            timezone: "Asia/Jakarta",
            startDate: today,
            targetEndDate: targetEnd,
            currentStreak: spec.streak,
            consecutiveSilenceDays: 0,
            lastSilenceCheckDate: today,
            riskScore: 0,
          }),
        );
        plans.push({ id: plan.id, patientUserId: userIds[spec.patientKey] });
        await this.pmoRepo.save(
          this.pmoRepo.create({
            treatmentPlanId: plan.id,
            pmoUserId: userIds.pmo,
            relationship: "KELUARGA",
            isPrimary: true,
            active: true,
          }),
        );
      }

      // Consent for the extra patients only; Budi stays unconsented so the
      // visitor experiences the consent gate.
      const scopes = ["PATIENT_DATA_SHARE", "PMO_STATUS_ONLY", "STT_AUDIO_PROCESSING"];
      for (const plan of [plans[1], plans[2]]) {
        for (const scope of scopes) {
          await this.consentRepo.save(
            this.consentRepo.create({
              userId: plan.patientUserId,
              consentVersion: "1.0",
              scope,
              ipAddress: "127.0.0.1",
            }),
          );
        }
      }

      // Fulfilled history for the extras; none for Budi.
      for (const plan of [plans[1], plans[2]]) {
        for (let daysAgo = 1; daysAgo <= 4; daysAgo++) {
          const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
          await this.checkInRepo.save(
            this.checkInRepo.create({
              treatmentPlanId: plan.id,
              checkInDate: date.toISOString().slice(0, 10),
              attemptNumber: 1,
              reportedByUserId: plan.patientUserId,
              reportedByRole: "PASIEN",
              inputMode: "MANUAL",
              medicationStatus: "SUDAH_MINUM",
              pillsTakenCount: 4,
              isDoseFulfilled: true,
            }),
          );
        }
      }

      await this.demoRepo.update(demo.id, {
        patientUserId: userIds.pasien,
        pmoUserId: userIds.pmo,
        nakesUserId: userIds.nakes,
      });
      return { expiresAt: expiresAt.toISOString(), token };
    } catch (err) {
      this.logger.error(`Demo creation failed: ${(err as Error).message}`);
      if (facilityId) {
        // Facility delete cascades every demo row; leftover users die with it.
        await this.facilityRepo.delete({ id: facilityId });
      }
      if (demoId) await this.demoRepo.delete({ id: demoId });
      throw err;
    }
  }

  /** Returns the Better Auth `Set-Cookie` headers the controller must forward. */
  async enter(
    token: string | null,
    role: DemoRole,
    headers: unknown,
  ): Promise<{ role: DemoRole; setCookie: string[] }> {
    const demo = await this.findActive(token);
    if (!demo) {
      throw new ForbiddenException({
        code: "DEMO_EXPIRED",
        message: "Sesi demo sudah berakhir. Mulai demo baru untuk melanjutkan.",
      });
    }
    const userId =
      role === "PASIEN"
        ? demo.patientUserId
        : role === "PMO"
          ? demo.pmoUserId
          : demo.nakesUserId;
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user?.username) {
      throw new ForbiddenException({
        code: "DEMO_EXPIRED",
        message: "Sesi demo sudah berakhir. Mulai demo baru untuk melanjutkan.",
      });
    }
    const res = await auth.api.signInUsername({
      body: {
        username: user.username,
        password: demo.passwordEncrypted,
        rememberMe: true,
      },
      headers: fromNodeHeaders(headers as Record<string, string>),
      asResponse: true,
    });
    const setCookie: string[] =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
    return { role, setCookie };
  }

  async end(token: string | null): Promise<DemoEndResponse> {
    if (!token) return { ok: true };
    const demo = await this.demoRepo.findOneBy({
      tokenHash: this.tokenHash(token),
    });
    if (demo) await this.deleteDemo(demo);
    return { ok: true };
  }

  async cleanupExpired(): Promise<{ cleaned: number }> {
    const expired = await this.demoRepo.find({
      where: { expiresAt: LessThanOrEqual(new Date()) },
    });
    for (const demo of expired) {
      try {
        await this.deleteDemo(demo);
        this.logger.log(`Deleted expired demo ${demo.id}`);
      } catch (err) {
        this.logger.error(
          `Demo deletion failed for ${demo.id}: ${(err as Error).message}`,
        );
      }
    }
    return { cleaned: expired.length };
  }

  /** The facility is the tenant boundary: anything created inside the demo
   * (including patients the demo NAKES onboards) dies with it. */
  private async deleteDemo(demo: DemoSession): Promise<void> {
    // Sequential lookups: the Repository API cannot express OR across a uuid
    // column and a varchar column without risking a uuid cast error.
    const inFacility = await this.userRepo.find({
      where: { facilityId: demo.facilityId },
      select: { id: true },
    });
    const inSession = await this.userRepo.find({
      where: { demoSessionId: demo.id },
      select: { id: true },
    });
    const userIds = [...new Set([...inFacility, ...inSession].map((u) => u.id))];
    const plans = await this.planRepo.find({
      where: { facilityId: demo.facilityId },
      select: { id: true },
    });
    const planIds = plans.map((p) => p.id);

    if (userIds.length > 0) {
      await this.notificationRepo.delete({ recipientUserId: In(userIds) });
      await this.auditRepo.delete({ actorUserId: In(userIds) });
      await this.auditRepo.delete({
        targetId: In([...userIds, ...planIds, demo.facilityId]),
      });
    } else if (planIds.length > 0) {
      await this.auditRepo.delete({ targetId: In([...planIds, demo.facilityId]) });
    }

    await this.planRepo.delete({ facilityId: demo.facilityId });
    await this.userRepo.delete({ facilityId: demo.facilityId });
    await this.userRepo.delete({ demoSessionId: demo.id });
    await this.facilityRepo.delete({ id: demo.facilityId });
    await this.demoRepo.delete({ id: demo.id });
  }
}
