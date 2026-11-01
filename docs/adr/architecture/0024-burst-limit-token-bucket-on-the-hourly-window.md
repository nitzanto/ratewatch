---
area: architecture
issue: https://github.com/nitzanto/ratewatch/issues/79
status: accepted
---

# A token bucket burst limit on top of the hourly window

A click must pass two limits, checked in the one atomic script: the hourly window (ADR 0017, unchanged) and a burst limit, a token bucket per User holding 20 tokens and refilled at 5 per second, stored as `tokens` and `tokensAt` in the window's hash. Without it, a buggy client or script spends the whole hour in one second; with it, 100 requests at once spend 20. The rate is set above how fast a person clicks for long, so the clicker can still reach the hourly limit in about 20 seconds. A burst refusal is a 429 with `reason: "burst"` and `retryAt` at the next token, counts nothing, counts toward the 429s today, and never fires `rate:limit_exceeded`. A pause suspends both limits; a new window or an admin reset starts with a full bucket.

## Considered Options

- **Replace the window with a token bucket**: no hourly reset, reset time or "current window", which the users table, extra requests and analytics are built on; to keep 100 per hour strict, capacity plus hourly refill must stay at or under 100, which makes the clicker refuse a person after a few clicks.
- **A second fixed window (for example 10 per minute)**: simpler, but refuses at minute edges and allows 20 in two seconds across them.
- **A slow bucket (1 token per 36 s)**: would also protect against a person's own mistakes, but refuses a person after 10 quick clicks, so the demo can't reach the hourly limit.

## Consequences

- The bucket refills by each API instance's clock (passed in, since ioredis-mock gets `TIME` wrong); clock drift between instances shifts the refill slightly, and the elapsed time is never negative.
- Specs that click in bulk to test something else lift the bucket through the `burstLimit` provider.
- It stops machine-speed bursts, not a person deliberately clicking 100 times in 20 seconds.
