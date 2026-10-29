---
area: infrastructure
issue: https://github.com/nitzanto/ratewatch/issues/4
status: accepted
---

# Nx + pnpm monorepo

The API, web app, shared contracts, e2e tests and docs site live in one repo so a contract change and both of its consumers land in one PR. We use Nx on pnpm workspaces, with TypeScript project references and Nx's generator defaults, because Nx gives us the dependency graph, `affected` runs, caching and tag-based import boundaries (`@nx/enforce-module-boundaries`) out of the box. Every project tests with Vitest, so the repo has one runner and one config style (end-to-end tests use Playwright, see ADR-0007); the API adds `unplugin-swc` so Nest's decorator metadata survives the test transform.

_Amended 2026-10-29 ([#7](https://github.com/nitzanto/ratewatch/issues/7)): originally each project kept its generator's runner (Jest for Nest). Nx's Nest generator has no default runner and NestJS itself now defaults to Vitest, so the split no longer had a reason._

## Considered Options

- **Plain pnpm workspaces**: least tooling, but no affected runs, task caching or boundary rules; we'd rebuild those with scripts.
- **Turborepo**: caching and task pipelines, but no code generators and no import boundary enforcement.
- **Separate repos**: shared contracts would need publishing and versioning, and cross-cutting changes would span several PRs.

## Consequences

- Nx's opinions come with it: new projects are created with Nx generators, and upgrades go through `nx migrate`.
- Every project must carry a `scope:*` tag, or the boundary rule rejects its imports.
