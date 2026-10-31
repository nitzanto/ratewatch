import { mockUsers, usersPage } from '@/mocks/data/users';
import { usersQuerySchema, type UserRow } from '@ratewatch/contracts';
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
];
