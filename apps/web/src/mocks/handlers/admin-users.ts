import {
  afterExtraRequests,
  afterReset,
  mockUsers,
  userDetail,
  userHistory,
  usersPage,
} from '@/mocks/data/users';
import {
  canAddExtraRequests,
  extraRequestsAmount,
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

// Each user's extra requests in their current window, so a reset knows their plain limit.
const extras = new Map<string, number>();

export const resetUsers = () => {
  setMockUsers(mockUsers());
  extras.clear();
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

const resetUser = (row: UserRow) => {
  const plain = afterReset(row, row.limit - (extras.get(row.userId) ?? 0));
  extras.delete(row.userId);
  return plain;
};

export const adminUserHandlers = [
  http.get('/api/admin/users', ({ request }) =>
    HttpResponse.json(
      usersPage(
        users,
        usersQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    ),
  ),
  http.get('/api/admin/users/:id', ({ params }) => {
    const row = users.find(({ userId }) => userId === params['id']);
    return row
      ? HttpResponse.json(userDetail(row))
      : HttpResponse.json({ message: 'Not Found' }, { status: 404 });
  }),
  http.post('/api/admin/users/reset', async ({ request }) =>
    changeUsers(
      resetUsersSchema.parse(await request.json()).userIds,
      resetUser,
    ),
  ),
  http.post('/api/admin/users/:id/reset', ({ params }) =>
    changeUsers([String(params['id'])], resetUser),
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
    extras.set(row.userId, (extras.get(row.userId) ?? 0) + extraRequestsAmount);
    return changeUsers([row.userId], afterExtraRequests);
  }),
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
