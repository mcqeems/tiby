# Tiby (Read this first dev!!!)

> [!IMPORTANT]
> First of all this is not an **AI Slop** documentation, i wrote this by my own hand so please **READ** it first!!!.

Bun monorepo — one repo, three independently deployable services. Shared code is contracts only (`shared/`), never business logic.

```
tiby/
  app/frontend/        # Next.js — bun run dev:frontend
  app/backend/         # NestJS — bun run dev:backend
  app/ai-service/      # FastAPI (Python, separate env — no root scripts)
  shared/
    ts-shared/         # zod schemas + types + error codes (FE+BE)
    api-contract/      # source of truth, including AI
```

## Setup (manual, per role)

```sh
bun install          # once, at root

bun run dev:frontend # Next.js
bun run dev:backend  # NestJS (PORT=3001)
bun run dev          # both
```

AI service: `cd app/ai-service`, follow its README (own venv + provider API tokens).
