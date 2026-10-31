---
area: architecture
issue: https://github.com/nitzanto/ratewatch/issues/24
status: accepted
---

# Runtime config from environment variables

Everything that varies between deploys (ports, URLs, secrets) is an environment variable, following Twelve-Factor's config factor, so one image runs unchanged everywhere and Helm or Compose inject the values. The API validates its variables at startup with a Zod schema (`apps/api/src/app/env.ts`, passed to `@nestjs/config` as `validationSchema`) and fails naming every bad one; code reads typed `ConfigService`, never `process.env`. Local defaults are committed `.env` files that Nx loads per task.

## Considered Options

- **JSON config files per environment** (`config/production.json`, node-config style): grouping values into named environments needs a new file for every new deploy, and secrets in files get committed by accident. Fits large structured config, which we don't have.
- **The schema in `@ratewatch/contracts`**: contracts holds what crosses the wire between apps; these variables belong to the API alone.

## Consequences

- The root `.env` holds shared values (`API_URL`, `WEB_HOST`, `WEB_PORT`, read by Vite and Playwright), `apps/api/.env` the API's (`PORT`, `SESSION_SECRET`, `REDIS_URL`); `.env.local` holds personal overrides and is ignored. The web app has no runtime config: it calls the relative `/api` (ADR-0009).
- The API uses the platform-standard `PORT`, not `API_PORT`; the per-project `.env` keeps it from clashing with the web app's `WEB_PORT`.
- `ignoreEnvFile: true`: Nx already loads the files, and a production image must never read one.
- `NODE_ENV` defaults to `development` and is not in any `.env`: Nx would pass it to production builds too. The production image sets it.
- The committed dev secret starts with `dev-only-`; the schema rejects that prefix, and any secret under 32 characters, so it can't reach production. `compose.prod.yaml` requires a real `SESSION_SECRET` from the shell, and CI generates one per run.
- Production secrets will come from the platform (for example AWS Secrets Manager synced into Kubernetes Secrets by External Secrets Operator), decided with the Helm chart (#15); the app needs no change for it.
