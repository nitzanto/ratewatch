---
title: Data table
description: The users table runs on TanStack Table, rendered with MUI's table components.
sidebar:
  order: 25
---

**Status:** Accepted · **Issue:** [#48](https://github.com/nitzanto/ratewatch/issues/48)

The users table is the centre of the dashboard, and most of what it does is custom: rows change in place as live events arrive and flash when they do, rows keep their order while the admin points at the table, and each cell combines several pieces (a usage bar, a reset time with "in N min", a status chip). We chose **TanStack Table 9**, a headless table library, rendered with **MUI's `Table` components**. This replaces the earlier plan to use MUI X Data Grid for this table; MUI stays the [UI library](../ui-library/).

**Options considered**

- **TanStack Table + MUI `Table`** (chosen): TanStack Table keeps the table's state (sorting, and selection next) and leaves every pixel to us; MUI's table markup keeps the theme as the one styling source.
- **MUI X Data Grid (free tier)**: sorting and filtering built in, but its own rendering and styling to override for every custom cell and for the freeze, while the server already pages, sorts and filters.
- **A plain MUI `Table` with hand-written sorting and selection**: no dependency, but rebuilds sorting state, `aria-sort` and selection that TanStack Table already provides.

**Why:** the table's value is in its live behaviour, which a grid would make us work around rather than with. A headless core gives us that control and still saves writing sorting and selection ourselves.

**Trade-offs we accept:**

- We build the table's UI ourselves: header sort buttons, checkboxes and the selection toolbar.
- No row virtualisation. The server sends at most 100 rows a page, which renders without it.
- Version 9 went stable in August 2026 and is patched often, so it is pinned to an exact version and upgraded on purpose.

**Revisit when:** a page needs more rows than plain rendering can keep smooth, or the React Compiler is turned on (check that the table re-renders when live data changes).

**In the code:** the table is `apps/web/src/features/users-table/components/users-table.tsx`: its features and columns are declared once at module level, rows are keyed by user ID (`getRowId`), sorting is controlled from `live-users.tsx` (a header asks the API for that order, and the table sorts the rows on screen the same way so live changes re-sort them), and the freeze passes the on-screen order as already sorted (`manualSorting`) while the pointer is on the table.
