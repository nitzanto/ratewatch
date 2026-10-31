---
title: Admin controls
description: Reset, adjust, pause or top up a user's limit.
sidebar:
  order: 4
---

**Status:** Partly shipped: reset limit (one user or several) and extra requests. Custom limit, pause and unlock are planned.

## Summary

The actions an admin can take on a user's limit, from the user's detail page, and on several users at once from the users table.

## What users can do

- As an admin, I can **reset** a user's limit, so their count starts again from zero and their next request starts a new hour.
- As an admin, I can tick several users in the table and **reset their limits** together.
- As an admin, I can **add 10 extra requests** to a user's limit for the current hour only.
- As an admin, I can **adjust** a user's limit to a custom number of requests per hour, between 1 and 1,000. _(Planned)_
- As an admin, I can **pause** a user's limit for 15 minutes, 1 hour or until their next reset, and **unlock** it again early. _(Planned)_

## Rules

- Every change takes effect immediately and shows up live on the dashboard, for every admin watching that user.
- Extra requests last only until the user's count next resets, and only exist while the user has an hour running.
- No limit, custom or with extra requests, goes above 1,000 requests.
- Ticking users swaps the filters for a selection bar of the same height, so the table never moves. A bulk reset takes at most the 100 users of one page.
- Only admins can use these controls.

## Out of scope

- Changing the default limit for all users at once.
- A record of who changed what.
