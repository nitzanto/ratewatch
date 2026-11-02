---
area: frontend
issue: https://github.com/nitzanto/ratewatch/issues/31
status: accepted
---

# Thin pages over feature folders that mirror the UI

`apps/web/src` has thin `pages/` (one per route, ADR-0014) that only lay out features; `features/<feature>/` holding everything only that feature uses; and shared folders for what two or more features use: `components/`, `api/` (`api-client.ts`, `api-error.ts`, then `<resource>/` with its `<resource>-queries.ts` and one-line hooks, and `realtime/`), `theme/`, `utils/`, `mocks/data` + `mocks/handlers`, and `test/` (render helpers, `test-setup.ts`; excluded by `tsconfig.app.json`). `app/` holds bootstrap: providers, routes, guards, `app-shell/`.

Inside a feature: a component with parts gets a folder named after it with its main file inside (`users-table/users-table.tsx`); two or more parts with one role share a role folder (`cells/`, `states/`, `controls/`), a single part sits beside its main file, at most one such level per component folder; `hooks/`, `utils/`, `types/` only at the feature root, only when they have a file; each component's spec beside it, the page spec only covering wiring; no `index.ts` barrels. Siblings in one feature may import each other's parts. Imports use `@/` across folders and relative paths inside a feature. Lint (`no-restricted-imports`): shared folders never import a feature or page, features never import each other or a page, pages never import each other.

## Considered Options

- **Everything under the page** (`pages/dashboard/components/…`): six folders deep before a file, past React's suggested three or four.
- **Layers plus feature folders** (the previous version): a screen's code spread over five folders, and the users table's fifteen components in one flat list.
- **A `components/` folder inside every component folder**: uniform, but `components/…/components/…` paths repeat and get deep.

_Amended 2026-10-31 ([#34](https://github.com/nitzanto/ratewatch/issues/34)): feature-only code moved to `features/<feature>/`._
_Amended 2026-11-02 ([#84](https://github.com/nitzanto/ratewatch/issues/84)): pages thin, features mirror the UI, `hooks/api` + `libs/api` merged into `api/<resource>/`, `libs/` split into `theme/`, `utils/`, `test/`._
