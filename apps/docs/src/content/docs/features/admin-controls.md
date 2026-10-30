---
title: Admin controls
description: Reset, adjust, pause or top up a user's limit.
sidebar:
  order: 4
---

**Status:** Planned

## Summary

The actions an admin can take on a user's limit, from the user's detail page.

## What users can do

- As an admin, I can **reset** a user's limit, so their count starts again from zero.
- As an admin, I can **adjust** a user's limit to a custom number of requests per hour.
- As an admin, I can **suspend** throttling for a user temporarily, and **unlock** it again.
- As an admin, I can **add extra requests** to a user's allowance for the current hour only.

## Rules

- Every change takes effect immediately and shows up live on the dashboard.
- Extra requests last only until the user's count next resets.
- Only admins can use these controls.

## Out of scope

- Changing the default limit for all users at once.

## Open questions

- How long does a temporary suspension last, and does it end on its own?
- Does an adjusted limit last forever, or until an admin changes it back?
- Should admin actions be recorded, so others can see who changed what?
