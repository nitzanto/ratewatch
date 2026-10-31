---
title: Runtime configuration
description: Every deploy-specific setting is an environment variable, validated by the API at startup.
sidebar:
  order: 18
---

**Status:** Accepted · **Issue:** [#24](https://github.com/nitzanto/ratewatch/issues/24)

Ports, URLs and secrets differ between a laptop, CI, staging and production, while the code and images must not. **Every setting that varies between deploys is an environment variable.** The API checks its variables against a schema when it starts and refuses to run if any is missing or invalid. For local work, committed `.env` files hold safe defaults.

**Options considered**

- **Environment variables, validated at startup** (chosen): the approach [Twelve-Factor](https://12factor.net/config) recommends, and what NestJS, Nx, Docker Compose and Kubernetes all support directly.
- **JSON config files per environment** (`config/development.json`, `config/production.json`): fine for large, structured settings, but every new deploy needs a new named file, and secrets in files are easy to commit by mistake. Our config is a handful of flat values.
- **The schema in the shared contracts library**: contracts hold the shapes the API and dashboard exchange; these variables belong to the API only.

**Why:** one image is built once and promoted unchanged, with each environment injecting its own values. A typo or a missing secret stops the API at startup with the variable's name, instead of failing later on the first request that needs it.

**Trade-offs we accept:** env vars are flat strings, so anything structured must be encoded (a URL rather than host, port and password separately). The committed defaults must never be secret; the development session secret is marked as such and refused in production.

**The variables:**

| Variable         | Read by                 | Local default (committed)         | Rules                                                                                                         |
| ---------------- | ----------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `PORT`           | API                     | `3000`                            | A port number                                                                                                 |
| `SESSION_SECRET` | API                     | A value starting with `dev-only-` | At least 32 characters; a `dev-only-` value is refused in production                                          |
| `REDIS_URL`      | API                     | `redis://localhost:6379`          | A `redis://` or `rediss://` URL                                                                               |
| `NODE_ENV`       | API                     | Unset, which means `development`  | `development`, `test` or `production`; the production image sets it                                           |
| `API_URL`        | Vite, nginx, Playwright | `http://localhost:3000`           | Where the `/api` proxy and the tests reach the API; the production web image defaults it to `http://api:3000` |
| `WEB_HOST`       | Vite, Playwright        | `localhost`                       | The dev container sets `0.0.0.0`                                                                              |
| `WEB_PORT`       | Vite, Playwright        | `4200`                            |                                                                                                               |

The dashboard itself has no runtime config: it calls `/api` on its own origin (see [Same origin through nginx](../same-origin/)).

**Revisit when:** the config grows structured enough (per-tier limit tables, feature flags) that a mounted file beats encoding it into variables.

**In the code:** the schema is `apps/api/src/app/env.ts`, loaded by `ConfigModule` in `app.module.ts`. Defaults are in `.env` (shared) and `apps/api/.env` (API only); Nx loads both for every task. Override any value in a git-ignored `.env.local`, or in your shell. How to run with them is in [Running locally](../../guides/running-locally/#configuration).
