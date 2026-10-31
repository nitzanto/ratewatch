---
area: frontend
issue: https://github.com/nitzanto/ratewatch/issues/31
status: accepted
---

# Layered folders in the web app, not feature folders

`apps/web/src` is split by layer, and each layer holds one working example to copy: `app/` (providers, route table and app shell), `pages/` (one component per route, added by ADR-0014), `components/business` (tied to domain logic) and `components/ui` (presentational, no domain coupling), `hooks/api` (one-line query and mutation hooks) and `hooks/ui`, `libs/<name>` (`api`, `errors`, `theme`, `test-utils`; later `utils`, `observability`), `contexts/` (real cross-cutting state only, never the API client; the auth session turned out to be server state and lives in TanStack Query, ADR-0016), and `mocks/data/<resource>` plus `mocks/handlers/<resource>`, joined by one handlers index. Imports use the `@/` alias for `src/`, set in `tsconfig.app.json`, `tsconfig.spec.json` and `vite.config.mts`. A layer is created with its first real file, never as an empty folder with a `.gitkeep`.

Code that only one feature uses lives in `features/<feature>/` instead (its own `components/`, `hooks/` and pure logic, only the folders it needs), imported by that feature's page. The layers keep everything shared, including the whole API layer (`libs/api`, `hooks/api`, `mocks/`). When a second feature needs a feature's code, it moves to a layer. Lint (`no-restricted-imports`) stops a layer from importing a feature and features from importing each other.

## Considered Options

- **Feature folders only** (`features/users/…`): keep a feature's files together, but the dashboard is one domain. The live table, user detail, search and analytics all read the same users and rate-limit status, so most code would end up in a shared folder anyway, with every feature drawing its own line between "mine" and "shared".
- **Layers only** (the first version of this decision): the clicker's seven presentational parts, its view rules and its timers would sit in `components/business` and `hooks/` among shared code, though nothing else uses them.

## Consequences

- `libs/test-utils` is test-only code inside `src/`: `tsconfig.app.json` excludes it and `tsconfig.spec.json` includes it, like `test-setup.ts`.

_Amended 2026-10-31 ([#34](https://github.com/nitzanto/ratewatch/issues/34)): feature-only code moved to `features/<feature>/`._
