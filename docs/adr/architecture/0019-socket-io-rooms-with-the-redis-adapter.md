---
area: architecture
issue: https://github.com/nitzanto/ratewatch/issues/45
status: accepted
---

# Socket.IO with the Redis adapter, events only for what an admin sees

Live updates use `@nestjs/websockets` with Socket.IO and its sharded Redis adapter, so an event from any API instance reaches admins on every instance. Only the Admin can connect (the handshake checks the session cookie). An admin joins one room per user row on screen (at most 100) plus the open user, and an `admins` room. `rate:update` is sent at most once per second per user per instance, as a plain (not volatile) emit; `rate:limit_exceeded` is sent at once, exactly once per user per window. `rate:summary` is the one exception to cross-instance fan-out: once a second, each instance with admins connected reads the summary from Redis after its batch and emits it to its own `admins` sockets only (`server.local`), so it never goes through the adapter. Events therefore scale with what admins look at, not with the number of users.

## Considered Options

- **Plain WebSockets** (`ws` adapter): no rooms, reconnect or multi-instance fan-out; we'd build all three.
- **Server-sent events**: one-way, so subscribing to the visible rows needs a separate HTTP call, and fan-out across instances is still ours to build.
- **Polling**: simple, but a fixed delay and a request per admin per interval whether anything changed or not.
- **Broadcast every user's update to every admin**: up to one event per active user per second to each admin, which doesn't hold at large user counts.

## Consequences

- Every instance with admins reads the summary once a second (five `FT.SEARCH` and one `GET`), so that cost grows with instances that have admins, not with users. An admin's summary can lag writes made by other instances by up to a second. Publishing one summary through the adapter instead would need one instance elected to compute it ([#57](https://github.com/nitzanto/ratewatch/issues/57)).
- The web app connects over WebSocket only, so several API instances need no sticky sessions; a network that blocks WebSockets gets no live updates.
- The sharded adapter publishes a room's event even when no socket is in it, so until updates are published only for followed users (measured with #41), Redis pub/sub traffic grows with active users even though deliveries don't.
- An admin sees live changes only for rows on screen; other pages are fresh when opened.
- Two instances can each send an update for the same user in the same second; the client keeps the newer one.
- `rate:update` is not volatile: a second's updates go out back to back, and Socket.IO drops a volatile packet while the one before it is still being written, so an admin following several active users lost all but one each second ([#52](https://github.com/nitzanto/ratewatch/issues/52)). A slow admin's backlog stays small: at most one update per followed user per second.
