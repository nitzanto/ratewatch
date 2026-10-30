---
title: Frontend framework
description: The admin dashboard is a React 19 single-page app built with Vite.
sidebar:
  order: 3
---

**Status:** Accepted · **Issue:** [#8](https://github.com/nitzanto/ratewatch/issues/8)

The dashboard is a data-heavy, real-time UI used by signed-in admins: a live user table, detail views, forms and charts, with no need for search indexing or server rendering. It's a **React 19 single-page app built with Vite**.

**Options considered**

- **React 19 + Vite** (chosen): the largest ecosystem of component libraries, data grids and data-fetching libraries, and Vite is Nx's default for React.
- **Angular**: batteries included, with signals-based change detection, but a smaller component ecosystem.
- **Next.js**: server rendering adds nothing behind a login, and brings a Node server to run, scale and secure alongside the API.

|                 | React + Vite                                  | Angular                           | Next.js                                     |
| --------------- | --------------------------------------------- | --------------------------------- | ------------------------------------------- |
| Scalability     | Strong: static files on any web server or CDN | Strong: static files              | Fair: a Node server to scale                |
| Reliability     | Strong: no server component to fail           | Strong                            | Fair: one more running service              |
| Security        | Equal: a same-origin static app               | Equal                             | Fair: server code widens the attack surface |
| Maintainability | Strong: largest ecosystem; Nx default         | Good: smaller component ecosystem | Fair: framework conventions on top of React |

**Why:** a client-only app is the simplest thing that fits an internal dashboard, and React's ecosystem is the largest for this kind of UI.

**Trade-offs we accept:** React leaves data fetching, state, routing and folder layout to us. They're decided with the features that need them and listed in [Frontend architecture](../../architecture/frontend/#decisions-to-make).

**Revisit when:** the dashboard needs public, indexable pages.

**In the code:** `apps/web/vite.config.mts` (build, dev server and `/api` proxy) and `apps/web/src/main.tsx` (entry point).
