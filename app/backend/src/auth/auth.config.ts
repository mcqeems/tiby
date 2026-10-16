import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins/username";
import { admin } from "better-auth/plugins/admin";
import pg from "pg";
import { ac, NAKES, PMO, PASIEN } from "./permissions.js";

const { Pool } = pg;

export const auth = betterAuth({
  database: new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://postgres:password_rahasia@localhost:5432/tiby",
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  basePath: "/api/auth",
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "rahasia_super_aman_tiby_development_secret_32_bytes_min",
  user: {
    modelName: "users",
    additionalFields: {
      role: { type: "string", defaultValue: "PASIEN" },
      facility_id: { type: "string", required: false },
      full_name_encrypted: { type: "string", required: false },
      whatsapp_encrypted: { type: "string", required: false },
      whatsapp_hash: { type: "string", required: false },
      whatsapp_verified: { type: "boolean", defaultValue: false },
      whatsapp_chat_id: { type: "string", required: false },
      whatsapp_verified_at: { type: "date", required: false },
      must_confirm_consent: { type: "boolean", defaultValue: true },
    },
  },
  advanced: {
    database: {
      joins: true,
    },
  },
  plugins: [
    username({
      immutableUsername: true,
      displayUsername: false,
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
    admin({
      ac,
      roles: { NAKES, PMO, PASIEN },
      defaultRole: "PASIEN",
    }),
  ],
});

export type Auth = typeof auth;
