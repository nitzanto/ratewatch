# ratewatch

A distributed per-user rate limiter (NestJS + Redis) with a real-time admin dashboard.

📖 Docs: https://nitzanto.github.io/ratewatch/

## Overview

Every API instance limits `POST /clicks` per user against one shared Redis:

- **Hourly window**: an hour from the user's first request, checked and counted by one atomic Lua script, so two instances can't both hand out the last request.
- **Burst limit**: a token bucket on top of the window smooths spikes.
- **Fails open**: if Redis is down, requests go through rather than the whole API failing.
- **Admin dashboard**: live per-user status over Socket.IO, with search, filters, and controls to pause a user, reset them, set a custom limit or grant extra requests.

| Layer        | Stack                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| API          | NestJS 11, Zod (`nestjs-zod`), ioredis, Socket.IO with the Redis adapter               |
| Store        | Redis 8: Lua scripts for the limiter, the query engine for the dashboard's users table |
| Dashboard    | React 19, MUI, TanStack Query and Table, React Router, MSW for mock mode               |
| Tests        | Vitest, Testcontainers (real Redis), Playwright e2e, Artillery load tests              |
| Tooling      | Nx monorepo, pnpm, TypeScript, ESLint, Prettier, Conventional Commits                  |
| Run and ship | Docker Compose, Nginx (one origin in production), GitHub Actions                       |
| Docs         | Astro Starlight wiki with ADRs for every significant decision                          |

## Run it

| What        | Where                            |
| ----------- | -------------------------------- |
| Dashboard   | http://localhost:4200            |
| API         | http://localhost:3000/api        |
| Docs (wiki) | http://localhost:4321/ratewatch/ |

### Option 1: everything in Docker Compose

Needs Docker with Compose 2.24.4+ and Buildx.

```sh
docker compose up --watch     # API + dashboard + Redis, with hot reload
pnpm nx dev docs              # optional: the docs (needs the native setup below)
```

Stop with `Ctrl+C`, then `docker compose down`.

### Option 2: run the apps natively, with only Redis in Docker

Needs [fnm](https://github.com/Schniz/fnm) and pnpm.

```sh
fnm use && pnpm install
docker compose up -d redis              # only Redis
pnpm nx run-many -t serve -p api web    # API + dashboard
pnpm nx dev docs                        # optional: the docs
```

## Commands

| Command                                             | What it does                            |
| --------------------------------------------------- | --------------------------------------- |
| `pnpm nx serve api` / `pnpm nx serve web`           | Start the API / the dashboard           |
| `pnpm nx serve web -c mock`                         | Dashboard in mock mode                  |
| `pnpm nx dev docs`                                  | The docs site                           |
| `pnpm nx simulate traffic`                          | Fill the dashboard with simulated users |
| `pnpm nx load traffic`                              | Load test (app must be running)         |
| `pnpm nx run-many -t test`                          | Unit and component tests                |
| `pnpm nx e2e ratewatch-e2e`                         | End-to-end tests (Playwright)           |
| `pnpm nx affected -t lint typecheck test build e2e` | What CI runs                            |
| `pnpm nx format:write`                              | Fix formatting                          |

Production-like stack on one origin (http://localhost:8080):

```sh
SESSION_SECRET=$(openssl rand -hex 32) REDIS_PASSWORD=$(openssl rand -hex 32) \
  docker compose -f compose.yaml -f compose.prod.yaml up --build
```

Full details: [Running locally](https://nitzanto.github.io/ratewatch/guides/running-locally/).
