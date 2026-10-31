---
area: infrastructure
issue: https://github.com/nitzanto/ratewatch/issues/13
status: accepted
---

# Docker Compose as the local environment

`docker compose up --watch` is the default way to run ratewatch locally; native pnpm stays for tests, linting and mock mode. Each app's Dockerfile (`apps/<app>/Dockerfile`, built from the repo root) has these stages: `deps` runs `pnpm fetch` with the lockfile and workspace file bind-mounted, so only the lockfile keys the layer; `dev` adds the full source and runs `nx serve`; `builder` copies only build inputs; `prod` is a clean runtime with the build output only, and is the last stage so a plain `docker build` gives it. The API's standalone output comes from `pnpm deploy --prod`, not Nx's `prune` target, because pnpm 12 rejects the lockfile `prune` generates. Hot reload uses Compose Watch `sync`, not source bind mounts, so it works the same on Docker Desktop, Colima, OrbStack and Linux; `node_modules` lives only in the container.

## Considered Options

- **Dev Container**: the same no-install goal, but tied to editors that support the spec, and pnpm's hard links need the store and `node_modules` on one filesystem, which named volumes complicate.
- **Native only**: no Docker needed, but every developer installs and matches Node and pnpm, and nothing checks the production images locally.
- **Source bind mounts with polling watchers**: no image rebuild for dependency changes, but file events through the VM differ per engine (Colima misses some), polling costs CPU, and host `node_modules` would hold the wrong platform's binaries.
- **A BuildKit cache mount for the pnpm store**: faster local rebuilds, but CI runners start empty; keeping the store in the `deps` layer lets CI's layer cache reuse it.

## Consequences

- `apps/e2e` stays in the build context: the root tsconfig references it, and Nx refuses to run on a workspace out of sync. It reaches the builder stage, never a production image.
- The dev images set `NX_DAEMON=true`; without the daemon, `nx serve api` doesn't restart on changes.
- `libs/contracts` declares `files` (its `dist`, minus `*.tsbuildinfo`), so `pnpm deploy` copies only its build into the API image.
- `pnpm deploy` re-resolves package metadata, so the builder may reach the registry (`--prefer-offline`), unlike the `--offline` installs.
- pnpm comes from `npm install --global <packageManager>`, not corepack, which Node removes after 24.
- The builder excludes specs, test setup and Vitest and ESLint configs (`COPY --exclude`), but copies every app: the workspace and lockfile need all of them.
- Vite's host and `/api` proxy target read `WEB_HOST` and `API_URL` (defaults in the root `.env`, ADR-0015), so compose can point them at the `api` service.
- The dev services set `pull_policy: build`, so every `up` rebuilds (from cache) and a container can't keep serving a branch checked out while Watch wasn't running. Compose has no setting to make `--watch` the default; the command keeps the flag.
- Base images are pinned by digest; bump them deliberately. Both are multi-arch (amd64 and arm64).
- The Dockerfiles need BuildKit (bind mounts, `COPY --exclude`), so the engine needs the Buildx plugin as well as Compose 2.24.4+. Nothing else is engine-specific.
