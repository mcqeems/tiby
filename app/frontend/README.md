# Tiby Frontend

Next.js app for Tiby. Patients check in, PMOs monitor, nakes triage, admins manage. It renders UI and calls the backend. It never talks to the database or
the AI service.

Tech stack: Next.js 16 (App Router), React 19, Tailwind 4, Better Auth client.

## Run locally

Install once at the repo root, then from the root:

```sh
bun install
bun run dev:frontend   # http://localhost:3000
```

The app needs one setting: `NEXT_PUBLIC_API_URL` in `app/frontend/.env`, the base URL of the backend (default `http://localhost:3001`).

The backend must run or every page that fetches data fails. Start it with `bun run dev:backend` from the root.

## Deploy

1. Set `NEXT_PUBLIC_API_URL` to the public backend URL at build time. Next.js bakes this value into the bundle, so changing it later needs a rebuild.
2. Build and start from the repo root:

```sh
bun run build:shared    # contracts first (see Gotchas)
bun run build:frontend  # next build
cd app/frontend && bun start   # serves on :3000
```

No server env file is needed beyond the public URL. Auth cookies come from the backend session, not from this app.

## Test

```sh
bun run test:frontend   # unit (vitest)
```

Tests cover helpers, API clients, and repo invariants in `app/frontend/test/`. Component behavior is checked in the browser, not with a DOM runner.

## Gotchas

- Always build `shared/ts-shared` first: `bun run build:shared`. The frontend reads the compiled `dist/`, so new schemas stay invisible until you rebuild.
- One API client per domain: `lib/api/<domain>.ts` holds the fetchers, `lib/types/<domain>.ts` holds the shapes. Never add `lib/api.ts` or a barrel file.
- Only use request payloads and response shapes from `shared/ts-shared`. Never inline or duplicate types.
- Auth calls live in `lib/auth-client.ts` (Better Auth).
- Dark mode works through palette variables in `globals.css`, so the same classes re-theme. Do not delete the leftover `.dark` rules. They cover cases a
variable cannot express.
- Relative imports end in `.js` inside `app/` and `lib/` (`./x.js`). The build is native ESM and fails without the extension. Imports of workspace
packages (`@tiby/ts-shared`) need no extension.
- Never edit `shared/api-contract/`. It is the API source of truth. Match the UI to it, not the other way around.
