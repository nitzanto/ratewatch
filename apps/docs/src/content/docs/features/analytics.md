---
title: Analytics
description: Totals and top users at a glance.
sidebar:
  order: 6
---

**Status:** Shipped.

## Summary

Summary numbers at the top of the dashboard, so an admin sees the overall picture before looking at individual users.

## What users can do

- As an admin, I can see summary cards for:
  - the total number of users;
  - the percentage of users near their limit;
  - how many requests were refused for being over the limit today (UTC).
- As an admin, I can see the top 5 users by requests in their current window.

## Rules

- The total counts users with a request in the past 24 hours.
- "Near their limit" means the Warning or Exceeded status: 90% or more of the allowance used.
- "Today" is the UTC day, from midnight to midnight UTC, so every admin sees the same number; the card says "429s today (UTC)".
- The numbers update live, every second.

## Out of scope

- Charts over weeks or months.
