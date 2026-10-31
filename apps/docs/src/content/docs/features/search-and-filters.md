---
title: Search and filters
description: Find users by ID, status or last activity.
sidebar:
  order: 5
---

**Status:** Shipped

## Summary

Ways to narrow the [live user table](../live-user-table/) down to the users an admin cares about.

## What users can do

- As an admin, I can search for a user by their user ID.
- As an admin, I can filter users by status: OK, Warning, Exceeded or Paused, and see how many users have each.
- As an admin, I can filter users by when they were last active.
- As an admin, I can sort the table by any column.
- As an admin, I can page through the users, 25, 50 or 100 at a time.

## Rules

- Search matches a whole user ID, or the start of one once it's 2 characters long. It ignores case.
- Status filters use the same thresholds as the table: Exceeded at 100% used, Warning at 90% or more, OK under 90%. Paused users count only as Paused.
- Each status shows its count under the current search and last-active filter, so a count always matches what picking that status would show. All shows the sum.
- The last-active filter offers the last 15 minutes, the last hour and the last 24 hours (the default). Users idle for longer drop out of the table.
- Sorting by requests left, reset time or status puts users whose hour has ended last, in either direction. Status sorts by the share of the limit used.
- A new search, filter or sort goes back to the first page. Clear filters returns to all statuses, no search and the last 24 hours.
- Filtered results keep updating live, and a user whose status changes on screen moves between the counts. Users off the page catch up the next time the page loads.

## Out of scope

- Saved searches.
