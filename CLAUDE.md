# ratewatch

Distributed per-user rate limiter (NestJS + Redis) with a real-time admin dashboard.
Built production-grade: every significant decision needs an ADR with its trade-offs.

**A human is always in the loop.** Every issue is built by a developer working with an agent, and the developer validates the agent's work before it lands.

`CLAUDE.md` is the single agent instruction file for this repo. There is no `AGENTS.md`.

## Tooling

- Node: current LTS, pinned in `.node-version` (use `fnm use`).
- Package manager: pnpm.
- ESLint stays on 9: `eslint-plugin-react` (used by Nx's React lint config) crashes on ESLint 10. Upgrade once it supports 10.
- Work is tracked in GitHub Issues and built in vertical slices.

## Running the app and e2e

- **Reuse the Compose stack, leave clean.** Before serving the app or running e2e, check what listens on 3000 (API), 4200 (web) and 6379 (Redis). If it's this repo's Compose stack (`docker compose ls`) or nothing, run `docker compose up -d --wait` either way. Don't rely on Compose Watch: the stack may run without it, and then it serves old code. `pull_policy: build` makes `up` rebuild from the working tree and recreate only the containers whose code changed, keeping Redis and its data. Ask the developer about anything else on those ports: Playwright reuses whatever answers there, so a mock-mode web server turns e2e red at sign-in.
- **Run e2e against that stack** with `pnpm nx run ratewatch-e2e:e2e --exclude-task-dependencies`. Without the flag Nx starts its own `nx serve api` and `nx serve web`, which wait forever for the ports the stack holds. Serve the app only through Compose, so every server is one `docker compose down` away. When done, run `docker compose down` only if you started the stack.

## Git workflow

- **Always use [Conventional Commits](https://www.conventionalcommits.org/)**: `<type>(<optional scope>): <description>`, for example `feat(rate-limit): enforce limit with atomic Lua script`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `style`, `revert`. Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.
- **Every branch starts from an issue**: `<type>/<issue-number>-<short-kebab-description>`, for example `chore/2-ai-platform`. The type uses the same vocabulary as commits.
- Never commit directly to `main`. Open a PR whose body follows `.github/pull_request_template.md`, including its `(closes #<issue-number>)` line.
- **Leave every change unstaged for manual review.** Don't stage, commit or push unless explicitly asked for that specific change; this overrides any skill that says to commit.

## Documentation

Documentation has two layers, each written for its reader:

| Content                                                             | Where                                                                             | Audience                              |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| Repo ADRs (`docs/adr/<area>/`), `GLOSSARY.md`                       | Repo root                                                                         | Agents. Short and precise.            |
| Wiki: feature specs, architecture, ADRs, design docs (LLDs), guides | `apps/docs` (Astro Starlight, published to https://nitzanto.github.io/ratewatch/) | Developers. Long-form, with diagrams. |
| `CLAUDE.md`, `docs/agents/`                                         | Repo root                                                                         | Agents only.                          |

- A significant decision gets a repo ADR (through `/domain-modeling`) and a row in the wiki's decision log (`apps/docs/src/content/docs/adrs/architecture-decisions.md`). It also gets its own wiki ADR page, linked from that row: the short template for a stack or tooling decision (framework, library, test runner, CI, repo layout), the full one for a runtime design decision (rate-limit store or algorithm, realtime delivery, auth, failure modes). Both templates are in `adrs/writing-an-adr.md`. When a decision changes, update all of them in the same PR, along with any wiki page that describes the changed behaviour.
- Feature specs (`apps/docs/src/content/docs/features/`) are product-level and non-technical; keep a feature's status current when it ships.
- Wiki pages stand on their own: they explain their subject fully and point to code (modules, config, commands) where it helps. They never cite repo ADRs, `CLAUDE.md` or `docs/agents/`.
- Diagrams are Mermaid, so they render both on GitHub and in the wiki.
- **Why:** agents need short, precise records, and developers need the full story. The wiki replaces an external Notion or Confluence, so it's reviewed in the same PR as the code it describes.

## Agent skills

Skills live in `.claude/skills/` and are committed, so they apply to this repo only. They are **forked** from [mattpocock/skills](https://github.com/mattpocock/skills) at `59db609` and owned by this repo: edit them directly and don't run `npx skills update`, because it would overwrite local changes and restore removed skills.

- Kept: the engineering flow (grill → spec → tickets → implement → review → PR) plus `research`, `prototype`, `diagnosing-bugs`, `handoff`, `retro`, `wait-what`, `writing-for-agents`. `/ask-agent` (renamed from `ask-matt`) routes between them. `prototype` keeps only its logic branch; UI prototyping goes to `impeccable`.
- Removed as not useful for this project: `setup-matt-pocock-skills` (its output lives in `docs/agents/`), `triage`, `implement-spec`, `teach`, `to-questionnaire`, `wizard`. Nothing in the kept skills references them.
- `nestjs-best-practices` is copied from [Kadajett/agent-nestjs-skills](https://github.com/Kadajett/agent-nestjs-skills) at `3986e0c` and adapted to the ADRs (Zod validation via `nestjs-zod`, Vitest, rate limiting as the product's own interceptor; microservice patterns removed). Edit it directly; don't re-copy from upstream.
- `nx-workspace`, `nx-generate`, `nx-run-tasks`, `nx-plugins` and `link-workspace-packages` are copied from [nrwl/nx-ai-agents-config](https://github.com/nrwl/nx-ai-agents-config) at `d36b530` and pointed at pnpm. The Nx plugin and MCP server are not used (they mostly serve Nx Cloud, and auto-update outside review); don't run `nx configure-ai-agents`.
- `playwright-cli` drives a real browser: check a page by hand (the web app, mock mode, a bug repro), take snapshots or screenshots, and draft Playwright tests. Run it as `pnpm exec playwright-cli` (a root devDependency, not global). The skill is generated by `pnpm exec playwright-cli install --skills`; re-run that after upgrading `@playwright/cli` instead of editing it.
- `no-use-effect` is copied from [trycompai/crm](https://github.com/trycompai/crm/tree/2fa1a91/.agents/skills/no-use-effect) at `2fa1a91` and adapted (Nx commands, TanStack Query query-options hooks, const arrow functions). It backs the `no-restricted-syntax` rule in `apps/web/eslint.config.mjs` that bans calling `useEffect`. Edit it directly; don't re-copy from upstream.
- `impeccable` is copied from [pbakaus/impeccable](https://github.com/pbakaus/impeccable) at `df3a4ab` (see `.claude/skills/impeccable/VENDORED.md`), without the installer's hooks or update channel. Use it for any UI work: it reads `PRODUCT.md` and `DESIGN.md` at the repo root, which are the design source of truth. Don't run `npx impeccable install` or `update`. Turn its usage reporting off once per machine with `.claude/skills/impeccable/scripts/impeccable telemetry off`.
- New project-specific skills go in the same folder.

### Issue tracker

GitHub Issues on `nitzanto/ratewatch`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Four labels: `needs-triage`, `needs-info`, `ready-for-development`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md`. ADRs are split by area into `docs/adr/{architecture,backend,frontend,infrastructure}/` (AI tooling goes in `infrastructure/`, anything spanning two or more areas in `architecture/`), numbered in one sequence across all areas. Every ADR links the GitHub issue it was made for, and the issue gets a comment linking back. See `docs/agents/domain.md` and `.claude/skills/domain-modeling/ADR-FORMAT.md`.

## Working with Nx

- Explore projects, targets and dependencies with the `nx-workspace` skill; scaffold with the `nx-generate` skill, before writing files by hand.
- Run tasks through Nx (`pnpm nx run`, `run-many`, `affected`), never the underlying tool directly, so caching and task dependencies apply.
- Check `--help` for a command or generator instead of guessing flags.
