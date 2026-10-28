---
name: pr
description: "Use when writing a PR body."
metadata:
  credits:
    skill: show-me
    author: Dex Horthy
    organisation: Humanlayer
    url: "https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md"
---

Fill in [`.github/pull_request_template.md`](../../../.github/pull_request_template.md): it is the single source of the PR body's sections and order. Every section stays; one that doesn't apply gets a one-line "N/A: <reason>". Ask the user before rewriting the body of a PR that is already open.

The body is **high-level**: a reviewer who has never seen the issue gets the story in one read. No preamble, short bullets, the domain language from `GLOSSARY.md`. Write requirements as the project's own, with no reference to where they came from.

## Sections

**Issue**: the issue's title linked to its URL, followed by `(closes #<n>)`. The `closes` keyword is what makes merging close the issue; the link alone does not.

**Context**: the problem or goal and why now, in 1–3 sentences.

**What changed**: one bullet per logical change, phrased as what the reviewer gets, not as file names. Add at most one visual under the bullets when it shows the shape faster than prose, and pick the smallest that fits:

- logic or an algorithm → pseudocode
- runtime control flow → a call tree
- UI structure → a component tree with the state and module boundaries that matter
- file responsibility or a broad refactor → a shallow file tree
- interaction or data flow between parts → Mermaid
- a change to a shape that already exists → a `diff` block of that shape (component tree, file tree, call tree or control flow)

**Author checklist**: tick a box only after running that check in this session, and leave the rest unticked. Replace the box with "N/A: <reason>" when a check cannot apply (for example no projects exist yet).

**Evidence**: a before and after a reviewer can trust. Screenshots are best for visual changes; otherwise command output or the exact test that fails before and passes after, as pseudocode.

**Risk**: **Door** is two-way when a revert fully undoes the PR, and one-way when it involves destructive actions, data changes or decisions that are hard to walk back. **Blast radius** is one word for who or what the PR can affect (consumers, contributors, layout, data), plus one line.

**Monitoring**: what to watch after merge and where to look, for example CI checks, a metric or dashboard, logs or the error tracker.

**Rollback**: the concrete undo. A one-way door names what a revert leaves behind and the steps to clean it up.
