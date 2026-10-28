/**
 * One-off reconciliation of streaks and silence counters.
 *
 *   bun scripts/reconcile-streaks.ts           # dry run (prints changes)
 *   bun scripts/reconcile-streaks.ts --apply   # writes
 *
 * Run from app/backend. It never changes patient_state or risk_score; it only
 * fixes current_streak, consecutive_silence_days and the detector watermark.
 */
import { AppDataSource } from "../src/database/data-source.js";
import { TreatmentPlan } from "../src/modules/patients/entities/treatment-plan.entity.js";
import { DailyCheckIn } from "../src/modules/check-ins/entities/daily-check-in.entity.js";
import { computeStreakStats } from "../src/modules/internal/escalation/streak-reconcile.js";

const apply = process.argv.includes("--apply");
const today = new Date().toISOString().slice(0, 10);

await AppDataSource.initialize();

const planRepo = AppDataSource.getRepository(TreatmentPlan);
const checkInRepo = AppDataSource.getRepository(DailyCheckIn);

const plans = await planRepo.find({ relations: { patientUser: true } });
const fulfilled = await checkInRepo.find({
  where: { isDoseFulfilled: true },
  select: { treatmentPlanId: true, checkInDate: true },
});

const byPlan = new Map<string, string[]>();
for (const row of fulfilled) {
  const dates = byPlan.get(row.treatmentPlanId) ?? [];
  dates.push(String(row.checkInDate).slice(0, 10));
  byPlan.set(row.treatmentPlanId, dates);
}

console.log(`mode: ${apply ? "APPLY" : "DRY RUN"}  (today=${today})`);

let changed = 0;
for (const plan of plans) {
  const stats = computeStreakStats({
    startDate: String(plan.startDate).slice(0, 10),
    targetEndDate: String(plan.targetEndDate).slice(0, 10),
    fulfilledDates: byPlan.get(plan.id) ?? [],
    today,
  });

  const watermark = plan.lastSilenceCheckDate
    ? String(plan.lastSilenceCheckDate).slice(0, 10)
    : null;

  const differs =
    stats.currentStreak !== plan.currentStreak ||
    stats.consecutiveSilenceDays !== plan.consecutiveSilenceDays ||
    stats.lastSilenceCheckDate !== watermark;

  if (!differs) continue;

  changed += 1;
  const username = plan.patientUser?.username ?? plan.patientUserId;
  console.log(
    `${username} | streak ${plan.currentStreak}->${stats.currentStreak}` +
      ` | silence ${plan.consecutiveSilenceDays}->${stats.consecutiveSilenceDays}` +
      ` | watermark ${watermark ?? "-"}->${stats.lastSilenceCheckDate ?? "-"}`,
  );

  if (apply) {
    await planRepo.update(
      { id: plan.id },
      {
        currentStreak: stats.currentStreak,
        consecutiveSilenceDays: stats.consecutiveSilenceDays,
        lastSilenceCheckDate: stats.lastSilenceCheckDate,
      },
    );
  }
}

console.log(`${changed} plan(s) ${apply ? "updated" : "would change"}`);

await AppDataSource.destroy();
