---
area: backend
issue: https://github.com/nitzanto/ratewatch/issues/45
status: accepted
---

# ioredis 5, unit-tested with ioredis-mock

The API talks to Redis with `ioredis` 5, although Redis now recommends `node-redis` for new projects and maintains ioredis on a best-effort basis. Unit tests must use a mock library that runs our Lua script, and only `ioredis-mock` does (through a Lua VM written in JavaScript). ioredis also has a per-command reply timeout (`commandTimeout`), which failing open needs, and it's the client the Socket.IO Redis adapter docs recommend. The concurrency test runs the real script on a real Redis with Testcontainers, because the mock is not a faithful Redis.

## Considered Options

- **node-redis**: the recommended client, but no mock runs Lua against its current API, and its command timeout only covers commands not yet written to the socket.
- **Only a real Redis in tests** (Testcontainers everywhere): faithful, but every unit test needs Docker, and the requirement is a mock library for unit tests.

## Consequences

- Stay on ioredis 5 until `ioredis-mock` supports ioredis 6.
- The script avoids what the mock gets wrong: no `HMGET` (arrays come back 0-based), no `cjson`, no `TIME`.
