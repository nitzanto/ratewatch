import { userRow } from '@/mocks/data/users';
import { setMockUsers } from '@/mocks/handlers/admin-users';
import { renderWithProviders } from '@/test/render-app';
import { minuteMs } from '@/test/users-table';
import { screen, within } from '@testing-library/react';
import { TopUsers } from './top-users';

const topUsers = () =>
  within(screen.getByRole('region', { name: 'Top users' }));

it('lists the users with the most requests first; a user whose window ended has none', async () => {
  setMockUsers([
    userRow('user-aaaa1111', 59, 4_000),
    userRow('user-bbbb2222', 95, 8_000),
    userRow('user-cccc3333', 100, 20_000),
    userRow('user-dddd4444', 12, 30_000),
    userRow('user-eeee5555', 0, 70 * minuteMs, {
      requestsLeft: 100,
      resetAt: null,
    }),
  ]);
  await renderWithProviders(<TopUsers />, { signedInAs: 'admin' });

  await topUsers().findByText('user-cccc3333');
  const items = topUsers().getAllByRole('listitem');
  expect(items).toHaveLength(4);
  ['user-cccc3333', 'user-bbbb2222', 'user-aaaa1111', 'user-dddd4444'].forEach(
    (userId, rankIndex) =>
      expect(within(items[rankIndex]).getByText(userId)).toBeTruthy(),
  );
  expect(within(items[0]).getByText('100 requests')).toBeTruthy();
  expect(within(items[0]).getByText('0 of 100 left')).toBeTruthy();
});

it('says when no one has requests in the current window', async () => {
  setMockUsers([]);
  await renderWithProviders(<TopUsers />, { signedInAs: 'admin' });

  expect(
    await topUsers().findByText('No requests in the current window yet.'),
  ).toBeTruthy();
});
