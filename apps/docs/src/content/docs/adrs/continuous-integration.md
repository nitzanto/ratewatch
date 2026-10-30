---
title: Continuous integration
description: GitHub Actions checks every pull request, on the projects it affects.
sidebar:
  order: 9
---

**Status:** Accepted · **Issue:** [#5](https://github.com/nitzanto/ratewatch/issues/5)

**GitHub Actions** checks every pull request and every push to `main`, running only on the projects a change affects. `quality` (lint, typecheck, formatting), `test`, `build` and `e2e` are separate required checks, and `docker` builds the production images and checks the production-like stack answers through nginx. `main` takes squash merges only, so each pull request's title becomes its commit, and a separate check makes sure that title is a [Conventional Commit](https://www.conventionalcommits.org/).

**Options considered**

- **GitHub Actions running `nx affected`** (chosen): lives next to the code, is free for a public repo, and checks only what a change could break.
- **Every task on every pull request**: simpler, but CI time grows with the repo instead of with the change.
- **Nx Cloud** for remote caching and distributed runs: faster on a large repo, but another account and service that this repo's size doesn't need.

**Why:** nothing merges unchecked, and the history of `main` reads as one Conventional Commit per pull request.

**Trade-offs we accept:** the title check is its own workflow, so editing a title re-runs only that check. Actions are pinned to commit SHAs, so upgrading them is a deliberate change. A broken workflow file can't run CI to check itself, so a pre-commit hook checks formatting and YAML syntax locally, and a commit-msg hook checks each commit message.

**Revisit when:** CI time on a typical pull request grows enough to slow reviews; then consider remote caching.

**In the code:** `.github/workflows/ci.yml`, `.github/workflows/pr-title.yml`, the shared job setup in `.github/actions/setup/`, and the hooks in `.husky/`.
