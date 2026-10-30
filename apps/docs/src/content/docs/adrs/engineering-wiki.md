---
title: Engineering wiki
description: This wiki is an Astro Starlight site in the repo, published to GitHub Pages.
sidebar:
  order: 10
---

**Status:** Accepted · **Issue:** [#11](https://github.com/nitzanto/ratewatch/issues/11)

The engineering documentation is **this site: Astro Starlight in `apps/docs`**, published to GitHub Pages on every push to `main`.

**Options considered**

- **Starlight in the repo** (chosen): a decision, its code and its write-up change in one reviewed pull request.
- **Notion or Confluence**: easy editing for non-developers, but outside code review, so pages drift from the code they describe.
- **A separate docs repository**: its own access and release pace, but every decision change becomes two pull requests.
- **Cloudflare Pages or Netlify** for hosting: a preview per pull request, but another account and service. GitHub Pages is free for this public repo.

**Why:** the wiki is reviewed with the code it describes, so it stays true.

**Trade-offs we accept:** there's no maintained Nx plugin for Astro, so `build` and `dev` come from the project's `package.json` scripts. The site is served under `/ratewatch/`, so internal links must be relative. Mermaid diagrams render in the browser and need JavaScript.

**Revisit when:** reviewing docs changes needs a preview per pull request.

**In the code:** `apps/docs/` and `.github/workflows/docs.yml`. How to change a page is on the [overview](../../#changing-the-wiki).
