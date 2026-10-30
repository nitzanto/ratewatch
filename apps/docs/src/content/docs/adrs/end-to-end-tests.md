---
title: End-to-end tests
description: One Playwright suite tests the API and dashboard together.
sidebar:
  order: 8
---

**Status:** Accepted · **Issue:** [#10](https://github.com/nitzanto/ratewatch/issues/10)

End-to-end tests are **one Playwright project, `ratewatch-e2e` in `apps/e2e`**, which starts the real API and dashboard. Two Playwright projects split it: `api` calls the API with no browser, and `web` drives Chromium through page objects.

**Options considered**

- **One cross-app suite** (chosen): ratewatch's core flows cross both apps (a request rate-limited by the API shows up live on the dashboard), so one suite sends the request and checks the dashboard.
- **One end-to-end project per app** (Nx's default): cross-app flows belong to neither, and each starts its own copy of the stack.
- **API tests with Vitest and supertest**: no browser needed, but a second runner, and they can't follow a request through to the dashboard.
- **Tags (`@api`, `@web`) instead of Playwright projects**: tags filter, but projects also give each suite its own settings, such as no browser and a different base URL. Tags stay for cross-cutting groups such as `@smoke`.

**Why:** the flows that matter most cross both apps, and one suite can test them as a user sees them.

**Trade-offs we accept:** only Chromium runs, to keep CI fast. The suite runs whenever either app changes.

**Revisit when:** some UI behaviour depends on the browser engine; then add that browser.

**In the code:** `apps/e2e/`, run with `pnpm nx e2e ratewatch-e2e`. See [High-level design](../../architecture/hld/#end-to-end-tests).
