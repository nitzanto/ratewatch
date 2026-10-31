---
title: User detail
description: One user's usage, recent requests and live activity.
sidebar:
  order: 3
---

**Status:** Shipped. Acting on the user arrives with [Admin controls](../admin-controls/).

## Summary

A panel for one user, opened from their row in the [live user table](../live-user-table/), for when an admin needs the full picture: current usage, recent requests, and what the user is doing right now.

## What users can do

- As an admin, I can open a user from the table, and close them again with Esc, the close button or a click beside the panel.
- As an admin, I can see the user's current stats: requests used and left, when their count last reset and next resets, their last request and whether their limit is paused.
- As an admin, I can see the user's last 50 requests, each accepted or refused.
- As an admin, I can watch the user's activity live as it happens.
- As an admin, I can view a short activity history for the past hour or the past day.
- As an admin, I can act on the user from this page (see [Admin controls](../admin-controls/)).

## Rules

- The live activity shows only this user's events.
- History covers at most the past day: the past hour minute by minute, the past day in 15-minute steps.
- Recent requests and history are kept for one day after they happen.
- While a user is open, the table behind them keeps its order.

## Out of scope

- Activity older than one day.
- Exporting a user's history.
