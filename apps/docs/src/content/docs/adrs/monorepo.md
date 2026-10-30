---
title: Monorepo
description: The repo is an Nx monorepo on pnpm workspaces.
sidebar:
  order: 1
---

**Status:** Accepted · **Issue:** [#4](https://github.com/nitzanto/ratewatch/issues/4)

The API, dashboard, shared contracts, end-to-end suite and this wiki live in one repository: **Nx on pnpm workspaces**, with TypeScript project references and Nx's generator defaults.

**Options considered**

- **Nx + pnpm** (chosen): a dependency graph, `affected` runs, task caching, code generators and tag-based import boundaries out of the box.
- **Plain pnpm workspaces**: the least tooling, but no affected runs, caching or boundary rules; we'd rebuild them with scripts.
- **Turborepo**: caching and task pipelines, but no code generators and no import boundary enforcement.
- **Separate repositories**: the contracts would need publishing and versioning, and one cross-cutting change would span several pull requests.

**Why:** a change to a shared shape and the updates to both apps that consume it land in one pull request, and CI checks only what that change could have broken. Nx is the only option that also enforces which project may import which.

**Trade-offs we accept:** Nx's opinions come with it. New projects are created with Nx generators, upgrades go through `nx migrate`, and framework upgrades wait until Nx's plugins support them (see [Backend framework](../backend-framework/)). Every project carries a `scope:*` tag, or the boundary lint rule rejects its imports.

**Revisit when:** Nx's plugin support holds back an upgrade we need.

**In the code:** `nx.json`, `pnpm-workspace.yaml`, the `nx.tags` in each project's `package.json`, and the `@nx/enforce-module-boundaries` rule in `eslint.config.mjs`.
