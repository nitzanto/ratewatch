# syntax=docker/dockerfile:1
# Web image. Build from the repo root: docker build -f apps/web/Dockerfile .
# Targets: dev (Vite with hot reload, used by compose.yaml) and prod (the default).

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
# Builder: hashed static files
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
RUN pnpm nx build web --configuration=production

# =============================================================================
# Runtime base: clean nginx image, non-root user (101), runtime environment
# =============================================================================
# Static files need no Node runtime: nginx serves them and proxies the API on the same origin.
FROM nginxinc/nginx-unprivileged:stable-trixie@sha256:ec0f7ecb1fbd84959ac114e65fb36074ffc97d4d51db0f18ee925162d889dcef AS runtime
# The template is rendered into /etc/nginx/conf.d at start, so the API's address is runtime config.
ENV API_URL=http://api:3000
COPY apps/web/nginx/default.conf.template /etc/nginx/templates/
EXPOSE 8080

# =============================================================================
# Dev image: Vite dev server with hot module replacement
# =============================================================================
# Compose Watch syncs source edits into this image; a lockfile change rebuilds it.
FROM deps AS dev
COPY --chown=node:node . .
RUN pnpm install --frozen-lockfile --offline --store-dir /pnpm/store
ENV WEB_HOST=0.0.0.0
EXPOSE 4200
CMD ["pnpm", "nx", "serve", "web"]

# =============================================================================
# Prod image: the built static files only
# =============================================================================
FROM runtime AS prod
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# =============================================================================
# Final target: a build without --target produces the production image
# =============================================================================
FROM prod
