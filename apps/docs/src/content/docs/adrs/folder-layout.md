---
title: Folder layout
description: The dashboard's source is split by layer, not by feature, with one working example in every layer.
sidebar:
  order: 14
---

**Status:** Accepted · **Issue:** [#31](https://github.com/nitzanto/ratewatch/issues/31)

Every upcoming dashboard feature needs the same plumbing: an API call, a cached query, a hook, a component, a mock and a test. Without a shared shape, the first feature to land would set the pattern by accident. We split `apps/web/src` **by layer** (`pages/`, `components/`, `hooks/`, `libs/`, `mocks/`, …), and every layer holds one working example, so a feature starts by copying the example next to it.

**Options considered**

- **Layers** (chosen): one place for each kind of code, and one example per kind to copy.
- **Feature folders** (`features/users/…`): keep a feature's files together, but the dashboard is one domain. The live table, user detail, search and analytics all read the same users and rate-limit status, so most code would end up in a shared folder anyway, and every feature would draw its own line between "mine" and "shared".

**Why:** the features share their data far more than they differ, and a layer with a working example is a template a developer or an agent can follow without inventing anything.

**Trade-offs we accept:** one feature's files are spread across several folders, so a change to a feature touches several of them. An `@/` import alias keeps those cross-layer imports readable.

**Revisit when:** the dashboard grows parts that share little data with the rest, where a feature folder would keep them apart.

**In the code:** the tree and what each layer holds are in [Frontend architecture](../../architecture/frontend/#structure). The `@/` alias is set in `apps/web/tsconfig.app.json`, `apps/web/tsconfig.spec.json` and `apps/web/vite.config.mts`.
