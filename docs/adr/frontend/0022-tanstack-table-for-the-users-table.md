---
area: frontend
issue: https://github.com/nitzanto/ratewatch/issues/48
status: accepted
---

# TanStack Table for the users table, rendered with MUI's table components

The admin users table uses TanStack Table 9 (`@tanstack/react-table`, pinned to an exact version) for its state (sorting now; selection next), rendered with MUI's `Table` components, instead of the MUI X Data Grid that ADR-0005 planned. The table's behaviour is mostly custom: rows update in place from live events and flash, keep their order while the pointer is on the table (a snapshot of row IDs passed as `manualSorting` data), and cells are two-line compositions (usage bar, reset time with "in N min", status chip). A headless core gives that control without fighting a grid's own rendering, and MUI's table markup keeps the theme the single styling source.

## Considered Options

- **MUI X Data Grid (free tier)**: sorting and filtering built in, but its own cell rendering, row model and styling to override for every custom cell and the freeze, and the server already pages, sorts and filters (ADR-0020), so most of its features go unused.
- **A plain MUI `Table` with hand-written sorting and selection**: no dependency, but rebuilds sorting state, `aria-sort` and selection that TanStack Table already has.

## Consequences

- No row virtualisation: the server sends at most 100 rows a page (ADR-0020), well within plain rendering.
- TanStack Table 9 went stable in August 2026 and patches often, so the version is pinned exactly and upgraded on purpose.
- Live data comes from outside the table (the TanStack Query cache), so the component that calls `useTable` must re-render on data change and render its body inline. If the React Compiler is turned on, check TanStack/table#6601 first.
