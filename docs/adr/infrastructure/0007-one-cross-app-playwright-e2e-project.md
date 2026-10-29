---
area: infrastructure
issue: https://github.com/nitzanto/ratewatch/issues/10
status: accepted
---

# One cross-app Playwright e2e project

End-to-end tests live in one Nx project, `ratewatch-e2e` in `apps/e2e` (`pnpm nx e2e ratewatch-e2e`), that starts the real API and web app. Inside it, two Playwright projects split the suites: `api` (`src/api/`) calls the API directly through the `request` fixture with no browser, and `web` (`src/web/`) drives Chromium through page objects (`src/web/pages/`) provided as fixtures. Ratewatch's flows cross both apps (a request is rate-limited by the API and shown live on the dashboard), so one suite can drive a request and assert what the dashboard shows.

## Considered Options

- **Naming**: `ratewatch-e2e` follows Nx's `<name>-e2e` convention for the whole product; a project called `e2e` made the command `nx e2e e2e`.
- **One `*-e2e` project per app** (Nx's generator default): the cross-app flows would belong to neither project, and each would start its own copy of the stack.
- **API e2e in Vitest with supertest**: no browser needed, but a second runner, and it can't follow a request through to the dashboard.
- **Tags (`@api`, `@web`) instead of Playwright projects**: tags filter, but projects also give each suite its own settings (the API suite needs no browser and a different base URL). Tags stay for cross-cutting groups such as `@smoke`.

## Consequences

- Nx infers that the `e2e` target waits for `api:serve` and `web:serve`, so `webServer` uses `reuseExistingServer: true` everywhere, CI included, or Playwright would start each server a second time.
- `implicitDependencies` on both apps makes `nx affected` run e2e when either changes. Run one suite with `-- --project=api` or `--project=web`.
- Only Chromium runs, to keep CI fast. Add browsers when a UI behaviour depends on the engine.
