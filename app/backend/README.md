# Tiby Backend

NestJS API for Tiby. It owns auth, the database, push and WhatsApp delivery, and the safety rules. The AI service only extracts facts. The frontend never
talks to the database.

Tech stack: NestJS 12, TypeORM, PostgreSQL, Better Auth, Zod (through `shared/ts-shared`).

## Run locally

Install once at the repo root, then from the root:

```sh
bun install
bun run dev:backend   # http://localhost:3001
bun run seed          # dev users: admin, nakes, pasien, pmo
```

The server listens on `PORT` (default `3001`) and mounts every route under `/api`. Health is `GET /api`.

Required configuration lives in `app/backend/.env` (copy `.env.example`). The ones that matter most:

- `DATABASE_URL` — Postgres connection string.
- `BETTER_AUTH_SECRET` — at least 32 characters. Auth breaks without it.
- `BETTER_AUTH_URL` — the public URL of this service.
- `AI_SERVICE_URL` — base URL of the AI service (default `http://localhost:8000`).
- `PII_ENCRYPTION_KEY` — 32-byte hex key. Patient identity fields encrypt with it; losing it locks the data.
- `WEB_URL` — comma-separated browser origins allowed in production CORS.
- `WAHA_*`, `S3_*`, `VAPID_*` — only needed when you use WhatsApp, uploads, or push.

## Deploy

1. Set `NODE_ENV=production` and provide `DATABASE_URL` plus the configuration above. There is no `.env` file on the server. Inject the values through the
platform environment.
2. Build and start from the repo root:

```sh
bun run build:shared   # contracts first (see Gotchas)
bun run build:backend  # compiles dist/
bun --filter @tiby/backend start:prod   # runs node dist/main
```

3. Point the frontend at this service with `NEXT_PUBLIC_API_URL`.

In production the schema does not sync, and there are no migration files. Boot once in dev to create the tables (`synchronize: true` only outside
production). Deploy against that database. Expired demo rows delete through the built-in cron, which runs every minute.

## Test

```sh
bun run test:backend         # unit (vitest, needs nothing)
bun --filter @tiby/backend test:e2e test/<name>.e2e-spec.ts   # needs live Postgres at DATABASE_URL
```

One e2e test needs the AI service. The OCR draft test fails when the provider is unreachable. That failure is expected without keys.

## Gotchas

- Always build `shared/ts-shared` first. `bun run build:shared` runs before `build` and `start`, but not before `test`. Stale schemas make tests pass
against old shapes.
- Relative imports end in `.js` inside `src/` and `test/` (`./x.js`). The build is native ESM and `tsc` fails without the extension. Imports of workspace
packages (`@tiby/ts-shared`) need no extension.
- Never write a migration file. Entities apply on boot outside production. Register each new entity in `src/database/entities.ts`. TypeORM ignores files
missing there.
- Never edit `shared/api-contract/`. It is the API source of truth. Match the backend to it, not the other way around.
- Every route starts with `/api`. Never add a version prefix.
- Query with the Repository API. Use `createQueryBuilder` only for `EXISTS`, joins with aggregates, or window functions, and say why in a comment.
- `uuid` columns and `OR` queries do not mix. A non-uuid value in an `OR` against a `uuid` column throws a 500. Run two lookups instead.
