import {
  afterExtraRequests,
  afterLimit,
  afterPause,
  afterReset,
  mockUsers,
  userDetail,
  userHistory,
  usersPage,
} from '@/mocks/data/users';
import {
  canAddExtraRequests,
  canSetLimit,
  customLimitSchema,
  pauseMs,
  pauseSchema,
  resetUsersSchema,
  userHistoryQuerySchema,
  usersQuerySchema,
  type AdminChange,
  type UserRow,
} from '@ratewatch/contracts';
import { http, HttpResponse } from 'msw';

let users = mockUsers();

/** The users the mock API knows; the mock realtime connection moves them as traffic. */
export const getMockUsers = () => users;

/** Replaces the users the mock API knows, such as `[]` for the empty state. */
export const setMockUsers = (rows: UserRow[]) => {
  users = rows;
};

export const resetUsers = () => setMockUsers(mockUsers());

/** The users, with every pause that has run out ended, as the API's records drop them. */
const endPauses = () => {
  const now = Date.now();
  users = users.map((row) =>
    row.pausedUntil && Date.parse(row.pausedUntil) <= now
      ? afterPause(row, null)
      : row,
  );
  return users;
};

/** Applies `next` to these users as an admin change, and answers as the API does. */
const changeUsers = (userIds: string[], next: (row: UserRow) => UserRow) => {
  const after = users
    .filter(({ userId }) => userIds.includes(userId))
    .map(next);
  users = users.map(
    (row) => after.find(({ userId }) => userId === row.userId) ?? row,
  );
  return HttpResponse.json({ rows: after } satisfies AdminChange);
};

export const adminUserHandlers = [
  http.get('/api/admin/users', ({ request }) =>
    HttpResponse.json(
      usersPage(
        endPauses(),
        usersQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    ),
  ),
  http.get('/api/admin/users/:id', ({ params }) => {
    const row = endPauses().find(({ userId }) => userId === params['id']);
    return row
      ? HttpResponse.json(userDetail(row))
      : HttpResponse.json({ message: 'Not Found' }, { status: 404 });
  }),
  http.post('/api/admin/users/reset', async ({ request }) =>
    changeUsers(
      resetUsersSchema.parse(await request.json()).userIds,
      afterReset,
    ),
  ),
  http.post('/api/admin/users/:id/reset', ({ params }) =>
    changeUsers([String(params['id'])], afterReset),
  ),
  http.post('/api/admin/users/:id/extra-requests', ({ params }) => {
    const row = users.find(({ userId }) => userId === params['id']);
    if (!row?.resetAt)
      return HttpResponse.json({ message: 'No open window' }, { status: 409 });
    if (!canAddExtraRequests(row.limit))
      return HttpResponse.json(
        { message: "A limit can't go above 1000" },
        { status: 422 },
      );
    return changeUsers([row.userId], afterExtraRequests);
  }),
  http.put('/api/admin/users/:id/limit', async ({ params, request }) => {
    const body = customLimitSchema.safeParse(await request.json());
    if (!body.success)
      return HttpResponse.json({ message: 'Bad Request' }, { status: 400 });
    const row = users.find(({ userId }) => userId === params['id']);
    if (row && !canSetLimit(body.data.limit, row.limit - row.baseLimit))
      return HttpResponse.json(
        { message: "A limit can't go above 1000" },
        { status: 422 },
      );
    return changeUsers([String(params['id'])], (user) =>
      afterLimit(user, body.data.limit),
    );
  }),
  http.put('/api/admin/users/:id/pause', async ({ params, request }) => {
    const { duration } = pauseSchema.parse(await request.json());
    const row = users.find(({ userId }) => userId === params['id']);
    const until =
      duration === 'untilReset'
        ? row?.resetAt
        : new Date(Date.now() + pauseMs[duration]).toISOString();
    if (!until)
      return HttpResponse.json({ message: 'No open window' }, { status: 409 });
    return changeUsers([String(params['id'])], (user) =>
      afterPause(user, until),
    );
  }),
  http.delete('/api/admin/users/:id/pause', ({ params }) =>
    changeUsers([String(params['id'])], (row) => afterPause(row, null)),
  ),
  http.get('/api/admin/users/:id/history', ({ params, request }) => {
    const row = users.find(({ userId }) => userId === params['id']);
    const { range } = userHistoryQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return row
      ? HttpResponse.json(userHistory(row, range))
      : HttpResponse.json({ message: 'Not Found' }, { status: 404 });
  }),
];
