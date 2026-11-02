import { userRow } from '@/mocks/data/users';
import { setMockUsers } from '@/mocks/handlers/admin-users';
import { server } from '@/mocks/node';
import {
  dropRealtime,
  followedUserIds,
  restoreRealtime,
  sendLimitExceeded,
  sendRateUpdate,
  sendSummary,
} from '@/mocks/realtime';
import { renderWithProviders } from '@/test/render-app';
import {
  expectUserIds,
  freezeClock,
  minuteMs,
  rowOf,
  usersTable,
} from '@/test/users-table';
import type { UserRow } from '@ratewatch/contracts';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { UsersPanel } from './users-panel';

const renderPanel = async () => {
  await renderWithProviders(<UsersPanel />, { signedInAs: 'admin' });

  return screen.findByRole('table', { name: 'Users' });
};

const openUser = async (userId: string) => {
  fireEvent.click(
    within(await screen.findByRole('table', { name: 'Users' })).getByRole(
      'button',
      { name: userId },
    ),
  );

  return screen.findByRole('dialog', { name: userId });
};

const closeDrawer = async (drawer: HTMLElement) => {
  fireEvent.keyDown(drawer, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

  return drawer;
};

const recentRequests = (drawer: HTMLElement) =>
  within(
    within(drawer).getByRole('list', { name: 'Recent requests' }),
  ).getAllByRole('listitem');

const chip = (name: string) => screen.getByRole('button', { name });

afterEach(() => vi.useRealTimers());

describe('live', () => {
  const first = userRow('user-aaaa1111', 50, 5_000);
  const second = userRow('user-bbbb2222', 20, 60_000);
  const third = userRow('user-cccc3333', 10, 2 * minuteMs);
  const update = (row: UserRow) =>
    act(() => sendRateUpdate({ row, requests: [] }));
  const requestFrom = (row: UserRow, used: number) => ({
    ...row,
    requestsLeft: row.limit - used,
    lastRequestAt: new Date().toISOString(),
  });

  beforeEach(async () => {
    setMockUsers([first, second, third]);
    await renderPanel();
  });

  it('follows the users on screen, so the API sends only their updates', () => {
    expect(followedUserIds()).toEqual([
      'user-aaaa1111',
      'user-bbbb2222',
      'user-cccc3333',
    ]);
  });

  it('keeps the newer numbers when an older update arrives late', async () => {
    update(requestFrom(second, 25));
    update(requestFrom(second, 23));

    expect(await rowOf('user-bbbb2222').findByText('75 / 100')).toBeTruthy();
  });

  it('shows a user Exceeded the moment they hit their limit', async () => {
    act(() =>
      sendLimitExceeded({
        userId: 'user-cccc3333',
        limit: 100,
        resetAt: third.resetAt as string,
        at: new Date().toISOString(),
      }),
    );

    expect(await rowOf('user-cccc3333').findByText('Exceeded')).toBeTruthy();
    expect(rowOf('user-cccc3333').getByText('0 / 100')).toBeTruthy();
  });

  it('keeps updating a user after they hit their limit, though each instance sees the reset time a few ms apart', async () => {
    const resetAt = Date.parse(third.resetAt as string);
    act(() =>
      sendLimitExceeded({
        userId: 'user-cccc3333',
        limit: 100,
        resetAt: new Date(resetAt + 3).toISOString(),
        at: new Date().toISOString(),
      }),
    );
    await rowOf('user-cccc3333').findByText('Exceeded');

    update({
      ...requestFrom(third, 100),
      status: 'paused',
      pausedUntil: new Date(Date.now() + 15 * minuteMs).toISOString(),
    });

    expect(await rowOf('user-cccc3333').findByText('Paused')).toBeTruthy();
  });

  it("applies another admin's change to a user, though the row looks older", async () => {
    act(() =>
      sendRateUpdate({
        row: { ...first, requestsLeft: 100, resetAt: null },
        requests: [],
        byAdmin: true,
      }),
    );

    expect(await rowOf('user-aaaa1111').findByText('100 / 100')).toBeTruthy();
  });

  it('keeps the status counts current from rate:summary, users off the page included', async () => {
    act(() =>
      sendSummary({
        totalUsers: 40,
        nearLimitShare: 0.25,
        refusedToday: 0,
        counts: { ok: 28, warning: 6, exceeded: 4, paused: 2 },
        topUsers: [],
      }),
    );

    expect(await screen.findByRole('button', { name: 'OK 28' })).toBeTruthy();
    expect(chip('Paused 2')).toBeTruthy();
  });
});

describe('connection', () => {
  beforeEach(() => {
    freezeClock();
    setMockUsers([userRow('user-aaaa1111', 50, 5_000)]);
  });

  it('shows a banner and freezes the times while the connection is lost, keeping the data', async () => {
    await renderPanel();
    expect(await screen.findByText('5 s ago')).toBeTruthy();

    act(() => dropRealtime());
    vi.setSystemTime(Date.now() + 60_000);

    expect(screen.getByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringMatching(/Connection lost/),
    );
    expect(rowOf('user-aaaa1111').getByText('5 s ago')).toBeTruthy();
    expect(rowOf('user-aaaa1111').getByText('50 / 100')).toBeTruthy();

    act(() => restoreRealtime());

    expect(screen.queryByRole('alert')).toBeNull();
    // On the table's next one-second tick.
    expect(
      await rowOf('user-aaaa1111').findByText('1 min ago', undefined, {
        timeout: 2000,
      }),
    ).toBeTruthy();
  });

  it('refetches the users when the connection is back', async () => {
    await renderPanel();
    await screen.findByText('50 / 100');

    act(() => dropRealtime());
    setMockUsers([userRow('user-aaaa1111', 70, 1_000)]);
    act(() => restoreRealtime());

    expect(await rowOf('user-aaaa1111').findByText('30 / 100')).toBeTruthy();
  });
});

describe('search and filters', () => {
  const ok = userRow('user-aaaa1111', 10, 2 * minuteMs);
  const type = (userIdSearch: string) =>
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search user ID' }),
      {
        target: { value: userIdSearch },
      },
    );
  /**
   * Types `userIdSearch` and waits out the pause the search waits for (300 ms), so the next wait has all its time
   * for the fetch.
   */
  const search = async (userIdSearch: string) => {
    type(userIdSearch);
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
  };

  beforeEach(async () => {
    setMockUsers([
      ok,
      userRow('user-aabb2222', 95, 30_000),
      userRow('user-cccc3333', 100, 5 * minuteMs),
      userRow('user-dddd4444', 50, 40 * minuteMs, {
        status: 'paused',
        pausedUntil: new Date(Date.now() + 15 * minuteMs).toISOString(),
      }),
      userRow('user-eeee5555', 0, 3 * 60 * minuteMs, { resetAt: null }),
    ]);
    await renderPanel();
  });

  it('finds users by a prefix of their ID, or the whole ID', async () => {
    await search('user-aa');

    await waitFor(() => expectUserIds(['user-aabb2222', 'user-aaaa1111']));

    await search('user-cccc3333');

    await waitFor(() => expectUserIds(['user-cccc3333']));
  });

  it('searches once typing pauses, not on every keystroke', async () => {
    const searched: string[] = [];
    const onRequest = ({ request }: { request: Request }) => {
      const userIdSearch = new URL(request.url).searchParams.get(
        'userIdSearch',
      );
      if (userIdSearch) searched.push(userIdSearch);
    };
    server.events.on('request:start', onRequest);

    for (const userIdSearch of ['u', 'us', 'user-a', 'user-aa'])
      type(userIdSearch);

    await waitFor(() => expectUserIds(['user-aabb2222', 'user-aaaa1111']));
    server.events.removeListener('request:start', onRequest);
    expect(searched).toEqual(['user-aa']);
  });

  it("shows only a status's users when its chip is picked", async () => {
    fireEvent.click(chip('Warning 1'));

    await waitFor(() => expectUserIds(['user-aabb2222']));
    expect(chip('Warning 1')).toHaveProperty('ariaPressed', 'true');
    expect(chip('All 5')).toHaveProperty('ariaPressed', 'false');

    fireEvent.click(chip('Paused 1'));

    await waitFor(() => expectUserIds(['user-dddd4444']));
  });

  it('counts under the search', async () => {
    await search('user-aa');

    expect(await screen.findByRole('button', { name: 'All 2' })).toBeTruthy();
    expect(chip('OK 1')).toBeTruthy();
    expect(chip('Warning 1')).toBeTruthy();
    expect(chip('Exceeded 0')).toBeTruthy();
  });

  it('moves a user between the counts when a live update changes their status', async () => {
    act(() =>
      sendRateUpdate({
        row: { ...ok, requestsLeft: 5, status: 'warning' },
        requests: [],
      }),
    );

    expect(
      await screen.findByRole('button', { name: 'Warning 2' }),
    ).toBeTruthy();
    expect(chip('OK 1')).toBeTruthy();
  });

  it('filters by when users were last active', async () => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Last active' }));
    fireEvent.click(screen.getByRole('option', { name: 'Last 15 minutes' }));

    await waitFor(() =>
      expectUserIds(['user-aabb2222', 'user-aaaa1111', 'user-cccc3333']),
    );
    expect(chip('All 3')).toBeTruthy();
  });

  it('sorts the users from a column header', async () => {
    fireEvent.click(
      within(
        usersTable().getByRole('columnheader', { name: 'Requests left' }),
      ).getByRole('button'),
    );

    await waitFor(() =>
      expectUserIds([
        'user-cccc3333',
        'user-aabb2222',
        'user-dddd4444',
        'user-aaaa1111',
        'user-eeee5555',
      ]),
    );
  });

  it('says when nothing matches, and clears the filters', async () => {
    fireEvent.click(chip('Exceeded 1'));
    await search('user-aa');

    expect(
      await screen.findByText('No users match this search and these filters.'),
    ).toBeTruthy();

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Clear filters' })[0],
    );

    await waitFor(() =>
      expect(usersTable().getAllByRole('rowheader')).toHaveLength(5),
    );
    expect(chip('All 5')).toHaveProperty('ariaPressed', 'true');
    expect(
      screen.getByRole('searchbox', { name: 'Search user ID' }),
    ).toHaveProperty('value', '');
  });
});

it('pages through the users', async () => {
  setMockUsers(
    Array.from({ length: 26 }, (_, userIndex) =>
      userRow(
        `user-${String(userIndex).padStart(2, '0')}`,
        1,
        userIndex * 1000,
      ),
    ),
  );
  await renderPanel();

  expect(screen.getByText('1–25 of 26')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));

  await waitFor(() => expectUserIds(['user-25']));
});

it('says how to make users when there are none yet', async () => {
  setMockUsers([]);
  await renderWithProviders(<UsersPanel />, { signedInAs: 'admin' });

  expect(await screen.findByText('No users yet')).toBeTruthy();
  expect(screen.queryByRole('table')).toBeNull();
});

it('offers a retry when the users fail to load', async () => {
  server.use(
    http.get(
      '/api/admin/users',
      () => new HttpResponse(null, { status: 503 }),
      {
        once: true,
      },
    ),
  );
  await renderWithProviders(<UsersPanel />, { signedInAs: 'admin' });

  fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

  expect(await screen.findByRole('table', { name: 'Users' })).toBeTruthy();
});

describe('open user', () => {
  it('opens a user from the table with the focus on the close button, and closes them again', async () => {
    setMockUsers([userRow('user-aaaa1111', 10, 30_000)]);
    await renderPanel();

    const drawer = await openUser('user-aaaa1111');
    const close = within(drawer).getByRole('button', {
      name: 'Close user details',
    });
    await waitFor(() =>
      expect(close).toHaveProperty('ownerDocument.activeElement', close),
    );
    expect(await within(drawer).findByText('90 / 100')).toBeTruthy();

    await closeDrawer(drawer);

    fireEvent.click(
      within(await openUser('user-aaaa1111')).getByRole('button', {
        name: 'Close user details',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('follows the open user, and streams their requests and numbers as they happen', async () => {
    const user = userRow('user-aaaa1111', 10, 30_000);
    setMockUsers([user]);
    await renderPanel();
    const drawer = await openUser('user-aaaa1111');
    await waitFor(() => expect(recentRequests(drawer)).toHaveLength(10));

    const at = new Date().toISOString();
    act(() =>
      sendRateUpdate({
        row: { ...user, requestsLeft: 89, lastRequestAt: at },
        requests: [{ at, allowed: false }],
      }),
    );

    expect(await within(drawer).findByText('89 / 100')).toBeTruthy();
    expect(recentRequests(drawer)).toHaveLength(11);
    expect(recentRequests(drawer)[0]).toHaveProperty(
      'textContent',
      expect.stringContaining('Refused'),
    );
    expect(followedUserIds()).toContain('user-aaaa1111');
  });

  it('keeps every streamed request: two in one millisecond, and one another API instance sent late', async () => {
    const user = userRow('user-aaaa1111', 10, 30_000);
    setMockUsers([user]);
    await renderPanel();
    const drawer = await openUser('user-aaaa1111');
    await waitFor(() => expect(recentRequests(drawer)).toHaveLength(10));
    const now = new Date().toISOString();
    // Between the user's last two requests, which are 20 s apart in mock mode.
    const late = new Date(
      Date.parse(user.lastRequestAt) - 10_000,
    ).toISOString();

    act(() =>
      sendRateUpdate({
        row: { ...user, requestsLeft: 88, lastRequestAt: now },
        requests: [
          { at: now, allowed: true },
          { at: now, allowed: true },
        ],
      }),
    );
    act(() =>
      sendRateUpdate({
        row: { ...user, requestsLeft: 88, lastRequestAt: now },
        requests: [{ at: late, allowed: false }],
      }),
    );

    await waitFor(() => expect(recentRequests(drawer)).toHaveLength(13));
    expect(recentRequests(drawer)[3]).toHaveProperty(
      'textContent',
      expect.stringContaining('Refused'),
    );
  });

  it("keeps the table's order while a user is open, then re-sorts", async () => {
    const first = userRow('user-aaaa1111', 50, 5_000);
    const second = userRow('user-bbbb2222', 20, minuteMs);
    setMockUsers([first, second]);
    await renderPanel();
    const drawer = await openUser('user-bbbb2222');
    await within(drawer).findByText('1 min ago');

    act(() =>
      sendRateUpdate({
        row: { ...second, lastRequestAt: new Date().toISOString() },
        requests: [],
      }),
    );
    await within(drawer).findByText('0 s ago');
    // The open drawer hides the page from assistive tech, as a modal dialog does.
    expect(screen.getAllByRole('rowheader', { hidden: true })).toEqual(
      ['user-aaaa1111', 'user-bbbb2222'].map((textContent) =>
        expect.objectContaining({ textContent }),
      ),
    );

    await closeDrawer(drawer);

    await waitFor(() => expectUserIds(['user-bbbb2222', 'user-aaaa1111']));
  });
});

describe('admin changes in the table', () => {
  it("shows a reset from the user's detail in the table", async () => {
    setMockUsers([userRow('user-aaaa1111', 59, 4_000)]);
    await renderPanel();
    const drawer = await openUser('user-aaaa1111');
    await within(drawer).findByText('41 / 100');

    fireEvent.click(
      within(drawer).getByRole('button', { name: 'Reset limit' }),
    );

    await within(drawer).findByText('100 / 100');
    await closeDrawer(drawer);
    expect(rowOf('user-aaaa1111').getByText('100 / 100')).toBeTruthy();
  });

  it('marks a custom limit set from the detail in the table', async () => {
    setMockUsers([userRow('user-aaaa1111', 59, 4_000)]);
    await renderPanel();
    const drawer = await openUser('user-aaaa1111');
    await within(drawer).findByText('41 / 100');

    fireEvent.change(
      within(drawer).getByRole('spinbutton', { name: 'Limit every hour' }),
      { target: { value: '250' } },
    );
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save limit' }));

    await within(drawer).findByText('191 / 250');
    await closeDrawer(drawer);
    expect(rowOf('user-aaaa1111').getByText('Custom limit')).toBeTruthy();
  });

  it('shows Paused in the table and under its filter chip', async () => {
    setMockUsers([
      userRow('user-aaaa1111', 10, 4_000),
      userRow('user-bbbb2222', 20, 5_000),
    ]);
    await renderPanel();
    const drawer = await openUser('user-aaaa1111');
    await within(drawer).findByText('90 / 100');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '15 minutes' }));
    await within(drawer).findByText('Paused');
    await closeDrawer(drawer);

    expect(rowOf('user-aaaa1111').getByText('Paused')).toBeTruthy();
    fireEvent.click(chip('Paused 1'));

    await waitFor(() => expectUserIds(['user-aaaa1111']));
  });

  it('shows the pause ended once its time comes, with no update from the API', async () => {
    setMockUsers([
      userRow('user-aaaa1111', 100, 4_000, {
        status: 'paused',
        pausedUntil: new Date(Date.now() + 1000).toISOString(),
      }),
    ]);
    await renderPanel();
    const drawer = await openUser('user-aaaa1111');
    await within(drawer).findByRole('button', { name: 'Unlock' });

    expect(
      await within(drawer).findByText('On', {}, { timeout: 4000 }),
    ).toBeTruthy();
    expect(within(drawer).getByText('Exceeded')).toBeTruthy();
    await closeDrawer(drawer);
    expect(rowOf('user-aaaa1111').getByText('Exceeded')).toBeTruthy();
  });

  it('resets the ticked users together from the selection toolbar, in place of the filters', async () => {
    setMockUsers([
      userRow('user-aaaa1111', 59, 4_000),
      userRow('user-bbbb2222', 100, 8_000),
      userRow('user-cccc3333', 20, 12_000),
    ]);
    await renderPanel();

    fireEvent.click(
      rowOf('user-aaaa1111').getByRole('checkbox', {
        name: 'Select user-aaaa1111',
      }),
    );
    fireEvent.click(
      rowOf('user-bbbb2222').getByRole('checkbox', {
        name: 'Select user-bbbb2222',
      }),
    );

    // Ticking a row doesn't open its user.
    expect(screen.queryByRole('dialog')).toBeNull();
    const toolbar = within(
      screen.getByRole('toolbar', { name: 'Selected users' }),
    );
    expect(toolbar.getByText('2 users selected')).toBeTruthy();
    expect(
      screen.queryByRole('group', { name: 'Filter by status' }),
    ).toBeNull();

    fireEvent.click(
      toolbar.getByRole('button', { name: 'Reset their limits' }),
    );

    expect(await rowOf('user-aaaa1111').findByText('100 / 100')).toBeTruthy();
    expect(rowOf('user-bbbb2222').getByText('100 / 100')).toBeTruthy();
    expect(rowOf('user-cccc3333').getByText('80 / 100')).toBeTruthy();
    expect(
      screen.getByRole('group', { name: 'Filter by status' }),
    ).toBeTruthy();
    expectUserIds(['user-aaaa1111', 'user-bbbb2222', 'user-cccc3333']);
  });

  it('ticks every user shown from the header, and clears the selection', async () => {
    setMockUsers([
      userRow('user-aaaa1111', 59, 4_000),
      userRow('user-bbbb2222', 10, 8_000),
    ]);
    await renderPanel();

    fireEvent.click(
      usersTable().getByRole('checkbox', { name: 'Select every user shown' }),
    );

    expect(screen.getByText('2 users selected')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(
      screen.getByRole('group', { name: 'Filter by status' }),
    ).toBeTruthy();
  });

  it('keeps the selection and the numbers when a bulk reset fails', async () => {
    server.use(
      http.post(
        '/api/admin/users/reset',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    setMockUsers([userRow('user-aaaa1111', 59, 4_000)]);
    await renderPanel();
    fireEvent.click(
      rowOf('user-aaaa1111').getByRole('checkbox', {
        name: 'Select user-aaaa1111',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset their limits' }));

    expect(
      await screen.findByText("Couldn't reset their limits. Try again."),
    ).toBeTruthy();
    expect(screen.getByText('1 user selected')).toBeTruthy();
    expect(rowOf('user-aaaa1111').getByText('41 / 100')).toBeTruthy();
  });
});
