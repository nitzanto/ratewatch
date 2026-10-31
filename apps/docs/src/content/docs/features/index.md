---
title: Feature specs
description: What ratewatch does, feature by feature, in plain language.
sidebar:
  order: 0
---

These pages describe what ratewatch does for the people who use it, in plain language. They're written for anyone, technical or not: product, support, new team members and developers starting a feature. How a feature is built lives in its design doc; why the system is shaped as it is lives in the ADRs.

## What ratewatch is

ratewatch protects a service from overuse by limiting how many requests each user can make per hour. Admins watch every user's usage live on a dashboard, see who is close to or over their limit, and step in when needed: resetting, raising or pausing a user's limit.

## Features

| Feature                                   | In one line                                         | Status              |
| ----------------------------------------- | --------------------------------------------------- | ------------------- |
| [Rate limiting](rate-limiting/)           | Each user gets a fixed number of requests per hour  | Planned             |
| [Live user table](live-user-table/)       | Every user's usage, updating live                   | Shipped             |
| [User detail](user-detail/)               | One user's usage, recent requests and live activity | Shipped             |
| [Admin controls](admin-controls/)         | Reset, adjust, pause or top up a user's limit       | Partly shipped      |
| [Search and filters](search-and-filters/) | Find users by ID, status or last activity           | Shipped             |
| [Analytics](analytics/)                   | Totals and top users at a glance                    | Planned             |
| [Cookie Clicker](cookie-clicker/)         | Spend requests by clicking a cookie, see the limit  | Shipped (mock mode) |

## Writing a feature spec

Each spec answers, without technical detail:

- **Summary:** what the feature is and who it's for.
- **What users can do:** the main actions, as "As an admin, I can…".
- **Rules:** the business rules, with numbers.
- **Out of scope:** what this feature deliberately doesn't do.
- **Open questions:** product decisions still to make.

Keep the status in the table above up to date: Planned, In progress or Shipped.
