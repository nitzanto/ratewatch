---
title: Traffic simulation
description: Artillery signs in simulated users and sends their requests through the real API.
sidebar:
  order: 26
---

**Status:** Accepted · **Issue:** [#50](https://github.com/nitzanto/ratewatch/issues/50)

The dashboard needs realistic data in development and demos: many users, some close to their limit and some over it. **Artillery** runs that traffic. One command signs in 20 users through the real sign-in, and they click at three different rates, so every run ends with the same mix of OK, Warning and Exceeded users. The load test will build on the same setup.

**Options considered**

- **Artillery** (chosen): installed through pnpm like every other tool, a separate cookie jar for each simulated user, scenarios written in YAML, and the arrival phases, thresholds, reports and Socket.IO clients a load test needs.
- **A small Node script with `fetch`**: no new dependency, but the load test would have to rebuild arrival rates, latency percentiles, thresholds and reports by hand.
- **k6**: a strong load tester, but a separate binary outside pnpm, with Socket.IO only through an extension.
- **autocannon**: fast HTTP benchmarking, but no way to sign in a user and then send that user's requests.

**Why:** one tool covers both the simulator and the load test, and it installs and runs like the rest of the workspace.

**Trade-offs we accept:** Artillery is a large development dependency (about 500 packages). We skip its browser engine's Chromium download and its native StatsD module, because neither is used. Artillery reports anonymous usage by default, so the simulator turns that off.

**In the code:** `apps/traffic/simulate.yml` (the scenario), `apps/traffic/profiles.csv` (the click count and pace for each user), and the `simulate` target in `apps/traffic/package.json`. How to run it is in [Running locally](../../guides/running-locally/#simulate-traffic).
