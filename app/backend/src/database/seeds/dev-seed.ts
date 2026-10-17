import "reflect-metadata";
import { randomBytes } from "node:crypto";
import { AppDataSource } from "../data-source.js";
import { auth } from "../../auth/auth.config.js";
import type { User } from "better-auth";
import type { UserRole } from "@tiby/ts-shared";
import {
  Facility,
  ConsentRecord,
  TreatmentPlan,
  PmoAssignment,
} from "../entities.js";

async function runSeed() {
  console.log("🌱 Starting Tiby Development Seed...");

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const facilityRepo = AppDataSource.getRepository(Facility);
  const consentRepo = AppDataSource.getRepository(ConsentRecord);
  const planRepo = AppDataSource.getRepository(TreatmentPlan);
  const pmoAssignRepo = AppDataSource.getRepository(PmoAssignment);

  // 1. Ensure Development Facility
  let facility = await facilityRepo.findOneBy({ code: "FASKES-DEV-001" });
  if (!facility) {
    facility = await facilityRepo.save(
      facilityRepo.create({
        code: "FASKES-DEV-001",
        name: "Puskesmas Gambir",
        district: "Jakarta Pusat",
        emergencyPhone: "0811-2233-4455",
      }),
    );
  }

  const DEFAULT_PASSWORD = "pwgampang_123";
  const suffix = randomBytes(2).toString("hex");

  const accounts: Array<{
    role: UserRole;
    username: string;
    name: string;
    email: string;
    facilityId: string | null;
  }> = [
    {
      role: "ADMIN",
      username: `admin_pusat_${suffix}`,
      name: "Super Admin Tiby",
      email: `admin_pusat_${suffix}@users.tiby.internal`,
      facilityId: null,
    },
    {
      role: "NAKES",
      username: `nakes_rini_${suffix}`,
      name: "dr. Rini Suryani",
      email: `nakes_rini_${suffix}@users.tiby.internal`,
      facilityId: facility.id,
    },
    {
      role: "PASIEN",
      username: `pasien_budi_${suffix}`,
      name: "Budi Santoso",
      email: `pasien_budi_${suffix}@users.tiby.internal`,
      facilityId: facility.id,
    },
    {
      role: "PMO",
      username: `pmo_ratna_${suffix}`,
      name: "Ratna Dewi",
      email: `pmo_ratna_${suffix}@users.tiby.internal`,
      facilityId: facility.id,
    },
  ];

  const createdUsers: Partial<Record<UserRole, User>> = {};

  for (const acc of accounts) {
    const res = await auth.api.createUser({
      body: {
        name: acc.name,
        email: acc.email,
        password: DEFAULT_PASSWORD,
        role: acc.role,
        data: {
          username: acc.username,
          displayUsername: acc.username,
          role: acc.role,
          facility_id: acc.facilityId,
          full_name_encrypted: acc.name,
          whatsapp_encrypted: "08123456789",
          whatsapp_hash: "seed_dummy_hash",
          whatsapp_verified: true,
          must_confirm_consent: false,
        },
      },
    });
    createdUsers[acc.role] = res.user;
  }

  // 2. Active Consent Record for Pasien
  const pasienUser = createdUsers["PASIEN"]!;
  const nakesUser = createdUsers["NAKES"]!;
  const pmoUser = createdUsers["PMO"]!;

  const scopes = ["PATIENT_DATA_SHARE", "PMO_STATUS_ONLY", "STT_AUDIO_PROCESSING"];
  for (const scope of scopes) {
    await consentRepo.save(
      consentRepo.create({
        userId: pasienUser.id,
        consentVersion: "1.0",
        scope,
        grantedAt: new Date(),
        ipAddress: "127.0.0.1",
      }),
    );
  }

  // 3. Treatment Plan for Pasien
  const today = new Date().toISOString().slice(0, 10);
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 180);
  const targetEndDate = targetDate.toISOString().slice(0, 10);

  const treatmentPlan = await planRepo.save(
    planRepo.create({
      patientUserId: pasienUser.id,
      facilityId: facility.id,
      registeredByNakesId: nakesUser.id,
      phase: "INTENSIF",
      patientState: "AKTIF",
      regimenCode: "FDC-4",
      dailyPillQuota: 4,
      reminderTimeLocal: "08:00",
      timezone: "Asia/Jakarta",
      startDate: today,
      targetEndDate,
      currentStreak: 5,
      consecutiveSilenceDays: 0,
      riskScore: 0,
    }),
  );

  // 4. PMO Assignment linking PMO to Pasien
  await pmoAssignRepo.save(
    pmoAssignRepo.create({
      treatmentPlanId: treatmentPlan.id,
      pmoUserId: pmoUser.id,
      relationship: "KELUARGA",
      isPrimary: true,
      active: true,
    }),
  );

  console.log("\n=======================================================");
  console.log("🎉 Tiby Development Seed Completed Successfully!");
  console.log("=======================================================");
  console.log(`Facility: ${facility.name} (${facility.code})`);
  console.log(`Common Password: ${DEFAULT_PASSWORD}\n`);
  for (const acc of accounts) {
    console.log(`Role: ${acc.role.padEnd(8)} | Username: ${acc.username.padEnd(20)} | Password: ${DEFAULT_PASSWORD}`);
  }
  console.log("=======================================================\n");

  await AppDataSource.destroy();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
