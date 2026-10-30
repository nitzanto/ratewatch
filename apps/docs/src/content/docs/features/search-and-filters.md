---
title: Search and filters
description: Find users by ID, status or last activity.
sidebar:
  order: 5
---

**Status:** Planned

## Summary

Ways to narrow the [live user table](../live-user-table/) down to the users an admin cares about.

## What users can do

- As an admin, I can search for a user by their user ID.
- As an admin, I can filter users by status: OK, Warning or Exceeded.
- As an admin, I can filter users by when they were last active.

## Rules

- Status filters use the same thresholds as the table: Exceeded at 100% used, Warning at 90% or more, OK under 90%.
- Filtered results keep updating live.

## Out of scope

- Saved searches.

## Open questions

- Which last-activity ranges should the filter offer (for example, last 5 minutes, last hour, today)?
