---
area: architecture
issue: https://github.com/nitzanto/ratewatch/issues/45
status: accepted
---

# Dashboard data in Redis 8, indexed by its query engine and written once per second

Each API instance keeps the latest numbers per user in memory and writes them once per second, in one pipeline, to a `user:{userId}` hash. The Redis 8 query engine indexes those hashes, so one query searches by user ID, filters by status and last request, sorts by one column, returns a page of up to 100 rows with the total, and counts each status. The window's fields expire with the window (hash field expiry), so a window that ended never shows a stale status. The limiter's script never touches these hashes, so the request path stays one round trip.

## Considered Options

- **Sorted sets maintained by hand** (one per sortable column, one for ID prefix search, one per status): work on any Redis, but each is a global hot key written by every request, and in Redis Cluster the limiter's script can't update them.
- **Load every user into the browser**: fine for tens of users; at large counts the first load is huge and each admin would receive every user's events.
- **A database for the dashboard**: durable history, but a second store to run for data that lives 24 hours.
- **Valkey with `valkey-search`**: BSD-licensed and has the same query features; the fallback if the Redis licence becomes a problem.

## Consequences

- Redis 8 or later is required, licensed RSALv2, SSPLv1 or AGPLv3; running it unmodified is fine.
- Each batch re-indexes the users it writes. The dashboard can be up to a second behind.
- Pages are numbered, not cursor-based: deep pages cost more, and admins reach users through search and filters.
