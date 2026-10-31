import { mockUsers, usersPage } from '@/mocks/data/users';
import type { UserRow } from '@ratewatch/contracts';
import { http, HttpResponse } from 'msw';

let users = mockUsers();

/** The users the mock API knows; the mock realtime connection moves them as traffic. */
export const getMockUsers = () => users;

/** Replaces the users the mock API knows, such as `[]` for the empty state. */
export const setMockUsers = (rows: UserRow[]) => {
  users = rows;
};

export const resetUsers = () => setMockUsers(mockUsers());

// shortcut: answers every user on one page and ignores the query parameters; search, filters and paging arrive with #51.
export const adminUserHandlers = [
  http.get('/api/admin/users', () => HttpResponse.json(usersPage(users))),
];
