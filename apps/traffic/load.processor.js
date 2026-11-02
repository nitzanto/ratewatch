// Checks for the load test (load.yml): each user's clicks against the limit, and the live events each admin gets.
const { io } = require('socket.io-client');

const defaultLimit = 100;

/** The error of a click the API let through uncounted; build-load-report.js counts it apart. */
const failedOpenError = 'failed open: no x-count';

/** Keeps the session cookie from the sign-in, for the admin's Socket.IO handshake and page load. */
const keepSessionCookie = (req, res, context, events, next) => {
  context.vars.cookie = (res.headers['set-cookie'] ?? [])
    .map((cookie) => cookie.split(';')[0])
    .join('; ');

  return next();
};

/** Fails the user on any answer the limiter must never give: a wrong x-count, an hourly refusal before the limit, or an error. */
const checkClick = (req, res, context, events, next) => {
  const allowedBefore = context.vars.allowed ?? 0;

  if (res.statusCode === 200) {
    const expectedLeft = defaultLimit - allowedBefore - 1;

    // No x-count means the API couldn't reach Redis in time and let the click through uncounted (fail open).
    if (res.headers['x-count'] === undefined) {
      return next(new Error(failedOpenError));
    }

    if (res.headers['x-count'] !== String(expectedLeft)) {
      return next(
        new Error(
          `x-count ${res.headers['x-count']}, expected ${expectedLeft}`,
        ),
      );
    }

    context.vars.allowed = allowedBefore + 1;

    return next();
  }

  if (res.statusCode === 429) {
    const { reason } = JSON.parse(res.body);

    if (reason === 'hourly' && allowedBefore !== defaultLimit) {
      return next(new Error(`hourly refusal after ${allowedBefore} allowed`));
    }

    events.emit('counter', `load.refused.${reason}`, 1);

    return next();
  }

  return next(new Error(`click answered ${res.statusCode}`));
};

/** Fails the user when the limiter let through more than the limit, or a different number than the profile expects. */
const checkUserTotal = (context, events, next) => {
  const allowed = context.vars.allowed ?? 0;
  const expected = context.vars.expectAllowed;

  if (allowed > defaultLimit) {
    return next(new Error(`${allowed} allowed, over the limit`));
  }

  if (expected !== '' && allowed !== Number(expected)) {
    return next(new Error(`${allowed} allowed, expected ${expected}`));
  }

  return next();
};

/**
 * An admin loads the page of the 100 most recently active users, follows them over Socket.IO, and counts the live events for a while.
 * Records how far each rate:update is behind its user's last request, and fails when an event type never arrives.
 */
const watchLiveEvents = async (context, events) => {
  if (context.vars.role !== 'admin') {
    return null;
  }

  const watchMs = Number(context.vars.watchSeconds) * 1000;
  const counts = { update: 0, limitExceeded: 0, summary: 0 };

  // Step 1: load the 100 most recently active users, the dashboard's default sort.
  const page = await fetch(
    `${context.vars.target}/api/admin/users?pageSize=100`,
    { headers: { cookie: context.vars.cookie } },
  ).then((res) => res.json());

  // Step 2: connect and follow those users.
  const socket = io(context.vars.target, {
    transports: ['websocket'],
    extraHeaders: { cookie: context.vars.cookie },
    reconnection: false,
  });

  socket.on('rate:update', ({ row }) => {
    counts.update += 1;
    events.emit(
      'histogram',
      'load.admin.update_lag',
      Date.now() - Date.parse(row.lastRequestAt),
    );
  });

  socket.on('rate:limit_exceeded', () => {
    counts.limitExceeded += 1;
  });

  socket.on('rate:summary', () => {
    counts.summary += 1;
  });

  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });

  await socket.emitWithAck('rate:subscribe', {
    userIds: page.rows.map((row) => row.userId),
  });

  // Step 3: watch, then report what arrived.
  await new Promise((resolve) => setTimeout(resolve, watchMs));
  socket.disconnect();

  Object.entries(counts).forEach(([name, count]) =>
    events.emit('counter', `load.admin.events.${name}`, count),
  );

  const missing = Object.keys(counts).filter((name) => counts[name] === 0);

  if (missing.length > 0) {
    throw new Error(`admin got no ${missing.join(', ')} events`);
  }

  return counts;
};

module.exports = {
  failedOpenError,
  keepSessionCookie,
  checkClick,
  checkUserTotal,
  watchLiveEvents,
};
