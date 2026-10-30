---
area: frontend
issue: https://github.com/nitzanto/ratewatch/issues/31
status: accepted
---

# Layered folders in the web app, not feature folders

`apps/web/src` is split by layer, and each layer holds one working example to copy: `app/` (root component and providers), `components/business` (tied to domain logic) and `components/ui` (presentational, no domain coupling), `hooks/api` (one-line query and mutation hooks) and `hooks/ui`, `libs/<name>` (`api`, `errors`, `theme`, `test-utils`; later `utils`, `observability`), `contexts/` (real cross-cutting state only, such as the future auth session, never the API client), and `mocks/data/<resource>` plus `mocks/handlers/<resource>`, joined by one handlers index. Imports use the `@/` alias for `src/`, set in `tsconfig.app.json`, `tsconfig.spec.json` and `vite.config.mts`. A layer is created with its first real file, never as an empty folder with a `.gitkeep`.

## Considered Options

- **Feature folders** (`features/users/…`): keep a feature's files together, but the dashboard is one domain. The live table, user detail, search and analytics all read the same users and rate-limit status, so most code would end up in a shared folder anyway, with every feature drawing its own line between "mine" and "shared".

## Consequences

- `libs/test-utils` is test-only code inside `src/`: `tsconfig.app.json` excludes it and `tsconfig.spec.json` includes it, like `test-setup.ts`.
