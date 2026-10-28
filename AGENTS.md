# AGENTS.md — Tiby monorepo

Tuberculosis adherence companion (Indonesian DOTS/Kemenkes protocols). Bun monorepo, three independently deployable services.

| Path | Stack | Entrypoint | Run |
|---|---|---|---|
| `app/frontend/` | Next.js 16 (App Router, Turbopack) | `app/layout.tsx` | `bun run dev:frontend` (:3000) |
| `app/backend/` | NestJS 12, native ESM, TypeORM | `src/main.ts` | `bun run dev:backend` (:3001) |
| `app/ai-service/` | FastAPI (Python 3.10, uv) | `src/main.py` | see `app/ai-service/README.md` — **no root scripts** |
| `shared/ts-shared/` | Zod 4 schemas + types only | `src/index.ts` | `bun run build:shared` |
| `shared/api-contract/` | Bruno OpenCollection (**`.yml`**) | — | open in Bruno |

`app/ai-service/` has its own Python env; nothing at the root drives it. The AI service never diagnoses or scores risk — deterministic safety rules live in the backend.

## Build order gotcha

`@tiby/ts-shared` compiles to `dist/` and both apps import from there. Backend `build`/`start`/`start:dev` have a `prebuild`/`prestart` hook, but **`test` does not**. After changing anything in `shared/ts-shared/src/`, run:

```bash
bun run build:shared
```

before `bun run test` / `bun run test:e2e`, or tests silently run against stale schemas. Frontend dev/build reads the same `dist/`.

## Commands

```bash
bun install                 # once, at root

bun run dev                 # backend + frontend together
bun run dev:backend         # :3001, rebuilds shared first
bun run dev:frontend        # :3000

bun run lint                # backend (oxlint) + frontend (eslint)
bun run lint:backend
bun run build               # shared -> backend + frontend
bun run test                # unit (vitest)
bun run test:e2e            # needs live PostgreSQL
bun run seed                # dev fixtures

# single file / single test
bun --filter @tiby/backend test test/patients.service.spec.ts
bun --filter @tiby/backend test test/patients.service.spec.ts -t "createPmoFollowUp"
```

There is no `typecheck` script; `bun run build` is the typecheck (`tsc` / `nest build`).

Test coverage is backend-only. The frontend has no test runner or test script, and root `bun run test` does not touch `shared/ts-shared` (it has its own `bun --filter @tiby/ts-shared test`).

## Database

- **No migrations.** Schema comes from `synchronize: true` whenever `NODE_ENV !== "production"` (`app.module.ts`, `database/data-source.ts`). Entity edits apply on next boot — there is no migration file to write.
- Every new entity must be registered in `app/backend/src/database/entities.ts`; TypeORM won't see it otherwise.
- `test:e2e` and `test/entities.spec.ts` require a real PostgreSQL reachable at `DATABASE_URL` (from `app/backend/.env`). Unit tests (`*.service.spec.ts`) are pure mocks and need nothing.
- `app/backend/.env` is resolved from the **cwd** (`ConfigModule.forRoot()` sets no `envFilePath`). `bun --filter @tiby/backend …` already runs with cwd=`app/backend`, so root scripts are fine; a bare `bunx vitest` from elsewhere silently falls back to the hardcoded defaults in `auth.config.ts` / `data-source.ts`.
- E2E specs create their own `facility`/users with `Date.now()` suffixes and clean up; they run serially (`fileParallelism: false`).
- `src/database/transformers/encrypted-column.transformer.ts` transparently AES-256-GCM encrypts PII columns. Never read the raw column name in business logic — use the entity property.

## Backend conventions

- **Every relative import ends in `.js`** (`moduleResolution: nodenext` + `"type": "module"`). Applies to `src/` and `test/`.
- All routes mount under `/api` (`setGlobalPrefix("api")`); Better Auth owns `/api/auth`. Never add a version prefix.
- Validation and serialization use Zod via NestJS Standard Schema: `@Query({ schema: XSchema })`, `@Body({ schema: XSchema })`, `@SerializeOptions({ schema: XSchema })`. Add new schemas to `shared/ts-shared`, not inline.
- Module layout mirrors `shared/api-contract/Backend/` — one `modules/<domain>/` folder per contract domain (kebab-case: `Check Ins` → `check-ins`, `Push Notifications` → `push`), each with `controllers/ services/ entities/`. Exceptions: `Auth` lives in `src/auth/` (Better Auth owns it), and background engines with no HTTP surface live in `modules/internal/`. `Facility` is a shared entity at `src/entities/facility.entity.ts`, not a module.
- Module files are flat (`alerts/alerts.module.ts`), not under a subfolder.
- Health is `GET /api` (`AppController`), not `/api/health` — the contract file `Backend/Health (api-).yml` is stale on this one point. Don't add a second health route.

## TypeORM: Repository API first

Use the Repository API by default. `createQueryBuilder` only when the Repository API genuinely cannot express the query.

| Need | Use |
|---|---|
| Filter / join / order / paginate | `find`, `findAndCount` with `where`, `relations`, `order`, `skip`, `take` |
| Single row by criteria | `findOneBy` (or `findOne` when you need `relations`) |
| OR across criteria | `where: [{ a: 1 }, { b: 2 }]` |
| Null check | `IsNull()` |
| Bulk write | `update(criteria, patch)`, `delete(criteria)`, `upsert(rows, keys)` |

- **`createQueryBuilder` is justified only for:** `EXISTS` / correlated subqueries, aggregates over joins, `DISTINCT ON`, window functions, or raw SQL fragments. Leave a comment on that line saying why.
- **Never N+1.** Querying inside `.map`/`for` is a bug: collect ids and batch with `In(ids)` first. `silence-detector` and `patients.listPatients` both show the pattern.
- **OR-arrays and `uuid` columns don't mix.** `where: [{ patientUserId: x }, { id: x }]` makes Postgres cast `x` to uuid; a non-uuid id throws a 500. Use two sequential lookups when one branch targets a `uuid` column and the value may not be a uuid.
- `dataSource.query()` is only for health probes (`app.service.ts`).

## Frontend conventions

- `next dev` rewrites `app/frontend/AGENTS.md` and regenerates agent docs. Uncommitted churn there is expected — commit it, don't fight it.
- `cacheComponents` and `partialPrefetching` are enabled. Route-local UI lives in `app/<role>/components/`; only `pasien/check-in` has extracted state into `lib/use-check-in.ts` so far, so follow whatever the route you're touching already does.
- No component library: `lucide-react` for icons, `lottie-web` (dynamic import) for the mascot. Both are real dependencies — don't assume they're missing.
- **One API client per domain.** `lib/api/<domain>.ts` holds the fetchers (`check-in.ts` -> `checkInsApi`, `pmo.ts` -> `pmoApi`, ...) and every import goes through the full path, e.g. `@/lib/api/pmo`. There is no `lib/api.ts` and no `lib/api/index.ts` barrel - don't add either. Response and payload types live in the matching `lib/types/<domain>.ts`; the shared fetch wrapper and `ApiError` live in `lib/api/client.ts`.
- **Motion has one source of truth.** `lib/motion.ts` exports the easing curves, duration tokens, every enter/exit variant (`overlay`, `popIn`, `popover`, `fadeUp`, `fadeDown`, `scaleIn`, `slideIn`, `banner`, `listItem`, `popItem`, `revealItem`, `shake`), `staggerParent()` and `VIEWPORT`. Anything that appears or disappears on a state change goes through `AnimatePresence` with those variants; lists stagger with `staggerChildren`, never with `delay: i * n`. Modal shells are `components/ui/dialog.tsx` or `components/ui/modal-frame.tsx` (`ModalFrame` when the component owns `open`, `ModalOverlay`/`ModalCard` when the parent owns presence). A genuinely one-off animation may keep local config - say so in a comment.
- Auth on the client is `lib/auth-client.ts` (Better Auth), not fetch wrappers.

## Invariants (do not break)

1. **`shared/ts-shared` is contracts only** — Zod schemas, inferred types, error enums. No NestJS, no TypeORM, no Better Auth, no business logic.
2. **`shared/api-contract/` is human-owned.** Never generate, overwrite, or edit those `.yml` files; treat them as the API source of truth and match the backend to them.
3. **Zero-stigma copy.** Outbound push and WhatsApp messages must never contain "TBC" or "Tuberkulosis". `PushService` strips them defensively; keep that guard.
4. **PMO transcript blindness.** `/api/pmo/patients` must never leak transcripts or symptom detail — enforced with `@SerializeOptions({ schema: PmoPatientStatusItemSchema })` and a bare-array response.
5. **Consent gate.** Clinical routes for `PASIEN` pass through `ConsentGuard`; `must_confirm_consent` blocks them.
6. **Backend scope by default.** Work in `app/backend/`, `shared/ts-shared/`, and root scripts unless the user explicitly asks for frontend work. Never edit `app/frontend/**` on your own initiative. If a backend change breaks the frontend (a response shape change, a removed route, a renamed field), stop and report the affected files instead of fixing them.

## Reference docs

- `app/backend/ref/` — ADRs (`adr_001..006`, source of the `DEC-xx` ids used in code comments), `backend_sdd_spec.md`, `glossary.md`, `context.md`. **Gitignored**, so it may not exist in a fresh clone; don't try to commit it.
- `app/backend/AGENTS.md` — deeper backend detail (domain rules, dose-lock, silence recovery).
- `app/frontend/AGENTS.md` — Next.js 16 notes; auto-regenerated by `next dev`.
- `app/ai-service/README.md` — Python env, `uv run pytest`, live-provider test scripts.
- `README.md` — setup per role.
