---
title: Unit tests
description: Every project tests with Vitest.
sidebar:
  order: 6
---

**Status:** Accepted · **Issue:** [#7](https://github.com/nitzanto/ratewatch/issues/7)

Every project tests with **Vitest**. The API adds `unplugin-swc`, because Vitest's default transform drops the decorator metadata NestJS's dependency injection reads.

**Options considered**

- **Vitest everywhere** (chosen): one runner and one config style. It's Vite's own runner for the web app, and NestJS itself now defaults to it.
- **Each generator's default** (Jest for the API, Vitest for the web app): where we started, but two runners and two config styles for no gain.

**Why:** one runner across the repo, with nothing lost on either app.

**Trade-offs we accept:** the API's tests depend on the SWC plugin to keep decorator metadata.

**In the code:** each project's `vitest.config.mts` or `vite.config.mts`. How each app is tested is in [Backend architecture](../../architecture/backend/#testing) and [Frontend architecture](../../architecture/frontend/#testing).
