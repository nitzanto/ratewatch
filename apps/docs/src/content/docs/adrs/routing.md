---
title: Routing
description: The dashboard routes with React Router in data mode, from one route table and one set of URL constants.
sidebar:
  order: 17
---

**Status:** Accepted · **Issue:** [#33](https://github.com/nitzanto/ratewatch/issues/33)

The dashboard got its second page (the cookie clicker) and a not-found page, so it needed a router. We chose **React Router in data mode** (`createBrowserRouter`).

**Options considered**

- **React Router, data mode** (chosen): the most widely used React router, with the most examples and answers, and the one coding agents know best. Stable and maintained since v7. Its loaders can prefetch through the same query-options factories the hooks use.
- **TanStack Router**: stronger type safety for paths and search params, and a native fit with TanStack Query, but a younger and smaller ecosystem.

**Why:** a large, stable ecosystem matters more for a two-page dashboard than typed search params. Data mode keeps the door open: loaders when a page wants its data before it renders, and React Router's framework mode later without a rewrite.

**Trade-offs we accept:**

- Paths aren't type-checked by the router. Every URL is a constant in `ROUTES` instead, so a path is written once and a typo is a compile error.
- Route components get their own `pages/` folder, one more layer next to the ones in [Folder layout](../folder-layout/).

**Revisit when:** the dashboard leans on URL search params (filters, sorting) enough that typed params would catch real bugs.

**In the code:** the route table is `apps/web/src/app/routes.tsx` and the URLs are in `apps/web/src/app/route-paths.ts`. The browser router is created in `apps/web/src/main.tsx`; tests mount the same routes in a memory router through `renderApp(url)`. How pages and the shell fit together is in [Frontend architecture](../../architecture/frontend/#routing).
