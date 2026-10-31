---
area: frontend
issue: https://github.com/nitzanto/ratewatch/issues/8
status: accepted
---

# MUI as the UI library

The dashboard is a data-heavy admin tool: a live user table with sorting, filtering and search, detail views, admin forms and summary cards. We use MUI (Material UI) because it covers all of that with mature, accessible components, a theme system, and MUI X Data Grid, whose free tier already sorts, filters and paginates the live table. The Data Grid part is superseded by ADR-0022: the users table uses TanStack Table rendered with MUI's table components.

## Considered Options

- **Mantine**: comparable component set and a lighter styling model, but its table story relies on third-party grids.
- **shadcn/ui with Tailwind**: components copied into the repo and fully owned, but every complex widget (data grid, date pickers) has to be assembled from separate libraries.
- **Ant Design**: strong tables, but a heavier visual language that is harder to theme away from.

## Consequences

- Styling runs through Emotion (CSS-in-JS at runtime) and the MUI theme; components use the `sx` prop and theme tokens rather than separate CSS files.
