**Issue:** [<issue title>](https://github.com/nitzanto/ratewatch/issues/<n>) (closes #<n>)

## Context

<!-- 1–3 sentences: the problem or goal, and why now. -->

## What changed

<!-- One bullet per logical change, in reviewer language. Optionally one visual (tree, diff, call tree, Mermaid) under the bullets. -->

-

## Author checklist

- [ ] Lint passes: `pnpm nx affected -t lint`
- [ ] Typecheck passes: `pnpm nx affected -t typecheck`
- [ ] Tests pass: `pnpm nx affected -t test`
- [ ] Build passes: `pnpm nx affected -t build`
- [ ] E2E passes: `pnpm nx affected -t e2e`
- [ ] Formatted: `pnpm nx format:check`
- [ ] New behaviour has tests, or none is needed
- [ ] Ran the change locally and checked it does what the issue asks
- [ ] Significant decisions have an ADR; new domain terms are in `GLOSSARY.md`
- [ ] Self-reviewed the diff: no debug code, secrets or unrelated changes

## Evidence

- **Before:**
- **After:**

## Risk

**Door:** <!-- one-way | two-way, and why in one line -->
**Blast radius:** <!-- one word, then who or what is affected -->

## Monitoring

<!-- What to watch after merge, and where (CI, dashboard, logs, error tracker). "N/A: no runtime change" for tooling-only PRs. -->

## Rollback

<!-- How to undo: "revert the PR", or the extra steps. Name anything a revert does not undo. -->
