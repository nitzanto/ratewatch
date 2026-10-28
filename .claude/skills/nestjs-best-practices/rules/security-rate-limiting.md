---
title: Rate Limiting Is the Product's Own Interceptor
impact: HIGH
impactDescription: Avoids two rate limiters fighting over the same requests
tags: security, rate-limiting
---

## Rate Limiting Is the Product's Own Interceptor

ratewatch *is* a rate limiter: per-user limits are enforced by the project's own interceptor, backed by the shared store. Don't add `@nestjs/throttler` or another generic limiter: it would count the same requests a second time, by a different key and window, and make limits and `429` responses unpredictable.

Extend the existing interceptor and its domain logic instead, and record any change to how limits work in an ADR.
