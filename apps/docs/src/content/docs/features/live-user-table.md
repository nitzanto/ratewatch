---
title: Live user table
description: Every user's usage on one screen, updating live.
sidebar:
  order: 2
---

**Status:** Shipped

## Summary

The main dashboard screen: one table listing every user and where they stand against their limit. It updates live as requests come in and limits are hit, so admins never need to refresh.

## What users can do

- As an admin, I can see every user's usage at a glance.
- As an admin, I can see a user's row change the moment they make a request or hit their limit.
- As an admin, I can sort the table by any column.
- As an admin, I can open a user's [detail view](../user-detail/) from their row.

## Rules

Each row shows:

| Column            | Meaning                                       |
| ----------------- | --------------------------------------------- |
| User ID           | Who the user is                               |
| Remaining / Total | Requests left this hour, out of the allowance |
| Reset time        | When the user's count resets                  |
| Status            | OK, Warning or Exceeded (below)               |
| Last request      | When the user last made a request             |

Status is based on how much of the allowance is used:

- **Exceeded:** 100% used.
- **Warning:** 90% or more used.
- **OK:** under 90% used.

## Out of scope

- Editing users from the table itself; that happens in [Admin controls](../admin-controls/).

## Open questions

- How many users must the table handle while staying smooth?
