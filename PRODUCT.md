# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Admins** (operators of the protected service): watch every user's usage live, spot who is close to or over their limit, and act on a user (reset, top up, pause throttling, set a custom limit). They work at a desk in a browser and keep the dashboard open for long stretches.
- **Regular users**: anyone with a user ID who sends requests to the protected service. In this product they meet the rate limiter through the cookie clicker demo.

## Product Purpose

ratewatch is a distributed per-user rate limiter (NestJS + Redis) with a real-time admin dashboard. Each user gets 100 requests per hour, keyed by user ID and never by IP or device. Success means the limit holds exactly under concurrent load, admins can see and correct usage the moment it changes, and a user always knows how many requests they have left and when they can try again.

## Positioning

The limit is visible from both sides: admins see every user against their allowance live, and a regular user sees their own count fall with every request, through Crumb, the cookie mascot whose mood and chocolate chips track their remaining allowance.

## Operating Context

- Admin dashboard (`/`): summary cards, live user table, user detail drawer with admin controls, status breakdown, top users.
- Cookie clicker (`/play`): every click is one `POST` request; the `x-count` header on each success carries requests left; a 429 body carries a message and `retryAt`.
- Admins land on the dashboard, regular users on the clicker (decided with auth, issue #35).
- Development runs in Docker Compose or natively, with a mock mode (MSW) that needs no API.

## Capabilities and Constraints

- Allowance: 100 requests per user per hour unless an admin sets a custom limit.
- Status: OK under 90% used, Warning at 90% or more, Exceeded at 100%. Paused: throttling suspended by an admin.
- Stack: React 19 + Vite, MUI, TanStack Query, React Router (planned), Socket.IO for realtime (proposed).
- Undecided: fixed clock hour versus rolling hour; fail-open versus fail-closed when the store is down; real login versus demo sign-in (#35); how long a pause lasts by default.

## Brand Commitments

- Name: ratewatch, always lowercase.
- Mascot: Crumb, a chocolate-chip cookie. His moods map one-to-one to rate-limit status and he keeps his own warm colours on every palette.
- Visual direction: the Harbor palette and IBM Plex Sans, recorded in `DESIGN.md`.

## Evidence on Hand

- Design canvas prototypes: `docs/design/prototypes/` (dashboard, clicker, sign-in, character sheet, palette options).
- Crumb artwork: `apps/docs/public/design/crumb/`.
- No real usage data, customers, testimonials or metrics exist. Dashboard numbers in prototypes are sample data and must be labelled as such.

## Product Principles

1. The limit is never a surprise: show what is left on every success and when it comes back on every refusal.
2. Status is never colour alone: every status has an icon and a word.
3. Nothing moves under the pointer: live data updates in place.
4. Every admin action is reversible for a short time or asks first.
5. Delight lives in the clicker and Crumb; the dashboard stays calm and precise.
