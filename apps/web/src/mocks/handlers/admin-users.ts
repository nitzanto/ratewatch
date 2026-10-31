import {
  mockUsers,
  userDetail,
  userHistory,
  usersPage,
} from '@/mocks/data/users';
import {
  userHistoryQuerySchema,
  usersQuerySchema,
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
