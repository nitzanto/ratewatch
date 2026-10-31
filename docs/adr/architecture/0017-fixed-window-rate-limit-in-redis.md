---
area: architecture
issue: https://github.com/nitzanto/ratewatch/issues/45
status: accepted
---

# Fixed window from the first request, counted in Redis by one atomic script

The limit is checked by a NestJS interceptor in every API instance, against Redis shared by all of them. A user's window is one hour from their first request; one Lua script per request reads the pause, the limit and the window, refuses without writing when nothing is left, and otherwise increments and sets the one-hour expiry only when it opens the window. All of a user's keys carry the `{userId}` hash tag, so the script stays on one Redis Cluster slot. A refused request writes nothing, so it can't use up the limit, and two concurrent requests can't both take the last one.

## Considered Options

- **Limiter in an API gateway in front of the services**: the usual choice when many services share one limit and the gateway can verify a token itself. ratewatch has one service and a session cookie only the API can verify, so the gateway would need a second copy of the session check and the admin rules, and it calls Redis per request anyway. Revisit when a second service needs the same limit.
- **Window on the clock hour** (key per hour with `EXPIREAT`): resets everyone at once and isn't "an hour from my first request".
- **Sliding log / sliding window counter**: a rolling hour has no single reset time to report in the 429; the log costs up to `limit` entries per user.
- **Token bucket**: smooths bursts, but "requests left" and "try again at" become a refill rate, and extra requests for the current window have nothing to attach to.
- **`@nestjs/throttler`**: a guard, not an interceptor; its Redis storage increments before checking, so refused requests count; no custom limit, extra requests or pause.

## Consequences

- A user can spend a full limit at the end of one window and another at the start of the next.
- `EXPIRE` is set once per window. Setting it on every request would push the reset time back forever.
- Redis replication is asynchronous: a failover can lose the last increments, giving a user a few extra requests.
