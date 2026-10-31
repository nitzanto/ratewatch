---
title: Admin controls
description: Reset, adjust or pause a user's limit, or add extra requests.
sidebar:
  order: 4
---

**Status:** Shipped.

## Summary

The actions an admin can take on a user's limit, from the user's detail page, and on several users at once from the users table.

## What users can do

- As an admin, I can **reset** a user's limit, so their count starts again from zero and their next request starts a new hour.
- As an admin, I can tick several users in the table and **reset their limits** together.
- As an admin, I can **add 10 extra requests** to a user's limit for the current hour only.
- As an admin, I can **adjust** a user's limit to a custom number of requests per hour, between 1 and 1,000, and see a warning before I save one below what they've already used this hour.
- As an admin, I can **pause** a user's limit for 15 minutes, 1 hour or until their next reset, see when the pause ends, and **unlock** it again early.

## Rules

- Every change takes effect immediately and shows up live on the dashboard, for every admin watching that user.
- Extra requests last only until the user's count next resets, and only exist while the user has an hour running.
- No limit, custom or with extra requests, goes above 1,000 requests.
- A custom limit applies from the user's next request and in every hour after, until an admin sets it back to 100. Extra requests in the current hour stay on top of it. The users table marks each user who has one.
- While a user is paused, their requests still count but none is refused, and their status reads Paused until the time shown, in the admin's own time zone. The pause ends by itself; unlocking ends it early.
- Ticking users swaps the filters for a selection bar of the same height, so the table never moves. A bulk reset takes at most the 100 users of one page.
- Only admins can use these controls.

## Out of scope

- Changing the default limit for all users at once.
- A record of who changed what.
