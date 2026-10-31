---
area: architecture
issue: https://github.com/nitzanto/ratewatch/issues/45
status: accepted
---

# Socket.IO with the Redis adapter, events only for what an admin sees

Live updates use `@nestjs/websockets` with Socket.IO and its sharded Redis adapter, so an event from any API instance reaches admins on every instance. Only the Admin can connect (the handshake checks the session cookie). An admin joins one room per user row on screen (at most 100) plus the open user, and an `admins` room. `rate:update` is sent at most once per second per user per instance, as a volatile emit; `rate:limit_exceeded` is sent at once, exactly once per user per window. Events therefore scale with what admins look at, not with the number of users.

## Considered Options

- **Plain WebSockets** (`ws` adapter): no rooms, reconnect or multi-instance fan-out; we'd build all three.
- **Server-sent events**: one-way, so subscribing to the visible rows needs a separate HTTP call, and fan-out across instances is still ours to build.
- **Polling**: simple, but a fixed delay and a request per admin per interval whether anything changed or not.
- **Broadcast every user's update to every admin**: up to one event per active user per second to each admin, which doesn't hold at large user counts.

## Consequences

- Several API instances need sticky sessions for Socket.IO's HTTP long-polling fallback.
- An admin sees live changes only for rows on screen; other pages are fresh when opened.
- Two instances can each send an update for the same user in the same second; the client keeps the newer one.
