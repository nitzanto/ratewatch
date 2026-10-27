# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/adr/architecture/`** always, plus the area folder you're about to work in (`backend/`, `frontend/` or `infrastructure/`). Each ADR's frontmatter links the GitHub issue it was made for.

If `GLOSSARY.md` or an ADR doesn't exist yet, **proceed silently**. Don't flag its absence; don't suggest creating it upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them when terms or decisions actually get resolved, following `.claude/skills/domain-modeling/ADR-FORMAT.md`.

## File structure

Single domain context, ADRs split by area and numbered in one sequence across all areas:

```
/
├── GLOSSARY.md
└── docs/adr/
    ├── architecture/      ← affects two or more areas
    ├── backend/           ← NestJS API
    ├── frontend/          ← web dashboard
    └── infrastructure/    ← Docker, CI, observability, docs site, AI tooling
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
