---
area: architecture
issue: https://github.com/nitzanto/ratewatch/issues/35
status: accepted
---

# Demo sign-in with a signed session cookie

ratewatch has no accounts: the sign-in page offers **Sign in as User** (a new random user ID, `user-` plus 8 hex characters) and **Sign in as Admin** (the fixed ID `admin`). The API answers with the session (user ID, role, expiry) and sets it as a signed cookie (`session`, HMAC with `SESSION_SECRET` via `cookie-parser`): `httpOnly`, `SameSite=Strict`, `Secure` in production, `Max-Age` 24 hours. A global guard answers 401 to any request without a valid, unexpired session unless the route is `@Public()` (sign-in, sign-out, health); handlers read it with `@CurrentSession()`. The server trusts only what it signed, so the rate limit's user ID can't be chosen per request.

## Considered Options

- **Real accounts with passwords in Postgres**: a database, registration and password handling for a demo whose point is the rate limiter. It's the upgrade path: accounts and custom limits move to Postgres, Redis keeps the counters, and the session cookie stays as it is.
- **A user ID header sent by the client**: anyone could send any ID, including an admin's, so neither the per-user limit nor the admin-only endpoints would mean anything.
- **A bearer token in an `Authorization` header**: page script would have to hold it, so injected script could steal it, and the Socket.IO handshake would need it passed by hand. An `httpOnly` cookie is sent on API calls and the handshake automatically, because nginx serves both on one origin (ADR-0009).
- **A server-side session store in Redis**: would allow revoking a session, but adds a store lookup to every request. A signed cookie needs no state.

## Consequences

- The 24 hours are fixed from sign-in and never extended: there's no server state, so signing out only clears the browser's cookie, and the expiry is what ends a copied cookie. It's longer than the one-hour window, so testing the limit never bumps anyone to sign-in.
- The web app keeps the session as a TanStack Query entry restored from `GET /auth/me`, not in a React context: it's server state, and only signing in or out changes it. Signing in or out drops every other cached query, since it belonged to the last person.
- A 401 mid-use signs the person out from the query client's cache-level `onError`, not the API client's: that can't reach the cache, and it also sees the expected 401 from `/auth/me`.
- The page to return to after sign-in travels in router state, never a query parameter, so no link can choose where sign-in goes. Signing out doesn't pass it on.
- Changing `SESSION_SECRET` signs everyone out.
- Anyone can click **Sign in as Admin**: acceptable only because ratewatch isn't deployed publicly.
