---
area: infrastructure
issue: https://github.com/nitzanto/ratewatch/issues/32
status: accepted
---

# Vendor the Impeccable design skill at a pinned commit

The `impeccable` design skill (critique, audit, polish, colorize, delight and the rest of its commands) is copied from [pbakaus/impeccable](https://github.com/pbakaus/impeccable) into `.claude/skills/impeccable/` at `df3a4ab`, the generated Claude Code provider folder, with its `LICENSE` and `NOTICE.md` (Apache 2.0) and a `VENDORED.md` naming the commit. It sets and checks the design direction recorded in `PRODUCT.md` and `DESIGN.md` at the repo root. We did not run `npx impeccable install`: it adds provider hooks (an edit hook that runs the detector after every UI edit) and an update channel, and both would change agent behaviour outside review. The skill's `scripts/impeccable` launcher downloads a checksum-verified engine binary for the pinned engine version on first use; binaries are never committed.

## Considered Options

- **`npx impeccable install`**: installs hooks and keeps the skill updatable, so the skill and its rules can change without a pull request.
- **No design skill**: design decisions would live only in prose, with no shared critique or audit vocabulary for agents and reviewers.

## Consequences

- Upstream changes don't arrive on their own. To adopt one, diff upstream's `.claude/skills/impeccable/` against ours at a new commit and port it in one pull request, updating `VENDORED.md`.
- The engine's roll API sends anonymous usage data unless turned off. Run `.claude/skills/impeccable/scripts/impeccable telemetry off` once per machine, or set `IMPECCABLE_NO_TELEMETRY=1`.
- UI prototyping moves to Impeccable (`shape`, `generate`, `live`): the forked `prototype` skill drops its UI branch and keeps only logic prototypes, which Impeccable doesn't cover.
- Impeccable writes runtime state under `.impeccable/`; its own `.gitignore` files keep the runtime parts out of commits.
