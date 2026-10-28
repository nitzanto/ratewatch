# Triage Labels

The skills speak in terms of four canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker    | Meaning                                  |
| -------------------------- | ----------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`          | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`            | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-development` | Specified and agreed; ready to implement |
| `wontfix`                  | `wontfix`               | Will not be actioned                     |

Upstream also has `ready-for-human`. This repo merges it into `ready-for-development`: every issue is built by a developer working with an agent, so the split carries no information.

When a skill mentions a role (e.g. the upstream `ready-for-agent` role), use the corresponding label string from this table.
