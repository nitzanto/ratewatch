---
name: ratewatch
description: Per-user rate limits, visible live to admins and, through Crumb the cookie, to every user.
colors:
  shell: '#0B1F33'
  shell-text: '#FFFFFF'
  shell-muted: '#AFC0D3'
  shell-raised: '#283A4C'
  shell-ok: '#3FC1A1'
  shell-down: '#F28BA6'
  ground: '#F4F6F9'
  surface: '#FFFFFF'
  surface-sunken: '#F8FAFC'
  ink: '#0F1A24'
  ink-secondary: '#52606D'
  icon: '#5F6B78'
  border-control: '#84919F'
  border: '#E2E7ED'
  divider: '#E8ECF1'
  neutral-fill: '#EDF1F5'
  accent: '#1F5BD8'
  accent-hover: '#1849B0'
  accent-tint: '#E8EFFC'
  accent-on-dark: '#9DBBF5'
  selection: '#CFE0FB'
  live-flash: '#DCE6F2'
  data-bar: '#8A9BB0'
  disabled: '#B8C1CB'
  status-ok: '#0E7C66'
  status-ok-tint: '#E3F2EE'
  status-warning: '#F5B83D'
  status-warning-strong: '#9A5B00'
  status-warning-tint: '#FEF4DC'
  status-exceeded: '#8E1B3A'
  status-exceeded-tint: '#F7E4E9'
  status-paused: '#52606D'
  crumb-dough: '#E2A75B'
  crumb-dough-bitten: '#D9A15A'
  crumb-crumbs: '#C98A45'
  crumb-crust: '#B9773A'
  crumb-highlight: '#F1C88A'
  crumb-chip: '#5B3A1F'
  crumb-face: '#3A2414'
  crumb-cheek: '#E57360'
  crumb-sweat: '#8EC5EA'
typography:
  page-title:
    fontFamily: 'IBM Plex Sans, system-ui, sans-serif'
    fontSize: '2.125rem'
    fontWeight: 600
    lineHeight: 1.235
    letterSpacing: '-0.01em'
  section-title:
    fontFamily: 'IBM Plex Sans, system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.4
  metric:
    fontFamily: 'IBM Plex Sans, system-ui, sans-serif'
    fontSize: '2rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.01em'
  count-hero:
    fontFamily: 'IBM Plex Sans, system-ui, sans-serif'
    fontSize: '3.75rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.02em'
  body:
    fontFamily: 'IBM Plex Sans, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.43
  body-large:
    fontFamily: 'IBM Plex Sans, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'IBM Plex Sans, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.43
  caption:
    fontFamily: 'IBM Plex Sans, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.66
rounded:
  sm: '4px'
  md: '6px'
  lg: '8px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
  xxl: '48px'
components:
  app-bar:
    backgroundColor: '{colors.shell}'
    textColor: '{colors.shell-text}'
    height: '64px'
  card:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.lg}'
    padding: '16px'
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.surface}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    height: '40px'
    padding: '0 16px'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    height: '40px'
    padding: '0 14px'
  filter-chip:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.pill}'
    height: '36px'
    padding: '0 14px'
  filter-chip-selected:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.surface}'
  status-chip:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.pill}'
    height: '28px'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    height: '40px'
  snackbar:
    backgroundColor: '{colors.shell}'
    textColor: '{colors.shell-text}'
    rounded: '{rounded.md}'
  drawer:
    backgroundColor: '{colors.surface}'
    width: '460px'
  crumb-clicker:
    size: '248px'
  crumb-mark:
    size: '36px'
---

# ratewatch design

## Overview

ratewatch is an operator's tool with one playful corner. The admin dashboard is **Operate** mode: calm, dense, familiar controls, colour spent only on actions, selection and status. The cookie clicker is where personality lives, through **Crumb**, a chocolate-chip cookie whose face and chips track the user's allowance.

The palette is called **Harbor**: a deep navy shell, a cool grey ground, white surfaces and a single cobalt accent. Navy is the complement of Crumb's dough, so the mascot reads instantly in the app bar. The look is built on MUI components. The theme in `apps/web/src/libs/theme/` carries these tokens (`palette.ts`, `typography.ts`, `sizes.ts`, and one override file per component in `components/`). Code never hardcodes a colour (lint enforces it), so add a new token here and in `palette.ts` first.

Prototypes for every screen are in `docs/design/prototypes/`; Crumb's artwork is in `apps/docs/public/design/crumb/`.

## Colors

- **Shell** (`shell`, navy): app bar and the sign-in welcome panel. Text on it is white; secondary text is `shell-muted`. `shell-raised` fills hovered tabs and the status pill; the pill's dot is `shell-ok` or `shell-down`; focus rings on navy use `accent-on-dark`.
- **Ground and surfaces**: the page is `ground`; cards, tables, drawers and forms are `surface` with a 1px `border`. Table headers use `surface-sunken`.
- **Text**: `ink` for content, `ink-secondary` for supporting copy (6:1 on white), `icon` for glyphs. Never use translucent black for text.
- **Accent** (`accent`, cobalt): primary buttons, selected filter chips, links, the selected row's inset bar and the keyboard focus ring. Nothing decorative is cobalt. On the navy snackbar, actions use `accent-on-dark`.
- **Status trio**, set apart by lightness so it survives colour-blindness (L\* about 46 / 79 / 31):
  - OK `status-ok` teal, under 90% used.
  - Warning `status-warning` amber for fills and bars; `status-warning-strong` for icons, chip borders and any text, because the light amber fails 3:1 on white.
  - Exceeded `status-exceeded` crimson, 100% used.
  - Paused `status-paused` grey, throttling suspended by an admin.
- Tints (`*-tint`) are only for banners and alerts that carry the same status.
- `live-flash` briefly highlights a row a live update just changed; `data-bar` fills neutral volume bars such as top users and activity.
- **Crumb's colours** (`crumb-*`) belong to the mascot only and never appear in UI chrome.

All text pairs pass WCAG AA 4.5:1; status icons and control borders pass 3:1.

## Typography

One family: **IBM Plex Sans** (400, 500, 600, 700), self-hosted with `@fontsource/ibm-plex-sans` or loaded from Google Fonts, falling back to `system-ui`. Headings are semibold (600), never light. Numbers in tables, counts and timers use `font-variant-numeric: tabular-nums`. Buttons and tabs are sentence case, not uppercase. No small uppercase eyebrow labels above headings: the heading carries its own weight.

## Layout

- App shell: 64px navy app bar with the Crumb mark, product name, tabs (Dashboard, Cookie clicker) and one status pill on the right ("Live · API OK", "Reconnecting · API OK", "API unreachable"). Content is centred at 1240px max with 24px side padding.
- Dashboard: title row; four summary cards in an auto-fit grid (min 220px); the users table (flex 999 1 640px) beside a side column (flex 1 1 300px) of Status breakdown and Top users. The table scrolls inside its own box.
- Clicker: a centred 880px column with one card holding Crumb, the count, the usage bar and a fixed-height message slot.
- Sign-in: a split page, navy welcome panel with waving Crumb on the left, the form on the right (max 380px).
- Spacing is an 8px grid (`spacing` tokens).
- Desktop only: every screen is designed for desktop browser windows 1280px and wider. There are no phone or tablet layouts or breakpoints.

## Elevation & Depth

Flat by default: surfaces are separated by 1px borders, not shadows. Shadows are reserved for things that float over the page: the drawer (`-8px 0 24px rgba(15,26,36,0.16)`) and the snackbar (`0 6px 20px rgba(15,26,36,0.24)`). The drawer sits over a `rgba(11,31,51,0.32)` scrim.

## Shapes

Radius 8px for cards and drawers, 6px for buttons, inputs, banners and toasts, pills for chips, circles for avatars and icon buttons. Icons are Material Icons (filled), 18 to 24px.

## Components

- **Status chip**: outlined pill with the status icon in the status colour and the label in `ink`. Status never relies on colour alone.
- **Filter chips**: OK, Warning, Exceeded, Paused and All, each with a live count derived from the data. Selected chips fill with `accent`.
- **Users table**: checkbox, user (with "Custom limit" caption), remaining / total with a usage bar, resets (clock time plus "in N min"), status, last request. Every header is a sort button with `aria-sort`. Live updates change values in place; the table re-sorts only while the pointer is off it and no user is open. A changed row flashes `live-flash` and fades over 1.6s.
- **Selection toolbar**: ticking rows swaps the filter row for a selection bar of the same 48px height ("3 users selected", Reset their limits, Clear selection), so the table never moves.
- **User drawer**: 460px dialog from the right with stats, Past hour / Past day activity (accepted vs refused), recent requests and admin controls. Esc, the close button or the scrim closes it; focus moves to the close button on open.
- **Admin controls**: Reset limit and Add 10 requests are secondary buttons; Pause asks for a duration (15 minutes, 1 hour, until the next reset) and shows "Paused until HH:MM"; Save limit is the one primary action and warns inline when the new limit is below what the user already used. Every change shows a snackbar with Undo for 10 seconds.
- **States**: connection lost (grey banner, timestamps frozen), API unreachable (crimson-tint panel with Retry), no users (empty state with Crumb and a link to the clicker).
- **Crumb** (the mascot), as one component with a status prop, honouring `prefers-reduced-motion`:
  - OK has five stages, one per 20 requests used; he drops a chocolate chip at each, so his chips are a rough gauge of what's left: Fresh (5 chips), Warming up (4), Excited (3), Focused (2), Tired (1, slower bob).
  - Warning (90%+): wide eyes, worried brows, sweat drop, one chip, a nervous jitter in short bursts every 4s.
  - Exceeded (100%): a bite out of the top right, no chips, crossed-out eyes, crumbs.
  - During a 429 wait the bite grows back as a teal ring fills; at halfway his eyes rest; when the allowance resets he hops and a "Welcome back" note shows.
  - Click: squash to 90 × 84% and settle in 250ms with a "−1" float. The request fires on click, never after the animation.
  - Technique: inline SVG with CSS keyframes; no animation library.
- **Clicker message slot**: a fixed-height area below the bar for the hint, milestone notes, the warning, the refusal and the welcome-back note, so Crumb never moves under the pointer.

## Do's and Don'ts

- Do keep cobalt for actions, selection and focus only.
- Do pair every status colour with an icon and a word.
- Do update live data in place; never reorder or insert content above what the user is pointing at.
- Do give every admin action an Undo or a confirmation, and show durations as clock times.
- Do label prototype numbers as sample data; never invent metrics.
- Don't use MUI's default blue, Roboto, or uppercase buttons.
- Don't use the light amber for text or icons on white.
- Don't put status colour on Crumb's body; status sits beside him.
- Don't add emoji to the UI; use Material Icons.
