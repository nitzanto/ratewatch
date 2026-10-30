---
title: Running ratewatch locally
description: Set up, run the apps, use mock mode, and run every kind of test.
---

## Set up

You need [fnm](https://github.com/Schniz/fnm) (for Node) and pnpm.

```sh
fnm use              # the Node version pinned in .node-version
pnpm install
```

Every task runs through Nx (`pnpm nx <target> <project>`), so caching and task dependencies apply.

## Run the apps

| Command                                | What it starts                                                     |
| -------------------------------------- | ------------------------------------------------------------------ |
| `pnpm nx serve api`                    | The API on http://localhost:3000/api                               |
| `pnpm nx serve web`                    | The dashboard on http://localhost:4200, proxying `/api` to the API |
| `pnpm nx run-many -t serve -p api web` | Both at once                                                       |
| `pnpm nx serve web -c mock`            | The dashboard against mocked API responses: no API needed          |
| `pnpm nx dev docs`                     | This wiki on http://localhost:4321/ratewatch/                      |

**Mock mode** answers API requests in the browser from the handlers in `apps/web/src/mocks/handlers.ts`. Use it to build UI before its endpoint exists: add a handler for the new endpoint, then build against it. See [API mocking](../../architecture/frontend/#api-mocking).

## Test

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

Fix formatting with `pnpm nx format:write`.
