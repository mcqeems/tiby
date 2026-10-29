import { betterAuth, type User } from "better-auth";
import { username } from "better-auth/plugins/username";
import { admin } from "better-auth/plugins/admin";
import { createAuthEndpoint, APIError } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import pg from "pg";
import { ac, ADMIN, NAKES, PMO, PASIEN } from "./permissions.js";

const { Pool } = pg;

export const auth = betterAuth({
  database: new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://postgres:password_rahasia@localhost:5432/tiby",
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  basePath: "/api/auth",
  // Accounts are created by Nakes/Admin (onboarding or /api/users), never by
  // public self-registration.
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "rahasia_super_aman_tiby_development_secret_32_bytes_min",
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.BETTER_AUTH_URL,
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[],
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
      demo_session_id: { type: "string", required: false },
    },
  },
  advanced: {
    database: {
      joins: true,
    },
    // Disabled in dev & test for Bruno/Postman/curl; enforced in production for browser CSRF protection
    disableCSRFCheck: process.env.NODE_ENV !== "production",
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
      roles: { ADMIN, NAKES, PMO, PASIEN },
      defaultRole: "PASIEN",
    }),
    {
      id: "unified-sign-in",
      endpoints: {
        signIn: createAuthEndpoint("/sign-in", {
          method: "POST",
          body: z.object({
            identifier: z.string().optional(),
            username: z.string().optional(),
            email: z.string().optional(),
            password: z.string(),
            rememberMe: z.boolean().optional(),
            callbackURL: z.string().optional(),
          }),
        }, async (ctx) => {
          const identifier = ctx.body.identifier ?? ctx.body.username ?? ctx.body.email;
          if (!identifier || !ctx.body.password) {
            throw new APIError("BAD_REQUEST", { message: "Identifier and password are required" });
          }

          let user = (await ctx.context.adapter.findOne({
            model: "user",
            where: [{ field: "username", value: identifier }],
          })) as User | null;

          if (!user) {
            user = (await ctx.context.adapter.findOne({
              model: "user",
              where: [{ field: "email", value: identifier.toLowerCase() }],
            })) as User | null;
          }

          if (!user) {
            // Mitigate timing attacks with a dummy hash
            await ctx.context.password.hash(ctx.body.password);
            throw new APIError("UNAUTHORIZED", { message: "Invalid username/email or password" });
          }

          const account = await ctx.context.internalAdapter.findCredentialAccount(user.id);
          if (!account || !account.password) {
            throw new APIError("UNAUTHORIZED", { message: "Invalid username/email or password" });
          }

          const isValid = await ctx.context.password.verify({
            hash: account.password,
            password: ctx.body.password,
          });

          if (!isValid) {
            throw new APIError("UNAUTHORIZED", { message: "Invalid username/email or password" });
          }

          const session = await ctx.context.internalAdapter.createSession(
            user.id,
            ctx.body.rememberMe === false,
          );

          await setSessionCookie(ctx, { session, user }, ctx.body.rememberMe === false);

          return ctx.json({
            token: session.token,
            user,
          });
        }),
      },
    },
  ],
});

export type Auth = typeof auth;

