# syntax=docker/dockerfile:1
# API image. Build from the repo root: docker build -f apps/api/Dockerfile .
# Targets: dev (hot reload, used by compose.yaml) and prod (the default).

# =============================================================================
# Tooling: Node and pnpm, shared by every build stage
# =============================================================================
FROM node:24-trixie-slim@sha256:54f84b4cf8432b21aaffd5d3ce8d41e12cea0d10d33c09d2f3c9879d49d6b446 AS node

# Only the packageManager field reaches the next stage, so other package.json edits keep pnpm's layer cached.
FROM node AS pnpm-version
RUN --mount=type=bind,source=package.json,target=/package.json \
    node -p "require('/package.json').packageManager" > /pnpm-version

FROM node AS tooling
COPY --from=pnpm-version /pnpm-version /tmp/pnpm-version
RUN npm install --global "$(cat /tmp/pnpm-version)" \
    && mkdir /app /pnpm \
    && chown node:node /app /pnpm
ENV NX_DAEMON=false \
    NX_NO_CLOUD=true
WORKDIR /app
USER node

# =============================================================================
# Deps: every package in the lockfile, keyed on the lockfile only
# =============================================================================
# Bind mounts, not COPY: only these two files' contents key the layer. The store stays in
# the layer (not a cache mount), so CI's layer cache reuses it too.
FROM tooling AS deps
RUN --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    pnpm fetch --store-dir /pnpm/store

# =============================================================================
# Builder: production bundle plus a standalone folder of production dependencies
# =============================================================================
# Tests, lint and test configs are left out, so changing them doesn't rebuild production.
FROM deps AS builder
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json tsconfig.json ./
COPY --chown=node:node \
    --exclude=**/*.spec.ts --exclude=**/*.spec.tsx --exclude=**/test-setup.* \
    --exclude=**/vitest.config.* --exclude=**/eslint.config.* \
    apps apps
COPY --chown=node:node \
    --exclude=**/*.spec.ts --exclude=**/*.spec.tsx --exclude=**/test-setup.* \
    --exclude=**/vitest.config.* --exclude=**/eslint.config.* \
    libs libs
RUN pnpm install --frozen-lockfile --offline --store-dir /pnpm/store
# deploy re-resolves metadata, so it may go online for what the store lacks.
RUN pnpm nx build api --configuration=production \
    && pnpm --filter @ratewatch/api deploy --prod --prefer-offline --store-dir /pnpm/store /tmp/deploy

# =============================================================================
# Runtime base: clean image, non-root user, production environment
# =============================================================================
FROM node AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
USER node
EXPOSE 3000

# =============================================================================
# Dev image: full source and dev dependencies, restarts on change
# =============================================================================
# Compose Watch syncs source edits into this image; a lockfile change rebuilds it.
FROM deps AS dev
COPY --chown=node:node . .
RUN pnpm install --frozen-lockfile --offline --store-dir /pnpm/store
# The daemon watches files, so the API restarts when Compose Watch syncs a change in.
ENV NX_DAEMON=true
EXPOSE 3000
CMD ["pnpm", "nx", "serve", "api"]

# =============================================================================
# Prod image: the bundle and production dependencies only (no sources, tests or source maps)
# =============================================================================
FROM runtime AS prod
COPY --from=builder /tmp/deploy/package.json ./
COPY --from=builder /tmp/deploy/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist/main.js ./
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://localhost:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "main.js"]

# =============================================================================
# Final target: a build without --target produces the production image
# =============================================================================
FROM prod
