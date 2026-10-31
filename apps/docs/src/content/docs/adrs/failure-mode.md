---
title: Failure mode
description: When Redis can't answer, requests go through without a count, and the user sees that the limit is unavailable.
sidebar:
  order: 21
---

**Status:** Accepted · **Date:** 2026-10-31 · **Issue:** [#45](https://github.com/nitzanto/ratewatch/issues/45)

## Context and problem statement

Every limited request asks Redis before it runs. Redis can stop, fail over, or slow down. What does the API do with a request it can't count, how fast does it decide, and who finds out?

## Decision drivers

- **Availability:** a store outage must not stop the product.
- **Honesty:** the product never shows a count it doesn't have.
- **Performance:** a slow Redis must not make every request slow.
- **Operability:** operators learn about the outage at once; logs stay readable at full traffic.

## Considered options

1. **Fail open: serve the request without `x-count`**
2. Fail closed: refuse with 503 until Redis is back
3. Count in each API instance's memory during the outage

## Trade-off matrix

|                 | Fail open                                   | Fail closed                              | In-memory count during the outage                 |
| --------------- | ------------------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| Scalability     | Not affected                                | Not affected                             | Fair: per-instance state while Redis is down      |
| Performance     | Strong: about 50 ms worst case, then normal | Strong                                   | Strong                                            |
| Reliability     | Strong: the product keeps working           | Weak: a store outage is a product outage | Strong                                            |
| Security        | Fair: no limit during the outage            | Strong: nobody exceeds a limit           | Good: a limit up to n times looser, n = instances |
| Maintainability | Strong: one branch                          | Strong                                   | Weak: a second counting path to test              |
| Honesty         | Strong: no count is shown                   | Strong                                   | Weak: the count differs between responses         |

## Decision outcome

Chosen option: **fail open**, because it's the only option that keeps the product available and never shows a wrong count.

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant L as Rate-limit interceptor
  participant R as Redis
  participant O as Operator
  U->>L: POST /api/click
  L-xR: atomic script
  Note over L,R: no reply within about 50 ms
  rect rgba(253,230,138,0.45)
    L->>L: log (at most once every 10 s)
    L-->>U: 200, no x-count
  end
  Note over U: the clicker shows "Limit unavailable"
  Note over O: sees "Redis unavailable" in the logs, and later the failed-open alert
  O->>L: GET /api/health
  L-->>O: 200: the API stays in service
```

- The Redis client has no offline queue and no retries: a command fails at once when the connection is down, and after about 50 ms when Redis doesn't reply. The load test sets the final timeout; it stays about 10 times the limit check's p99 target.
- Failures are logged at most once every 10 seconds, so an outage doesn't write a log line per request. How many requests failed open is a metric, added with observability. The connection also logs once when it fails and once when it's back.
- `GET /api/health` never checks Redis, for liveness or readiness. Every API instance shares the one Redis, so a health check that failed with it would take all of them out of service at once: the full outage failing open exists to avoid. The outage shows in the logs instead, and in the failed-open metric once observability lands.

**Showing "Limit unavailable" is a product decision.** Most products hide a failure like this from the user. In ratewatch the limit is the product, so the user should know when it isn't being counted, rather than see an old number or nothing at all.

### Consequences

- Good, because a Redis outage never stops a User or an Admin from working.
- Good, because the user never sees a count that's wrong.
- Bad, because during the outage a user can send more than their limit, and successful requests carry no `x-count`.
- Bad, because a command that timed out may still have counted in Redis.
- Bad, because the dashboard's data also lives in Redis, so the dashboard stops updating during the outage.

### Confirmation

- Unit tests: a Redis error and a timeout both let the request through without `x-count`.
- A web component test: a response without `x-count` shows "Limit unavailable".
- Metric and alert, with observability: failed-open requests above 0 for 1 minute alert the operator.
- Revisit if the limit ever protects something costly, such as a paid upstream API: then fail closed for those routes.

## Notes on options

- **Reporting not ready while Redis is down** was the first design. It was dropped: readiness that fails on a dependency every instance shares makes the orchestrator remove all of them at once, turning a Redis outage into a full outage. Readiness should only report what's wrong with one instance, such as shutting down.

- **Fail closed** is the safer choice when exceeding the limit costs money or enables abuse. Here it turns any Redis outage into a full outage.
- **In-memory counting during the outage** keeps `x-count` on every response, but each instance counts alone, so a user's count jumps between responses and their limit is up to n times looser. Those requests are also never added to Redis afterwards.

## In the code

- `apps/api/src/app/redis/constants/redis.constants.ts`: the fail-fast options (no offline queue, no retries, the 50 ms command timeout), used by `createRedisClient` in `redis/providers/redis-client.provider.ts`.
- `apps/api/src/app/rate-limit/interceptors/rate-limit.interceptor.ts`: the fail-open branch and its rate-limited log line.
- `apps/api/src/app/redis/providers/redis-client.provider.ts`: logs once when the connection fails and once when it's back.
- `apps/api/src/app/health.controller.ts`: `GET /api/health`, which never checks Redis.
- `apps/web/src/features/cookie-clicker/components/requests-left.tsx`: shows "Limit unavailable" when `x-count` is missing.
