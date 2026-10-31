---
title: Running ratewatch locally
description: Run the product with Docker Compose, or natively with pnpm, and run every kind of test.
---

There are two ways to run ratewatch. **Docker Compose** needs nothing but Docker and behaves the same on every machine; it's the default. **Native** runs the apps straight on your machine with Node and pnpm, which you need anyway for tests, linting and mock mode.

## With Docker Compose

Any Docker engine works (Docker Desktop, OrbStack, Colima, Rancher Desktop with dockerd, Docker Engine on Linux), as long as it has the Compose (2.24.4 or newer) and Buildx plugins. Docker Desktop and OrbStack include both; with Colima or a plain Linux engine, install them too (for example `brew install docker-compose docker-buildx`).

```sh
docker compose up --watch
```

| What          | Where                     |
| ------------- | ------------------------- |
| The dashboard | http://localhost:4200     |
| The API       | http://localhost:3000/api |

The first run builds the images and takes a few minutes; later runs reuse them.

**Hot reload.** Compose Watch copies every edit into the running containers: a dashboard change hot-reloads in the browser, an API change restarts the API, and a contract change does both. Any other change to an app, the contracts, or a root workspace file (the lockfile, a `package.json`, a `tsconfig`, `nx.json`) rebuilds the affected image instead.

Watch copies files rather than sharing a folder with the container, so it works the same on every Docker engine, and `node_modules` only ever exists inside the containers, built for Linux. A dependency you add on your machine reaches the container through the lockfile, which triggers a rebuild.

**Production-like run.** This builds the production images and serves everything on one origin through nginx, as in production:

```sh
SESSION_SECRET=$(openssl rand -hex 32) docker compose -f compose.yaml -f compose.prod.yaml up --build
```

Open http://localhost:8080. The API isn't published on its own port; nginx forwards `/api` to it. Both containers run as non-root users on a read-only filesystem. The production image refuses the development session secret, so the command passes a random one.

Stop either with `Ctrl+C`, then `docker compose down`.

## Natively

You need [fnm](https://github.com/Schniz/fnm) (for Node) and pnpm.

```sh
fnm use              # the Node version pinned in .node-version
pnpm install
```

Every task runs through Nx (`pnpm nx <target> <project>`), so caching and task dependencies apply.

| Command                                | What it starts                                                     |
| -------------------------------------- | ------------------------------------------------------------------ |
| `pnpm nx serve api`                    | The API on http://localhost:3000/api                               |
| `pnpm nx serve web`                    | The dashboard on http://localhost:4200, proxying `/api` to the API |
| `pnpm nx run-many -t serve -p api web` | Both at once                                                       |
| `pnpm nx serve web -c mock`            | The dashboard against mocked API responses: no API needed          |
| `pnpm nx dev docs`                     | This wiki on http://localhost:4321/ratewatch/                      |

**Mock mode** answers API requests in the browser from the handlers in `apps/web/src/mocks/handlers/`. Use it to build UI before its endpoint exists: add a fixture and a handler for the new endpoint, then build against it. See [API mocking](../../architecture/frontend/#api-mocking).

## Configuration

Ports, URLs and secrets come from environment variables. Safe local defaults are committed in two files, which Nx loads for every task:

- `.env` at the root: `API_URL`, `WEB_HOST` and `WEB_PORT`, read by Vite and Playwright.
- `apps/api/.env`: the API's `PORT`, `SESSION_SECRET` and `REDIS_URL`.

To change a value on your machine, put it in a `.env.local` next to the file (git ignores it), or set it in your shell; both win over the committed defaults. For example, to run the dashboard on another port:

```sh
WEB_PORT=4300 pnpm nx serve web
```

The API checks its variables when it starts and stops with a message naming any that is missing or invalid. Every variable and its rules are in [Runtime configuration](../../adrs/runtime-config/).

## Test

Tests run natively.

| Command                                      | What it runs                                                         |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm nx run-many -t test`                   | Unit and component tests (Vitest) in every project                   |
| `pnpm nx test web`                           | One project's tests                                                  |
| `pnpm nx e2e ratewatch-e2e`                  | End-to-end tests: starts the API and dashboard, then runs Playwright |
| `pnpm nx e2e ratewatch-e2e -- --project=api` | Only the API end-to-end suite                                        |

The first end-to-end run needs a browser: `pnpm exec playwright install chromium`.

## Before you open a pull request

CI runs these on every pull request, limited to the projects your change affects:

```sh
pnpm nx affected -t lint typecheck test build e2e
pnpm nx format:check
```

Fix formatting with `pnpm nx format:write`. CI also builds the production images and checks the production-like stack answers `/api/health`.
