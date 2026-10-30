---
title: UI library
description: The dashboard uses MUI, with MUI X Data Grid for the live user table.
sidebar:
  order: 4
---

**Status:** Accepted · **Issue:** [#8](https://github.com/nitzanto/ratewatch/issues/8)

The dashboard uses **MUI, styled with Emotion and the MUI theme, and MUI X Data Grid for the live user table**.

**Options considered**

- **MUI + MUI X Data Grid** (chosen): the grid, forms and theme from one maintained source, with strong accessibility.
- **Mantine + TanStack Table**: lighter styling, but the grid and the rest of the UI come from two projects, and we'd build the table UI on a headless core.
- **shadcn/ui + Tailwind + TanStack Table**: no runtime CSS, but we'd own the copied components and assemble the grid ourselves.
- **Ant Design**: a strong built-in table, but a heavy bundle and a visual language that's hard to restyle.

|                 | MUI + Data Grid                                       | Mantine + TanStack          | shadcn/ui + Tailwind                | Ant Design                |
| --------------- | ----------------------------------------------------- | --------------------------- | ----------------------------------- | ------------------------- |
| Data grid       | Built in (free tier)                                  | Headless: we build the UI   | Headless: we build the UI           | Built in                  |
| Performance     | Good: rows are virtualised; Emotion styles at runtime | Good: lighter styling       | Best: no runtime CSS                | Fair: heavy bundle        |
| Maintainability | Strong: one vendor for grid, forms and theme          | Fair: two projects to align | Weak: we maintain copied components | Good, but hard to restyle |
| Accessibility   | Strong                                                | Good                        | Good (Radix primitives)             | Good                      |

**Why:** the live table is the centre of the dashboard, and building the grid ourselves would put the most risk on the most important screen. shadcn/ui wins on performance, but the grid's row virtualisation keeps MUI's runtime styling cost small at our table sizes.

**Trade-offs we accept:** Emotion adds styling work to every render. Row grouping and server-side data sources are in MUI X's paid tiers; we stay on the free tier unless a later decision says otherwise.

**Revisit when:** we need a paid Data Grid feature, or the live table can't meet the render budget its design doc sets.

**In the code:** the theme and `CssBaseline` are set in `apps/web/src/main.tsx`. Components style with the `sx` prop and theme tokens, never separate CSS files.
