import { userRow } from '@/mocks/data/users';
import { setMockUsers } from '@/mocks/handlers/users';
import { server } from '@/mocks/node';
import { renderWithProviders } from '@/test/render-app';
import { freezeClock, minuteMs } from '@/test/users-table';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { UserDrawer } from './user-drawer';

const renderDrawer = async (userId: string, onClose = vi.fn()) => {
  await renderWithProviders(
    <UserDrawer userId={userId} frozenAt={null} onClose={onClose} />,
    { signedInAs: 'admin' },
  );

  return screen.findByRole('dialog', { name: userId });
};

const recentRequests = (drawer: HTMLElement) =>
  within(
    within(drawer).getByRole('list', { name: 'Recent requests' }),
  ).getAllByRole('listitem');

afterEach(() => vi.useRealTimers());

it("shows the user's stats and recent requests", async () => {
  freezeClock();
  setMockUsers([
    userRow('user-aaaa1111', 59, 4_000),
    userRow('user-bbbb2222', 10, minuteMs),
  ]);

  const drawer = await renderDrawer('user-aaaa1111');

  expect(await within(drawer).findByText('41 / 100')).toBeTruthy();
  expect(within(drawer).getByText('59%')).toBeTruthy();
  expect(within(drawer).getByText('OK')).toBeTruthy();
  expect(within(drawer).getByText('4 s ago')).toBeTruthy();
  expect(recentRequests(drawer)).toHaveLength(50);
});

it('closes with Esc or the close button', async () => {
  setMockUsers([userRow('user-aaaa1111', 10, 30_000)]);
  const onClose = vi.fn();
  const drawer = await renderDrawer('user-aaaa1111', onClose);

  fireEvent.keyDown(drawer, { key: 'Escape' });
  fireEvent.click(
    within(drawer).getByRole('button', { name: 'Close user details' }),
  );

  expect(onClose).toHaveBeenCalledTimes(2);
});

it('offers a retry when the user fails to load', async () => {
  server.use(
    http.get(
      '/api/admin/users/:id',
      () => new HttpResponse(null, { status: 503 }),
      { once: true },
    ),
  );
  setMockUsers([userRow('user-aaaa1111', 10, 30_000)]);
  const drawer = await renderDrawer('user-aaaa1111');

  fireEvent.click(await within(drawer).findByRole('button', { name: 'Retry' }));

  expect(await within(drawer).findByText('90 / 100')).toBeTruthy();
});
