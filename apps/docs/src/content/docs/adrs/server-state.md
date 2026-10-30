---
title: Server state
description: The dashboard keeps server state in TanStack Query, through one schema-typed API client and a query-options factory per resource.
sidebar:
  order: 15
---

**Status:** Accepted · **Issue:** [#31](https://github.com/nitzanto/ratewatch/issues/31)

The dashboard is mostly server state: users, their counts and the API's health, fetched, cached, refreshed and invalidated after admin actions. Before this decision the one page fetched in a `useEffect`, and each new screen would have rebuilt caching and invalidation its own way. We chose **TanStack Query**, used through a query-options factory for each resource and one-line hooks over it.

**Options considered**

- **TanStack Query** (chosen): caching, request deduplication, cancellation, invalidation by key prefix, and mutations, with the largest ecosystem and its own lint rules.
- **Plain `fetch` in hooks**: no dependency, but every feature would rebuild caching, deduplication and invalidation, and the live table needs all three.
- **SWR**: smaller, but weaker mutations and key-prefix invalidation, and a smaller ecosystem.
- **RTK Query**: pulls in Redux, and the dashboard has no client state that needs a store.

**Why:** the live table, user detail and admin controls all read and invalidate the same server data. Each resource exports its query key as a constant and builds its query options on it, so fetching, prefetching and invalidation all share one definition of the key and the fetch.

**Trade-offs we accept:**

- One more dependency and its concepts (query keys, stale time) to learn.
- Automatic retries and refetch-on-window-focus are turned off: against a rate-limited API every extra request spends the user's allowance. A failed request shows its error at once, and fresh data comes from explicit invalidation or the realtime connection.
- The API client is a module-level instance, not a React context, so tests replace the network with MSW and never inject a client. That keeps the real client, contract parsing and error mapping in every component test.

**In the code:** the client is `apps/web/src/libs/api/api-client.ts`, resource modules are next to it, and hooks are in `apps/web/src/hooks/api/`. The query client is created in `apps/web/src/app/providers.tsx`. `@tanstack/eslint-plugin-query` runs in `apps/web/eslint.config.mjs`. How a request flows is in [Frontend architecture](../../architecture/frontend/#talking-to-the-api).
