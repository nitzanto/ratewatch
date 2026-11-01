# ratewatch

A per-user rate limiter with a live admin dashboard, and a cookie clicker that lets a user feel the limit from their side.

## People

**User**:
Someone identified by a user ID whose requests count against a limit. Also the role that uses the cookie clicker.
_Avoid_: Client, account, customer

**Admin**:
The role that watches users on the dashboard and changes their limits. An admin's own requests are never limited.
_Avoid_: Operator, superuser

**Session**:
Who someone is signed in as (a user ID and a role), from sign-in until they sign out or 24 hours pass.
_Avoid_: Login, account, token

## Rate limiting

**Limit**:
The number of requests a user may make in one window: 100, or the user's custom limit, plus any extra requests for the current window.
_Avoid_: Quota, allowance, cap

**Custom limit**:
A per-user limit an admin sets in place of 100; it applies to every window until the admin changes it back.
_Avoid_: Override, adjusted limit

**Extra requests**:
Requests an admin adds to a user's limit for the current window only.
_Avoid_: Bonus, top-up, credits

**Window**:
The one hour that starts with a user's first request; when it ends the user's count starts again from zero.
_Avoid_: Period

**Burst limit**:
How fast a user's requests may arrive, on top of their limit: a token bucket of 20 that refills at 5 per second. A request refused by it counts nothing and only has to wait for the next token; it never makes a user Exceeded.
_Avoid_: Throttle, rate cap, cooldown

**Requests left**:
How many more requests a user may make in the current window.
_Avoid_: Remaining quota, credits

**Reset time**:
The moment the user's current window ends.
_Avoid_: Expiry, refresh time

**Status**:
Where a user stands in the current window: **OK** (under 90% of the limit used), **Warning** (90% or more), **Exceeded** (100%, further requests are refused) or **Paused** (an admin has paused the limit).
_Avoid_: Level, state, health

## Admin controls

**Reset limit**:
Ending a user's current window early, so their count is zero and their next request starts a new window.
_Avoid_: Clear, refill

**Pause**:
An admin switching a user's limit off for a set time; the user's requests still count but are never refused. It ends by itself.
_Avoid_: Suspend, whitelist, exempt

**Unlock**:
Ending a user's pause before its time is up.
_Avoid_: Resume, unpause
