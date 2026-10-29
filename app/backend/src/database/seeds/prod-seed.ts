/**
 * Production seed: creates exactly one ADMIN account.
 *
 * Upsert-safe: if a user with SEED_ADMIN_EMAIL or SEED_ADMIN_USERNAME
 * already exists, nothing is changed (the existing password is never
 * overwritten) and the script exits 0.
 *
 * Placement: runs at the start of deployment as the one-shot compose
 * service `seed-admin`, after `auth-migrate` has created the auth tables.
 * Manual run: SEED_ADMIN_PASSWORD=... bun run src/database/seeds/prod-seed.ts
 *
 * If SEED_ADMIN_PASSWORD is unset, still a placeholder, or shorter than
 * 12 characters, the seed skips itself with a warning instead of creating
 * an admin with a weak or well-known password.
 */
import pg from "pg";
import { auth } from "../../auth/auth.config.js";

const { Pool } = pg;

const PLACEHOLDER_PASSWORDS = new Set(["", "CHANGE_ME", "CHANGE_ME_MIN_12_CHARS"]);

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@tiby.internal").toLowerCase();
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator Tiby";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";

  if (PLACEHOLDER_PASSWORDS.has(password) || password.length < 12) {
    console.warn(
      "[prod-seed] SEED_ADMIN_PASSWORD is unset, a placeholder, or shorter than 12 characters. Skipping admin creation.",
    );
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const existing = await pool.query(
      "SELECT id, email, username FROM users WHERE email = $1 OR username = $2 LIMIT 1",
      [email, username],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      const row = existing.rows[0] as { email: string; username: string };
      console.log(
        `[prod-seed] Admin already exists (${row.email} / ${row.username}). Skipping, nothing changed.`,
      );
      return;
    }

    const res = await auth.api.createUser({
      body: {
        name,
        email,
        password,
        role: "ADMIN",
        data: {
          username,
          displayUsername: username,
          role: "ADMIN",
          facility_id: null,
          must_confirm_consent: false,
        },
      },
    });
    console.log(
      `[prod-seed] Admin created: ${res.user.email} (username: ${username}, role: ADMIN).`,
    );
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[prod-seed] Failed:", err);
    process.exit(1);
  });
