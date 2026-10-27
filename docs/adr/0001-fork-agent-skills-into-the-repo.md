# Fork the agent skills into the repo instead of tracking upstream

The agent skills come from [mattpocock/skills](https://github.com/mattpocock/skills). We copied them into `.claude/skills/` at upstream `59db609` and own them from here, rather than installing the auto-updating Claude Code plugin or re-syncing with `npx skills update`. We removed the skills this project doesn't use (`setup-matt-pocock-skills`, `triage`, `implement-spec`, `teach`, `to-questionnaire`, `wizard`), renamed the router to `ask-agent`, and edited the kept skills so they don't reference the removed ones. A trimmed, edited set only stays that way if updates can't overwrite it, and committing the skills makes the AI workflow reviewable and identical for anyone who clones the repo.

## Considered Options

- **Claude Code plugin**: updates itself, but lives outside the repo, can't be trimmed or edited, and only exists for people who install it.
- **Copy and keep syncing with `npx skills update`**: would restore removed skills and overwrite our edits on every update.

## Consequences

Upstream improvements no longer arrive automatically. To adopt one, diff the upstream skill against ours and port the change by hand.
