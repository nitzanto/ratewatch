---
title: About design docs
description: What a design doc is and when to write one.
sidebar:
  order: 0
---

A design doc (a low-level design, or LLD) describes how one feature works before it's built: the data it stores, the API and events it exposes, the main flows, and the edge cases. It's written when a feature is big enough that the team should agree on the approach before code review, and it's kept up to date as the feature changes.

A good design doc covers:

- **Goal and non-goals**: what the feature does, and what it deliberately doesn't.
- **Design**: components, data shapes, endpoints and events, with a Mermaid diagram of the main flow.
- **Edge cases and failure modes**: concurrency, limits, what happens when a dependency is down.
- **Testing**: what's covered by unit, component and end-to-end tests.
- **Open questions**: anything still to decide, and who decides it.

Each decision the design makes gets an [ADR](../../adrs/writing-an-adr/) and a row in the [decision log](../../adrs/architecture-decisions/#decision-log). The design doc links to them, and to the [feature spec](../../features/) it implements.

The first design docs arrive with the rate-limiting and dashboard features.
