---
area: infrastructure
issue: https://github.com/nitzanto/ratewatch/issues/50
status: accepted
---

# Artillery for simulated traffic

Simulated traffic runs on Artillery 2 from the `traffic` project (`apps/traffic`): `pnpm nx simulate traffic` signs in 20 users through the real sign-in and clicks at three rates read in order from `profiles.csv`, so every run ends with the same mix of OK, Warning and Exceeded users. The load test (#41) builds on the same project and sign-in flow. Artillery installs through pnpm like everything else, keeps a cookie jar per virtual user, reads `API_URL` from the root `.env` that Nx loads, and has a Socket.IO engine and pass/fail thresholds for the load test.

## Considered Options

- **A Node script with `fetch`**: no dependency, but the load test would need arrival phases, latency percentiles, thresholds, reports and Socket.IO clients rebuilt by hand.
- **k6**: strong load tester, but a separate Go binary outside pnpm, and Socket.IO only through an extension.
- **autocannon**: fast HTTP benchmarking, with no per-user flow (sign in, then requests carrying that user's cookie).

## Consequences

- Artillery adds about 500 packages to the lockfile, dev only. Its Chromium download and native StatsD socket are denied in `allowBuilds`, because neither engine is used.
- The target sets `ARTILLERY_DISABLE_TELEMETRY`, since Artillery reports usage by default.
- Exact counts need `order: sequence` on the payload, with the profiles interleaved so the mix holds however Artillery splits users across workers.
