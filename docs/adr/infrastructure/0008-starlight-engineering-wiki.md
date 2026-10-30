---
area: infrastructure
issue: https://github.com/nitzanto/ratewatch/issues/11
status: accepted
---

# Starlight engineering wiki over Notion or Confluence

The human-facing engineering wiki (ADRs, HLD, design docs, guides) is an Astro Starlight site in `apps/docs`, a plain Nx project built from its `package.json` scripts and published to GitHub Pages on push to `main`. Docs live next to the code so a decision, its code and its write-up change in one reviewed PR. Repo ADRs stay short for agents. The wiki has one kickoff page (goals, quality-attribute priorities, principles, decision log) where every decision gets a row linking to its own wiki ADR page. Stack and tooling decisions use a short template (options, why, trade-offs, revisit when); runtime design decisions (rate-limit store and algorithm, realtime delivery, auth, failure modes) use a long-form MADR-style template with a full trade-off matrix and diagrams. All of them change in the same PR.

## Considered Options

- **Notion or Confluence**: easy editing for non-developers, but outside code review, so pages drift from the code they describe.
- **The site rendering the repo ADRs** (a copy-in build step): one source, but agent-focused records make thin reading for developers, and long-form ones cost agents context.
- **Every decision written up on the kickoff page**: one place to read, but at a dozen decisions the page passed 300 lines, and it grows without limit.
- **Only major decisions get a wiki ADR, the rest a log row**: fewer pages, but minor decisions (Nx, Vitest, MSW) lost their options and trade-offs entirely.
- **A separate docs repo**: its own access and release pace, but every decision change becomes two PRs.
- **Cloudflare Pages or Netlify**: a preview per PR, but another account and service. GitHub Pages is free for this public repo; switch if docs review needs previews.

## Consequences

- A decision is recorded in more than one place and can drift; the PR checklist requires updating all of them.
- No Nx plugin for Astro (`@nxtensions/astro` is unmaintained): `build`/`dev` come from `package.json` scripts, with `dist` declared as the build output. Typecheck is a no-op because Astro's tsconfig sets `noEmit`.
- The site is served under `/ratewatch/`, so `astro.config.mjs` sets `base`; internal links must be relative or base-aware.
- Mermaid renders client-side through `astro-mermaid`, so diagrams need JavaScript in the reader's browser.
