import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DataSource } from "typeorm";
import { AppDataSource } from "../src/database/data-source.js";
import { AuthUser } from "../src/auth/entities/auth-user.entity.js";
import { PushSubscription } from "../src/modules/push/entities/push-subscription.entity.js";
import { Facility } from "../src/entities/facility.entity.js";
import { TreatmentPlan } from "../src/modules/patients/entities/treatment-plan.entity.js";
import { DailyCheckIn } from "../src/modules/check-ins/entities/daily-check-in.entity.js";

describe("TypeORM Entities Integration", () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await AppDataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it("persists AuthUser with AES-256-GCM encrypted PII fields", async () => {
    const userRepo = dataSource.getRepository(AuthUser);
    const userId = `test-user-${Date.now()}`;

    const user = userRepo.create({
      id: userId,
      username: `pasien_${Date.now()}`,
      name: "Budi Santoso",
      email: `budi_${Date.now()}@users.tiby.internal`,
      role: "PASIEN",
      fullNameEncrypted: "Budi Santoso",
      whatsappEncrypted: "628123456789",
      whatsappHash: "hash123",
      mustConfirmConsent: true,
    });

    await userRepo.save(user);

    // Read back through TypeORM (should automatically decrypt)
    const saved = await userRepo.findOneBy({ id: userId });
    expect(saved).toBeDefined();
    expect(saved?.fullNameEncrypted).toBe("Budi Santoso");
    expect(saved?.whatsappEncrypted).toBe("628123456789");

    // Check raw SQL value in DB to ensure it is actually encrypted
    const raw = await dataSource.query("SELECT full_name_encrypted, whatsapp_encrypted FROM users WHERE id = $1", [userId]);
    expect(raw[0].full_name_encrypted).not.toBe("Budi Santoso");
    expect(raw[0].full_name_encrypted).toContain(":"); // iv:authTag:cipher

    // Cleanup
    await userRepo.delete({ id: userId });
  });

  it("enforces ON DELETE CASCADE from AuthUser to PushSubscription", async () => {
    const userRepo = dataSource.getRepository(AuthUser);
    const pushRepo = dataSource.getRepository(PushSubscription);
    const userId = `test-push-user-${Date.now()}`;

    const user = await userRepo.save(
      userRepo.create({
        id: userId,
        username: `push_user_${Date.now()}`,
        name: "Push User",
        email: `push_${Date.now()}@users.tiby.internal`,
        role: "PASIEN",
      }),
    );

    const endpoint = `https://fcm.googleapis.com/fcm/send/token-${Date.now()}`;
    await pushRepo.save(
      pushRepo.create({
        userId: user.id,
        endpoint,
        p256dh: "key-p256dh",
        auth: "key-auth",
      }),
    );

    // Verify push subscription exists
    const beforeCount = await pushRepo.countBy({ userId });
    expect(beforeCount).toBe(1);

    // Delete user
    await userRepo.delete({ id: userId });

    // Verify cascade deleted the push subscription
    const afterCount = await pushRepo.countBy({ userId });
    expect(afterCount).toBe(0);
  });

  it("enforces partial unique index on daily_check_ins for fulfilled doses", async () => {
    const facilityRepo = dataSource.getRepository(Facility);
    const userRepo = dataSource.getRepository(AuthUser);
    const planRepo = dataSource.getRepository(TreatmentPlan);
    const checkInRepo = dataSource.getRepository(DailyCheckIn);

    const timestamp = Date.now();
    const facility = await facilityRepo.save(
      facilityRepo.create({
        code: `FASKES-${timestamp}`,
        name: "Puskesmas Tebet",
        district: "Jakarta Selatan",
        emergencyPhone: "021-123456",
      }),
    );

    const patient = await userRepo.save(
      userRepo.create({
        id: `pat-${timestamp}`,
        username: `pat_${timestamp}`,
        name: "Patient One",
        email: `pat_${timestamp}@users.tiby.internal`,
        role: "PASIEN",
      }),
    );

    const nakes = await userRepo.save(
      userRepo.create({
        id: `nakes-${timestamp}`,
        username: `nakes_${timestamp}`,
        name: "Nakes One",
        email: `nakes_${timestamp}@users.tiby.internal`,
        role: "NAKES",
      }),
    );

    const plan = await planRepo.save(
      planRepo.create({
        patientUserId: patient.id,
        facilityId: facility.id,
        registeredByNakesId: nakes.id,
        phase: "INTENSIF",
        patientState: "AKTIF",
        regimenCode: "FDC-4",
        dailyPillQuota: 4,
        startDate: "2026-10-16",
        targetEndDate: "2027-04-16",
      }),
    );

    const today = "2026-10-16";

    // 1. First fulfilled check-in succeeds
    await checkInRepo.save(
      checkInRepo.create({
        treatmentPlanId: plan.id,
        checkInDate: today,
        attemptNumber: 1,
        reportedByUserId: patient.id,
        reportedByRole: "PASIEN",
        inputMode: "VOICE_STT",
        medicationStatus: "SUDAH_MINUM",
        pillsTakenCount: 4,
        isDoseFulfilled: true,
      }),
    );

    // 2. Second fulfilled check-in on the SAME date fails due to partial unique index
    let duplicateError: Error | null = null;
    try {
      await checkInRepo.save(
        checkInRepo.create({
          treatmentPlanId: plan.id,
          checkInDate: today,
          attemptNumber: 2,
          reportedByUserId: patient.id,
          reportedByRole: "PASIEN",
          inputMode: "VOICE_STT",
          medicationStatus: "SUDAH_MINUM",
          pillsTakenCount: 4,
          isDoseFulfilled: true,
        }),
      );
    } catch (err) {
      duplicateError = err as Error;
    }

    expect(duplicateError).not.toBeNull();
    expect(duplicateError?.message).toContain("uq_daily_checkin_dose_fulfilled");

    // Cleanup
    await planRepo.delete({ id: plan.id });
    await userRepo.delete({ id: patient.id });
    await userRepo.delete({ id: nakes.id });
    await facilityRepo.delete({ id: facility.id });
  });
});
