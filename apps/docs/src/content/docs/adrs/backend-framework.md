---
title: Backend framework
description: The API runs NestJS 11 on its default Express adapter.
sidebar:
  order: 2
---

**Status:** Accepted · **Issue:** [#7](https://github.com/nitzanto/ratewatch/issues/7)

NestJS is a constraint: the rate limit is a NestJS interceptor. What we decided is the version and the HTTP adapter underneath: **NestJS 11 on Express**.

**Options considered**

- **NestJS 11 on Express** (chosen): the combination Nx's NestJS plugin supports and the ecosystem assumes.
- **NestJS 11 on Fastify**: higher raw throughput, but some Express middleware (for auth, for example) needs Fastify equivalents.
- **NestJS 12 on Express**: outside the Nx plugin's supported range (`@nestjs/core >=10 <12`), so installs warn and generators or `nx migrate` can break.

|                 | 11 + Express                                                 | 11 + Fastify                              | 12 + Express                                   |
| --------------- | ------------------------------------------------------------ | ----------------------------------------- | ---------------------------------------------- |
| Performance     | Good: framework overhead is small next to a store round trip | Better: higher raw throughput             | Good                                           |
| Reliability     | Strong: the most used and documented combination             | Good                                      | Unknown: outside the tooling's supported range |
| Maintainability | Strong: generator default, supported by the build tooling    | Fair: a second adapter to keep compatible | Weak: generators and upgrades may break        |

**Why:** it wins on reliability and maintainability. Fastify's throughput gain is real but small next to the store round trip every request already pays.

**Trade-offs we accept:** we leave Fastify's raw throughput on the table, and wait for the tooling before moving to NestJS 12.

**Revisit when:** the Nx NestJS plugin supports 12 (upgrade both together with `nx migrate`), or load tests show framework overhead, not the store, dominating request latency.

**In the code:** `apps/api/src/main.ts` bootstraps the app under the `/api` prefix. How the API is built inside is in [Backend architecture](../../architecture/backend/).
