import { userRow } from '@/mocks/data/users';
import { setMockUsers } from '@/mocks/handlers/admin-users';
import { setMockSession } from '@/mocks/handlers/session';
import { refuseRealtime, sendRateUpdate, sendSummary } from '@/mocks/realtime';
import { renderApp } from '@/test/render-app';
import { rowOf } from '@/test/users-table';
import { act, screen, within } from '@testing-library/react';

// Each part has its own spec beside it; this one covers only how the page wires them together.

const page = () => within(screen.getByRole('main'));
const card = (name: string) => within(page().getByRole('region', { name }));

it('shows the summary, the users, the status breakdown and the top users', async () => {
  await renderApp('/dashboard', { signedInAs: 'admin' });

  expect(
    await page().findByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeTruthy();
  expect(await page().findByRole('table', { name: 'Users' })).toBeTruthy();
  expect(page().getByRole('region', { name: 'Summary' })).toBeTruthy();
  expect(page().getByRole('region', { name: 'Status breakdown' })).toBeTruthy();
  expect(page().getByRole('region', { name: 'Top users' })).toBeTruthy();
});

it('updates a row in place when a live update arrives', async () => {
  const user = userRow('user-bbbb2222', 20, 60_000);
  setMockUsers([user]);
  await renderApp('/dashboard', { signedInAs: 'admin' });
  await page().findByRole('table', { name: 'Users' });

  act(() =>
    sendRateUpdate({
      row: {
        ...user,
        requestsLeft: 79,
        lastRequestAt: new Date().toISOString(),
      },
      requests: [],
    }),
  );

  expect(await rowOf('user-bbbb2222').findByText('79 / 100')).toBeTruthy();
});

it("updates the analytics live from rate:summary, over the users panel's connection", async () => {
  await renderApp('/dashboard', { signedInAs: 'admin' });
  await card('Total users').findByText('7');

  act(() =>
    sendSummary({
      totalUsers: 8,
      nearLimitShare: 2 / 3,
      refusedToday: 99,
      counts: { ok: 2, warning: 3, exceeded: 3, paused: 0 },
      topUsers: [{ userId: 'user-ffff6666', used: 1, limit: 100 }],
    }),
  );

  const topUsers = within(page().getByRole('region', { name: 'Top users' }));
  expect(await card('Total users').findByText('8')).toBeTruthy();
  expect(card('Near their limit').getByText('66.7%')).toBeTruthy();
  expect(card('429s today (UTC)').getByText('99')).toBeTruthy();
  expect(topUsers.getAllByRole('listitem')).toHaveLength(1);
  expect(topUsers.getByText('1 request')).toBeTruthy();
});

it('sends the admin to sign in when the live connection is refused because their session ended', async () => {
  setMockUsers([userRow('user-aaaa1111', 50, 5_000)]);
  await renderApp('/dashboard', { signedInAs: 'admin' });
  await page().findByText('50 / 100');

  setMockSession(null);
  act(() => refuseRealtime());

  expect(
    await screen.findByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeTruthy();
});
