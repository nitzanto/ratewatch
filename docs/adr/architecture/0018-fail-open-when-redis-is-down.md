---
area: architecture
issue: https://github.com/nitzanto/ratewatch/issues/45
status: accepted
---

# Fail open when Redis is down, and tell the user

When the limit check can't get an answer from Redis within about 50 ms (no offline queue, no retry), the request proceeds without `x-count`, the failure is logged (rate-limited, not once per request), and `GET /api/health/ready` answers 503 until Redis is back. The clicker shows "Limit unavailable". Showing it is a product decision: most products hide such a failure, but in ratewatch the limit is the product, so the user should know when it isn't being counted.

## Considered Options

- **Fail closed** (refuse with 503 while Redis is down): no one exceeds a limit, but a store outage stops the whole product. Revisit if the limit ever guards something costly, such as a paid upstream API.
- **A per-instance in-memory count during the outage**: keeps `x-count` on every response, but each instance counts on its own, so the number differs between responses and the limit becomes up to n times looser.
- **Hide the count, or keep showing the last one**: hides that the limit isn't applied, or shows a number that is wrong.

## Consequences

- During an outage a user can send more than their limit, and the requirement that every successful request carries `x-count` is not met.
- A command that timed out may still have counted in Redis.
