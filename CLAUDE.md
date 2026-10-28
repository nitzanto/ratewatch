# ratewatch

Distributed per-user rate limiter (NestJS + Redis) with a real-time admin dashboard.
Built production-grade: every significant decision needs an ADR with its trade-offs.

**A human is always in the loop.** Every issue is built by a developer working with an agent, and the developer validates the agent's work before it lands.

`CLAUDE.md` is the single agent instruction file for this repo. There is no `AGENTS.md`.

## Tooling

- Node: current LTS, pinned in `.node-version` (use `fnm use`).
- Package manager: pnpm.
- Work is tracked in GitHub Issues and built in vertical slices.

## Git workflow

- **Always use [Conventional Commits](https://www.conventionalcommits.org/)**: `<type>(<optional scope>): <description>`, for example `feat(rate-limit): enforce limit with atomic Lua script`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `style`, `revert`. Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.
- **Every branch starts from an issue**: `<type>/<issue-number>-<short-kebab-description>`, for example `chore/2-ai-platform`. The type uses the same vocabulary as commits.
- Never commit directly to `main`. Open a PR whose body follows `.github/pull_request_template.md`, including its `(closes #<issue-number>)` line.
- **Leave every change unstaged for manual review.** Don't stage, commit or push unless explicitly asked for that specific change; this overrides any skill that says to commit.

## Documentation

Each decision is written once, in one place. Never duplicate an ADR into the docs site by hand.

| Content                                                     | Source of truth               | Audience                                        |
| ----------------------------------------------------------- | ----------------------------- | ----------------------------------------------- |
| ADRs (`docs/adr/<area>/`), `GLOSSARY.md`                    | Repo root                     | Agents and humans. Keep them short and precise. |
| HLD, architecture walkthroughs, runbooks, how-to-run guides | `apps/docs` (Astro Starlight) | Humans. Narrative pages with diagrams.          |
| `CLAUDE.md`, `docs/agents/`                                 | Repo root                     | Agents only.                                    |

- The Starlight site renders the root ADRs and glossary through a build step that copies them in. Edit only the root files.
- Diagrams are Mermaid, so they render both on GitHub and in the docs site.
- **Why:** agents maintain ADRs through the skills (`/grill-with-docs`, `/domain-modeling`), and humans get a Notion-style site without a second copy that drifts.

## Agent skills

Skills live in `.claude/skills/` and are committed, so they apply to this repo only. They are **forked** from [mattpocock/skills](https://github.com/mattpocock/skills) at `59db609` and owned by this repo: edit them directly and don't run `npx skills update`, because it would overwrite local changes and restore removed skills.

- Kept: the engineering flow (grill → spec → tickets → implement → review → PR) plus `research`, `prototype`, `diagnosing-bugs`, `handoff`, `retro`, `wait-what`, `writing-for-agents`. `/ask-agent` (renamed from `ask-matt`) routes between them.
- Removed as not useful for this project: `setup-matt-pocock-skills` (its output lives in `docs/agents/`), `triage`, `implement-spec`, `teach`, `to-questionnaire`, `wizard`. Nothing in the kept skills references them.
- `nestjs-best-practices` is copied from [Kadajett/agent-nestjs-skills](https://github.com/Kadajett/agent-nestjs-skills) at `3986e0c` and adapted to the ADRs (Zod validation via `nestjs-zod`, Vitest, rate limiting as the product's own interceptor; microservice patterns removed). Edit it directly; don't re-copy from upstream.
- New project-specific skills go in the same folder.

### Issue tracker

GitHub Issues on `nitzanto/ratewatch`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Four labels: `needs-triage`, `needs-info`, `ready-for-development`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md`. ADRs are split by area into `docs/adr/{architecture,backend,frontend,infrastructure}/` (AI tooling goes in `infrastructure/`, anything spanning two or more areas in `architecture/`), numbered in one sequence across all areas. Every ADR links the GitHub issue it was made for, and the issue gets a comment linking back. See `docs/agents/domain.md` and `.claude/skills/domain-modeling/ADR-FORMAT.md`.
