---
title: Analytics
description: Totals and top users at a glance.
sidebar:
  order: 6
---

**Status:** Planned

## Summary

Summary numbers at the top of the dashboard, so an admin sees the overall picture before looking at individual users.

## What users can do

- As an admin, I can see summary cards for:
  - the total number of users;
  - the percentage of users near their limit;
  - how many requests were refused for being over the limit today.
- As an admin, I can see the top users by requests in the current hour.

## Rules

- "Near their limit" means the Warning status: 90% or more of the allowance used.
- The numbers update live.

## Out of scope

- Charts over weeks or months.

## Open questions

- When does "today" start and end: midnight in which time zone?
- How many users does the top-users list show?
