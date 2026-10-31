---
title: Cookie Clicker
description: A playful page where every click spends one request, so anyone can see the rate limit from a user's side.
sidebar:
  order: 7
---

**Status:** Shipped (mock mode). The clicks run against a mock API until the real rate limiting arrives.

## Summary

The cookie clicker lets anyone experience [rate limiting](../rate-limiting/) from a user's side. Every click on Crumb, the cookie, is one request against the user's hourly allowance. The user watches their requests-left count fall, sees Crumb change as they spend it, and gets a clear message and a countdown when they hit the limit.

## What users can do

- As a user, I can click the cookie, and each click counts as one request.
- As a user, I can see how many requests I have left after every successful click.
- As a user, I can tell roughly how much is left at a glance: Crumb drops one of his five chocolate chips every 20 requests.
- As a user, I can see Crumb get nervous near my limit and bitten when I reach it.
- As a user who hits the limit, I can see a clear message saying so and a countdown to when I can click again.
- As a user, I'm welcomed back when my allowance resets.
- As a user who prefers reduced motion, I can use the clicker with Crumb standing still.
- As a keyboard or screen-reader user, I can use the cookie as a normal button and hear my requests-left count.

## Rules

- One click is one request, against the same allowance as every other request: 100 per hour unless an admin set a custom limit.
- Crumb's mood follows the user's status: OK under 90% used, Warning at 90% or more, Exceeded at 100%.
- While OK, Crumb has five stages, one per 20 requests used: Fresh, Warming up, Excited, Focused and Tired. Each stage change shows a short note.
- When the user has no requests left, the next click is refused and clicking pauses until the time in the refusal. During the wait, a ring fills and Crumb's bite grows back.
- The count shown always comes from the server's response, never from the page's own tally. When the server can't say, the page says "Limit unavailable" and Crumb shows no chips, rather than an old number.
- Leaving the page during a wait doesn't end it: clicking is still paused on return.
- Animations never delay a request, and the cookie stays usable with animations turned off.

## Out of scope

- Scores, leaderboards or rewards for clicking.
- Buying or earning extra requests.

## Open questions

- With the real one-hour wait, is the growing-back bite slow enough to feel stuck? Crumb may need a coarser cue, such as one crumb returning every 10 minutes.
- Can a signed-out visitor try the clicker as a guest, and if so, what user ID do they get? (Decided with authentication.)
