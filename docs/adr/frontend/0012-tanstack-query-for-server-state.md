---
area: frontend
issue: https://github.com/nitzanto/ratewatch/issues/31
status: accepted
---

# TanStack Query for server state, through query-options factories

The web app keeps server state in TanStack Query. Each resource module in `src/libs/api/` exports its query key as a constant (`<resource>QueryKey`, imported wherever the cache is invalidated or prefetched), its plain calls made through the one API client, and a `<resource>Queries` factory of `queryOptions` builders on that key. Hooks in `hooks/api` are one-liners over that factory. The client (`createApiClient`) takes the response's Zod schema on every call and returns what it parses, so it has no caller-supplied result type. Failures become `ApiError`, or `RateLimitedError` (with `retryAt`) for a 429 whose body matches the contract. Query retries and refetch-on-window-focus are off: against a rate-limited API, every request the user didn't ask for spends their allowance.

## Considered Options

- **Plain `fetch` in hooks**: no dependency, but every feature would rebuild caching, request deduplication and invalidation, and the live table needs all three.
- **SWR**: smaller, but weaker mutations and key-prefix invalidation, and a smaller ecosystem.
- **RTK Query**: pulls in Redux, and the app has no client state that needs a store.

## Consequences

- The client is a module-level instance, not a React context. Tests replace the network with MSW and never inject a client, so the real client, contract parsing and error mapping run in every component test.
- `@tanstack/eslint-plugin-query` (recommended config) lints the web app, catching missing query-key dependencies and unstable query clients.
