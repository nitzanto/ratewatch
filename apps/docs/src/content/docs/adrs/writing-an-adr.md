---
title: Writing an ADR
description: Every decision gets an ADR page and a decision-log row; which template to use.
sidebar:
  order: 99
---

Every decision gets its own ADR page under `apps/docs/src/content/docs/adrs/`, and a row in the [decision log](../architecture-decisions/#decision-log) linking to it. One page per decision keeps each page short and focused, and lets each decision be superseded on its own. Which template to use depends on what it decides:

- **Stack and tooling decisions** use the short template: frameworks, libraries, test runners, CI, repository layout. They rarely need a diagram, and a reader wants the options and the reason, fast.
- **Runtime design decisions** use the full template: how the product behaves when it runs, such as the rate-limit store and algorithm, realtime delivery, authentication and failure modes. They carry the most risk, and need room for diagrams and a full trade-off matrix.

ADRs are written in the same pull request that makes the decision. When a decision changes, update its page and its log row in that pull request. Mark a replaced ADR **Superseded** with a link to its successor, rather than deleting it.

## Short template

Include the matrix only when options differ on more than one quality attribute, with only the rows that separate them. Leave out "Revisit when" if there's no known trigger.

```md
---
title: <The decision area, e.g. "Unit tests">
description: <One line: what was decided>
sidebar:
  order: <next number in the ADRs section>
---

**Status:** Accepted · **Issue:** [#<n>](https://github.com/nitzanto/ratewatch/issues/<n>)

The context in a sentence or two, then **what we chose**.

**Options considered**

- **<Option A>** (chosen): what it gives us.
- **<Option B>**: what it offers, and why it lost.

**Why:** the reasons that decided it.

**Trade-offs we accept:** what the choice costs us.

**Revisit when:** the condition that would reopen it.

**In the code:** modules, config files, commands.
```

## Full template

The template follows [MADR](https://adr.github.io/madr/), with a trade-off matrix that always rates each option on the five quality attributes we optimise for. If an attribute isn't affected, say so in the cell, so readers can see it was considered.

```md
---
title: <The decision area, e.g. "Rate-limit store">
description: <One line: what was decided>
sidebar:
  order: <next number in the ADRs section>
---

**Status:** Proposed | Accepted | Superseded by [<ADR>](…) · **Date:** YYYY-MM-DD · **Issue:** [#<n>](https://github.com/nitzanto/ratewatch/issues/<n>)

## Context and problem statement

What problem are we solving, what forces are at play, and why decide now? End with the question
the decision answers.

## Decision drivers

The requirements and constraints that decide it, including which quality attributes matter most.

## Considered options

1. <Option A>
2. <Option B>

## Trade-off matrix

|                 | <Option A> | <Option B> |
| --------------- | ---------- | ---------- |
| Scalability     |            |            |
| Performance     |            |            |
| Reliability     |            |            |
| Security        |            |            |
| Maintainability |            |            |
| <driver>        |            |            |

## Decision outcome

Chosen option: **<Option>**, because <reasons, pointing at the rows that decided it>.

### Consequences

- Good, because …
- Bad, because …

### Confirmation

How we'll know the decision holds: a test, a CI check, a metric, or a condition to revisit it.

## Notes on the options

Only what doesn't fit in a cell, such as why a high-scoring option was still rejected.

## In the code

Where the decision lives: modules, config files, commands.
```
