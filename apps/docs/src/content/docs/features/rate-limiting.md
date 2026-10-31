---
title: Rate limiting
description: Each user can make a fixed number of requests per hour.
sidebar:
  order: 1
---

**Status:** Shipped. Letting requests through while the counting service is down is next; admins changing a user's limit arrives with [Admin controls](../admin-controls/).

## Summary

Every user of the protected service can make up to **100 requests per hour**. This keeps one user from overloading the service and keeps it fair for everyone. The limit follows the user, not their device or network: the same user on two devices shares one allowance.

## What users can do

- As a user, I can see on every successful request how many requests I have left this hour.
- As a user, when I've used my allowance, I get a clear message saying I've hit the limit and when I can try again.

The [cookie clicker](../cookie-clicker/) is the way to see this from a user's side: every click spends one request.

## Rules

- The allowance is **100 requests per user per hour**.
- The count **resets every hour**.
- Users are identified by their user ID, never by IP address or device.
- When many requests arrive at the same moment, the limit still holds exactly: no request slips past it.
- A request over the limit is refused with a "too many requests" response, a message, and the time the user can try again.
- Admins can change a user's allowance (see [Admin controls](../admin-controls/)).

## Out of scope

- Different limits per endpoint or per plan.
- Billing or paid upgrades for more requests.

## Decided

- **"Every hour"** is one hour that starts with each user's first request: the count resets one hour after that request, not on the clock hour.
- **If the counting service is down,** requests go through, and the page says the limit is unavailable instead of showing a count. See [Failure mode](../../adrs/failure-mode/).
