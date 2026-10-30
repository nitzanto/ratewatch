---
title: Design skill
description: The Impeccable design skill is copied into the repo at a pinned commit.
sidebar:
  order: 16
---

**Status:** Accepted · **Issue:** [#32](https://github.com/nitzanto/ratewatch/issues/32)

The coding agent uses **[Impeccable](https://github.com/pbakaus/impeccable)** for design work: setting the design direction, critiquing a screen against usability heuristics, auditing contrast and accessibility, and polishing before a release. It is **copied into `.claude/skills/impeccable/` at commit `df3a4ab` and owned by the repo**, like the other agent skills, without the installer's editor hooks or update channel.

**Options considered**

- **Copy at a pinned commit** (chosen): the skill's rules change only in a reviewed pull request, and everyone who clones the repo gets the same version.
- **`npx impeccable install`**: adds an edit hook that runs a detector after every UI change and keeps the skill updatable, so its behaviour can change without review.
- **No design skill**: design decisions would live only in prose, with no shared way to review a screen.

**Why:** design guidance steers every screen the agent builds, so it should change only through review, like the code it shapes.

**Trade-offs we accept:**

- Upstream improvements need a manual port.
- The skill downloads its engine binary on first use, so it needs network access to GitHub once per machine.
- Its anonymous usage reporting has to be switched off per machine with `.claude/skills/impeccable/scripts/impeccable telemetry off`.
- UI prototypes (trying a few layouts for a screen) go through Impeccable. The general `prototype` skill now covers only logic: a clickable demo of a state model or business rule.

**In the code:** `.claude/skills/impeccable/`, with the design direction in `PRODUCT.md` and `DESIGN.md` at the repo root. The human-facing summary is the [Design](../../design/) page.
