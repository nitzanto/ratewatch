---
title: Agent skills
description: The coding agent's skills are forked into the repo and owned there.
sidebar:
  order: 11
---

**Status:** Accepted · **Issue:** [#2](https://github.com/nitzanto/ratewatch/issues/2)

Every issue is built by a developer working with a coding agent. The agent's workflow skills (grilling a plan, writing a spec, splitting tickets, test-driven implementation, review, writing the PR) are **copied from [mattpocock/skills](https://github.com/mattpocock/skills) into `.claude/skills/` and owned by the repo**: trimmed to what we use and edited directly.

**Options considered**

- **Fork into the repo** (chosen): committed, so the workflow is reviewed like code and the same for everyone who clones the repo.
- **A Claude Code plugin**: updates itself, but lives outside the repo, can't be trimmed or edited, and only exists for people who install it.
- **Copy and keep syncing with `npx skills update`**: every update restores the skills we removed and overwrites our edits.

**Why:** a trimmed, edited set of skills only stays that way if updates can't overwrite it.

**Trade-offs we accept:** upstream improvements no longer arrive on their own. To adopt one, diff the upstream skill against ours and port the change by hand.

**In the code:** `.claude/skills/`.
