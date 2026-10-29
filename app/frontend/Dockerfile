# Tiby frontend (Next.js) — build context is the REPO ROOT (Bun monorepo),
# so compose must use `context: .` with `dockerfile: app/frontend/Dockerfile`.
FROM node:22-slim AS build
RUN npm install -g bun@1.4.2
WORKDIR /app

# Install layer: manifests first so dependency installs are cached.
COPY package.json bun.lock ./
COPY app/backend/package.json app/backend/package.json
COPY app/frontend/package.json app/frontend/package.json
COPY shared/ts-shared/package.json shared/ts-shared/package.json
RUN bun install --frozen-lockfile

COPY . .
# NEXT_PUBLIC_* is baked into the browser bundle at build time: this must be
# the URL the *browser* uses to reach the backend (host port), not the
# internal compose service name.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Unlike build:backend, the build:frontend script does NOT build the shared
# contracts first — and @tiby/ts-shared resolves through ./dist — so build
# the shared package explicitly before `next build`.
RUN bun run build:shared && bun run build:frontend

FROM node:22-slim AS run
RUN npm install -g bun@1.4.2
WORKDIR /app
COPY --from=build /app /app
WORKDIR /app/app/frontend
EXPOSE 3000
CMD ["bun", "run", "start"]
