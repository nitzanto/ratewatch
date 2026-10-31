---
title: Architecture decisions and principles
description: What ratewatch must do, what we optimise for, and every decision made so far.
sidebar:
  order: 0
---

This is the starting point for why ratewatch is built the way it is: the goals and constraints, the quality attributes we optimise for, the principles every design must respect, and a log of every decision. Each decision links to its ADR, a page with the options we weighed and the trade-offs we accepted.

## Goals and constraints

- Enforce a per-user request limit that holds under concurrent requests, across many API instances.
- Show admins each user's usage and violations in real time, and let them adjust limits.
- **Constraints:** the backend is NestJS and the frontend is React or Angular, both in TypeScript; the limit is enforced as a NestJS interceptor; request counts live in external storage, keyed by user ID, never by IP or MAC address.

## Quality attribute priorities

Ranked. When two attributes conflict, the higher one wins unless an ADR argues otherwise.

1. **Reliability and correctness.** A limit that lets requests slip through under concurrent load is a bug, not a performance trade-off.
2. **Security.** Limits apply per authenticated user; admin actions are authorised and auditable.
3. **Scalability.** API instances are stateless and scale horizontally; shared state lives in one external store.
4. **Performance.** The limit check adds as little latency as possible to every request. The target is set with the rate-limiting design.
5. **Maintainability.** One language end to end, shared contracts, and tests at every level.

## Architecture principles

1. **Stateless services.** No request or rate-limit state lives in API memory, so any instance can serve any request.
2. **Atomic shared state.** Every read-modify-write on a counter is a single atomic operation in the store.
3. **Contracts first.** Every shape that crosses a boundary is a shared schema, validated on both sides.
4. **Validate at every trust boundary**, including the browser receiving API responses.
5. **Same origin.** The browser talks to one origin; the API sits behind `/api`, so there's no CORS.
6. **Decide how we fail.** Every external dependency has a documented failure mode, decided before it ships.

## Decision log

Every decision is listed here, with a link to its ADR.

| Area              | Decision                                                                                                                          | Why, in one line                                                                       | Details                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Repository        | Nx + pnpm monorepo                                                                                                                | A change to a shared shape and both its consumers land in one pull request             | [Monorepo](../monorepo/)                             |
| Backend           | NestJS 11 on Express                                                                                                              | NestJS is required; 11 is the newest the build tooling supports                        | [Backend framework](../backend-framework/)           |
| Frontend          | React 19 + Vite                                                                                                                   | Largest ecosystem for data-heavy admin UIs, with a fast dev loop                       | [Frontend framework](../frontend-framework/)         |
| UI                | MUI, with MUI X Data Grid for the live table                                                                                      | One maintained source for the grid, forms and theme                                    | [UI library](../ui-library/)                         |
| API contracts     | Shared Zod schemas in `libs/contracts`                                                                                            | One definition gives both types and runtime validation                                 | [API contracts](../api-contracts/)                   |
| Folder layout     | Shared code by layer; one feature's own code in `features/`                                                                       | Features share most of their data; each layer is a template to copy                    | [Folder layout](../folder-layout/)                   |
| Server state      | TanStack Query with a query-options factory per resource                                                                          | Caching, cancellation and invalidation built once, keyed in one place                  | [Server state](../server-state/)                     |
| Routing           | React Router in data mode, URLs as `ROUTES` constants                                                                             | The most used and best-known React router; loaders can prefetch queries                | [Routing](../routing/)                               |
| Design skill      | Impeccable, copied into the repo at a pinned commit                                                                               | Design guidance changes only through review, like the code it shapes                   | [Design skill](../design-skill/)                     |
| Rate-limit store  | Redis; a fixed one-hour window from the first request, counted by one atomic script from an interceptor in every API instance     | Exactly the limit under concurrency on any instance, with one count and one reset time | [Rate-limit store and window](../rate-limit-store/)  |
| Failure mode      | Fail open: no `x-count` and "Limit unavailable" while Redis can't answer                                                          | A store outage never stops the product                                                 | [Failure mode](../failure-mode/)                     |
| Dashboard data    | User records in Redis 8, written once per second, queried with its query engine in pages of up to 100                             | The request path stays one call; search, filters, sort and counts are one query        | [Dashboard data](../dashboard-data/)                 |
| Redis client      | ioredis 5, with ioredis-mock in unit tests and Testcontainers for the concurrency test                                            | The only client with a mock that runs Lua                                              | [Redis client](../redis-client/)                     |
| Realtime          | Socket.IO with its Redis adapter; admins get events only for the users they see                                                   | Events scale with what admins look at, not with users                                  | [Realtime delivery](../realtime-delivery/)           |
| Auth              | Demo sign-in as a User or the Admin; a signed, httpOnly session cookie for 24 hours; role-marked routes answer 403 to other roles | The server trusts only what it signed, with no state to share                          | [Identity and roles](../identity-and-roles/)         |
| Unit tests        | Vitest in every project                                                                                                           | One runner and one config style across the repo                                        | [Unit tests](../unit-tests/)                         |
| API mocking       | Mock Service Worker 3, shared by dev and component tests                                                                          | Frontend work without a running API; tests exercise the real `fetch` path              | [API mocking](../api-mocking/)                       |
| End-to-end tests  | One Playwright suite for API and web                                                                                              | Core flows cross both apps, so one suite drives and checks both                        | [End-to-end tests](../end-to-end-tests/)             |
| CI                | GitHub Actions on affected projects; squash merge only                                                                            | Every pull request is checked before merge, on what it could break                     | [Continuous integration](../continuous-integration/) |
| Documentation     | This wiki, in the repo, on GitHub Pages                                                                                           | Reviewed in the same pull request as the code it describes                             | [Engineering wiki](../engineering-wiki/)             |
| Agent skills      | Forked into the repo and owned there                                                                                              | The workflow is reviewed like code and the same for everyone                           | [Agent skills](../agent-skills/)                     |
| Same origin       | nginx serves the dashboard and proxies `/api` and `/socket.io`                                                                    | No CORS, and one image per app for every environment                                   | [Same origin through nginx](../same-origin/)         |
| Local environment | Docker Compose with Compose Watch; native pnpm optional                                                                           | Only Docker needed, with hot reload the same on every Docker engine                    | [Local environment](../local-environment/)           |
| Configuration     | Environment variables, validated by the API at startup; committed `.env` dev defaults                                             | One image runs in every environment, and a bad value stops startup by name             | [Runtime configuration](../runtime-config/)          |
