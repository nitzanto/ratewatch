---
title: Redis client
description: The API uses ioredis 5, unit-tested with ioredis-mock and integration-tested on a real Redis with Testcontainers.
sidebar:
  order: 24
---

**Status:** Accepted · **Issue:** [#45](https://github.com/nitzanto/ratewatch/issues/45)

The limiter's unit tests must use a mock library for Redis that runs our Lua script. We use **ioredis 5**, with **ioredis-mock** in unit tests and a real Redis from **Testcontainers** in the concurrency test.

**Options considered**

- **ioredis** (chosen): the only client with a mock that runs Lua, through a Lua VM written in JavaScript. Its `commandTimeout` bounds the wait for each reply, which failing open needs, and the Socket.IO Redis adapter docs recommend it.
- **node-redis**: Redis's recommended client for new projects, but no mock runs Lua against its current API, and its command timeout only covers commands not yet sent.
- **A real Redis for every test**: faithful, but every unit test needs Docker, and unit tests are meant to use a mock.

**Why:** a mock that runs the real script, plus a reply timeout for failing open.

**Trade-offs we accept:** Redis maintains ioredis on a best-effort basis. ioredis-mock isn't a faithful Redis, so the script avoids what it gets wrong (`HMGET` returns 0-based arrays to Lua; no `cjson`; `TIME` is unreliable), and only the Testcontainers test proves the script.

**Revisit when:** ioredis-mock supports ioredis 6 (upgrade both), or a mock for node-redis runs Lua.

**In the code:** planned with [#46](https://github.com/nitzanto/ratewatch/issues/46): the Redis module in the API provides the client through an injection token, which tests override with ioredis-mock.
