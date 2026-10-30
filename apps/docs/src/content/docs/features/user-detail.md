---
title: User detail
description: One user's usage, recent requests and live activity.
sidebar:
  order: 3
---

**Status:** Planned

## Summary

A page for one user, for when an admin needs the full picture: current usage, recent requests, and what the user is doing right now.

## What users can do

- As an admin, I can see the user's current stats: requests used and left, and when their count last reset.
- As an admin, I can see the user's recent requests.
- As an admin, I can watch the user's activity live as it happens.
- As an admin, I can view a short activity history for the past hour or the past day.
- As an admin, I can act on the user from this page (see [Admin controls](../admin-controls/)).

## Rules

- The live activity shows only this user's events.
- History covers at most the past day.

## Out of scope

- Activity older than one day.
- Exporting a user's history.

## Open questions

- How many recent requests does the page show?
