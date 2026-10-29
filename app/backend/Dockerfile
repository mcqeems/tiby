# Tiby backend (NestJS) — build context is the REPO ROOT (Bun monorepo),
# so compose must use `context: .` with `dockerfile: app/backend/Dockerfile`.
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
# Builds @tiby/ts-shared first, then `nest build` -> app/backend/dist
RUN bun run build:backend

FROM node:22-slim AS run
RUN npm install -g bun@1.4.2
WORKDIR /app
COPY --from=build /app /app
WORKDIR /app/app/backend
EXPOSE 3001
CMD ["node", "dist/main"]
