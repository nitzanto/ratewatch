---
title: Load test results
description: The latest load test, written by the run itself.
sidebar:
  order: 4
---

The load test writes this page; don't edit it by hand. How to run it is in [Running locally](../../guides/running-locally/#load-test). It ran against the Docker Compose stack, on the same machine as the load generator: 13th Gen Intel(R) Core(TM) i5-13600, 20 threads, 32 GB memory, Windows_NT, Node v24.22.1. So the numbers show how the design behaves, not what a production cluster serves. Finding the real capacity takes a ramp test on production-like hardware, with Redis on its own machine.

## Load test

About 550 users for one minute: most reach their limit, some stay under it, some send bursts, and admins watch live. It passes when no user breaks a rule (exact `x-count`, never more than the limit, no errors) and every time stays under its limit.

Ran 2026-11-02 17:23 UTC, for 104 seconds. **Passed.**

| Time                         | p50    | p90    | p95                | p99              |
| ---------------------------- | ------ | ------ | ------------------ | ---------------- |
| Response time                | 4 ms   | 8 ms   | 10 ms ✅ (< 50)    | 15 ms ✅ (< 100) |
| Request to its `rate:update` | 169 ms | 284 ms | 821 ms ✅ (< 2000) | 983 ms           |

| Count                                                                        | Value                                        |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| Requests                                                                     | 45,565, 438 a second on average, 818 at peak |
| Users, admins included                                                       | 555                                          |
| Users who broke a rule                                                       | 0 ✅                                         |
| Clicks allowed                                                               | 37,717                                       |
| Refused for the hour                                                         | 3,170                                        |
| Refused by the burst limit                                                   | 4,123                                        |
| Live events to admins (`rate:update`, `rate:limit_exceeded`, `rate:summary`) | 16,985, 2,680, 496                           |
