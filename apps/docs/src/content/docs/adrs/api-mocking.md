---
title: API mocking
description: The dashboard mocks the API with MSW 3, in dev and in component tests.
sidebar:
  order: 7
---

**Status:** Accepted · **Issue:** [#9](https://github.com/nitzanto/ratewatch/issues/9)

The dashboard mocks the API with **Mock Service Worker (MSW) 3**: one set of handlers serves mock mode in the browser and every component test. End-to-end tests never use it.

**Options considered**

- **MSW 3** (chosen): it intercepts at the network level, so the app runs its real `fetch` code in dev and in tests.
- **Stubbing `fetch` with `vi.stubGlobal`**: no dependency, but it only works in tests, ties each test to how the app calls the network, and gives dev nothing.
- **MSW 2**: the only line with a Socket.IO binding today, but we'd pin an old major version for socket mocking alone.

**Why:** frontend work doesn't wait for a running API, and tests exercise the real request path.

**Trade-offs we accept:** MSW doesn't mock realtime events, because its Socket.IO binding has no MSW 3 release. The app reaches Socket.IO through one client module instead, which tests and mock mode replace. Every new endpoint needs a handler before a component test that calls it can pass.

**Revisit when:** the Socket.IO binding supports MSW 3; then move the socket mocks into MSW.

**In the code:** `apps/web/src/mocks/`. How mock mode and test overrides work is in [Frontend architecture](../../architecture/frontend/#api-mocking).
