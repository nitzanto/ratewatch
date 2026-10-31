import { renderApp } from '@/libs/test-utils/render-app';
import { userRow } from '@/mocks/data/users';
import { setMockUsers } from '@/mocks/handlers/admin-users';
import { setMockSession } from '@/mocks/handlers/session';
import {
  dropRealtime,
  followedUserIds,
  refuseRealtime,
  restoreRealtime,
  sendLimitExceeded,
  sendRateUpdate,
} from '@/mocks/realtime';
import { server } from '@/mocks/node';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';

const page = () => within(screen.getByRole('main'));
const usersTable = () => within(page().getByRole('table', { name: 'Users' }));
/** Asserts the table lists exactly these users, in this order. */
const expectUserIds = (userIds: string[]) =>
  expect(usersTable().getAllByRole('rowheader')).toEqual(
    userIds.map((textContent) => expect.objectContaining({ textContent })),
  );
const rowOf = (userId: string) =>
  within(usersTable().getByRole('row', { name: new RegExp(userId) }));

const minuteMs = 60_000;

describe('Users table', () => {
  // The times on screen count from the real clock: a slow render would turn "8 s ago" into "9 s ago". Faking only
  // `Date` freezes them, while MSW, TanStack Query and the table's one-second tick keep their real timers.
  const freezeClock = () => vi.useFakeTimers({ toFake: ['Date'] });
  afterEach(() => vi.useRealTimers());

  it("shows each user's requests left, reset time, status and last request, latest first", async () => {
    freezeClock();
    setMockUsers([
      userRow('user-aaaa1111', 59, 3 * minuteMs, {
        resetAt: new Date(Date.now() + 51.5 * minuteMs).toISOString(),
      }),
      userRow('user-bbbb2222', 95, 8_000),
      userRow('user-cccc3333', 100, 20 * minuteMs),
      userRow('user-dddd4444', 120, 40_000, {
        status: 'paused',
        requestsLeft: 0,
        pausedUntil: new Date(Date.now() + 15 * minuteMs).toISOString(),
      }),
      userRow('user-eeee5555', 0, 70 * minuteMs, {
        requestsLeft: 100,
        resetAt: null,
      }),
    ]);
    await renderApp('/dashboard', { signedInAs: 'admin' });

    expect(await page().findByRole('table', { name: 'Users' })).toBeTruthy();
    expectUserIds([
      'user-bbbb2222',
      'user-dddd4444',
      'user-aaaa1111',
      'user-cccc3333',
      'user-eeee5555',
    ]);

    const ok = rowOf('user-aaaa1111');
    expect(ok.getByText('41 / 100')).toBeTruthy();
    expect(ok.getByText('in 52 min')).toBeTruthy();
    expect(ok.getByText('OK')).toBeTruthy();
    expect(ok.getByTestId('CheckCircleIcon')).toBeTruthy();
    expect(ok.getByText('3 min ago')).toBeTruthy();

    expect(rowOf('user-bbbb2222').getByText('Warning')).toBeTruthy();
    expect(rowOf('user-bbbb2222').getByText('8 s ago')).toBeTruthy();
    expect(rowOf('user-cccc3333').getByText('Exceeded')).toBeTruthy();
    expect(rowOf('user-dddd4444').getByText('Paused')).toBeTruthy();
    expect(rowOf('user-dddd4444').getByTestId('PauseCircleIcon')).toBeTruthy();
    // An ended window reads as a full limit with no reset time.
    expect(rowOf('user-eeee5555').getByText('100 / 100')).toBeTruthy();
    expect(rowOf('user-eeee5555').getByText('—')).toBeTruthy();
  });

  describe('live', () => {
    const first = userRow('user-aaaa1111', 50, 5_000);
    const second = userRow('user-bbbb2222', 20, 60_000);
    const third = userRow('user-cccc3333', 10, 2 * minuteMs);
    const update = (row: typeof first) =>
      act(() => sendRateUpdate({ row, requests: [] }));
    const requestFrom = (row: typeof first, used: number) => ({
      ...row,
      requestsLeft: row.limit - used,
      lastRequestAt: new Date().toISOString(),
    });

    beforeEach(async () => {
      setMockUsers([first, second, third]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
      await page().findByRole('table', { name: 'Users' });
    });

    it('follows the users on screen, so the API sends only their updates', () => {
      expect(followedUserIds()).toEqual([
        'user-aaaa1111',
        'user-bbbb2222',
        'user-cccc3333',
      ]);
    });

    it('updates a row in place and flashes it', async () => {
      update(requestFrom(second, 21));

      expect(await rowOf('user-bbbb2222').findByText('79 / 100')).toBeTruthy();
      expect(
        usersTable().getByRole('row', { name: /user-bbbb2222/ }),
      ).toHaveProperty('dataset.flash');
      expect(
        usersTable().getByRole('row', { name: /user-cccc3333/ }),
      ).not.toHaveProperty('dataset.flash');
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

    it('keeps the order while the pointer is on the table, then re-sorts', async () => {
      const table = page().getByRole('table', { name: 'Users' });

      fireEvent.pointerEnter(table);
      update(requestFrom(third, 11));

      expect(await rowOf('user-cccc3333').findByText('89 / 100')).toBeTruthy();
      expectUserIds(['user-aaaa1111', 'user-bbbb2222', 'user-cccc3333']);

      fireEvent.pointerLeave(table);

      expectUserIds(['user-cccc3333', 'user-aaaa1111', 'user-bbbb2222']);
    });

    it('re-sorts at once while the pointer is off the table', async () => {
      update(requestFrom(third, 11));

      await waitFor(() =>
        expect(usersTable().getAllByRole('rowheader')[0]).toHaveProperty(
          'textContent',
          'user-cccc3333',
        ),
      );
    });
  });

  describe('connection', () => {
    beforeEach(() => {
      freezeClock();
      setMockUsers([userRow('user-aaaa1111', 50, 5_000)]);
    });

    it('shows a banner and freezes the times while the connection is lost, keeping the data', async () => {
      await renderApp('/dashboard', { signedInAs: 'admin' });
      expect(await page().findByText('5 s ago')).toBeTruthy();

      act(() => dropRealtime());
      vi.setSystemTime(Date.now() + 60_000);

      expect(page().getByRole('alert')).toHaveProperty(
        'textContent',
        expect.stringMatching(/Connection lost/),
      );
      expect(rowOf('user-aaaa1111').getByText('5 s ago')).toBeTruthy();
      expect(rowOf('user-aaaa1111').getByText('50 / 100')).toBeTruthy();

      act(() => restoreRealtime());

      expect(page().queryByRole('alert')).toBeNull();
      // On the table's next one-second tick.
      expect(
        await rowOf('user-aaaa1111').findByText('1 min ago', undefined, {
          timeout: 2000,
        }),
      ).toBeTruthy();
    });

    it('shows the live connection in the app bar', async () => {
      await renderApp('/dashboard', { signedInAs: 'admin' });
      const pill = () => within(screen.getByRole('banner')).getByRole('status');

      await waitFor(() =>
        expect(pill()).toHaveProperty('textContent', 'Live · API OK'),
      );

      act(() => dropRealtime());

      expect(pill()).toHaveProperty('textContent', 'Reconnecting · API OK');
    });

    it('sends the admin to sign in when the live connection is refused because their session ended', async () => {
      await renderApp('/dashboard', { signedInAs: 'admin' });
      await page().findByText('50 / 100');

      setMockSession(null);
      act(() => refuseRealtime());

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Sign in' }),
      ).toBeTruthy();
    });

    it('refetches the users when the connection is back', async () => {
      await renderApp('/dashboard', { signedInAs: 'admin' });
      await page().findByText('50 / 100');

      act(() => dropRealtime());
      setMockUsers([userRow('user-aaaa1111', 70, 1_000)]);
      act(() => restoreRealtime());

      expect(await rowOf('user-aaaa1111').findByText('30 / 100')).toBeTruthy();
    });
  });

  describe('search, filters and sorting', () => {
    const ok = userRow('user-aaaa1111', 10, 2 * minuteMs);
    const warning = userRow('user-aabb2222', 95, 30_000);
    const exceeded = userRow('user-cccc3333', 100, 5 * minuteMs);
    const paused = userRow('user-dddd4444', 50, 40 * minuteMs, {
      status: 'paused',
      pausedUntil: new Date(Date.now() + 15 * minuteMs).toISOString(),
    });
    const ended = userRow('user-eeee5555', 0, 3 * 60 * minuteMs, {
      resetAt: null,
    });
    const chip = (name: string) => page().getByRole('button', { name });
    const search = (q: string) =>
      fireEvent.change(
        page().getByRole('searchbox', { name: 'Search user ID' }),
        { target: { value: q } },
      );
    const header = (name: string) =>
      usersTable().getByRole('columnheader', { name });

    beforeEach(async () => {
      setMockUsers([ok, warning, exceeded, paused, ended]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
      await page().findByRole('table', { name: 'Users' });
    });

    it('finds users by a prefix of their ID, or the whole ID', async () => {
      search('user-aa');

      await waitFor(() => expectUserIds(['user-aabb2222', 'user-aaaa1111']));

      search('user-cccc3333');

      await waitFor(() => expectUserIds(['user-cccc3333']));
    });

    it('searches once typing pauses, not on every keystroke', async () => {
      const searched: string[] = [];
      const onRequest = ({ request }: { request: Request }) => {
        const q = new URL(request.url).searchParams.get('q');
        if (q) searched.push(q);
      };
      server.events.on('request:start', onRequest);

      for (const q of ['u', 'us', 'user-a', 'user-aa']) search(q);

      await waitFor(() => expectUserIds(['user-aabb2222', 'user-aaaa1111']));
      server.events.removeListener('request:start', onRequest);
      expect(searched).toEqual(['user-aa']);
    });

    it("counts each status on its chip, and shows only that status's users when picked", async () => {
      expect(chip('All 5')).toHaveProperty('ariaPressed', 'true');
      expect(chip('OK 2')).toBeTruthy();
      expect(chip('Exceeded 1')).toBeTruthy();
      expect(chip('Paused 1')).toBeTruthy();

      fireEvent.click(chip('Warning 1'));

      await waitFor(() => expectUserIds(['user-aabb2222']));
      expect(chip('Warning 1')).toHaveProperty('ariaPressed', 'true');
      expect(chip('All 5')).toHaveProperty('ariaPressed', 'false');

      fireEvent.click(chip('Paused 1'));

      await waitFor(() => expectUserIds(['user-dddd4444']));
    });

    it('counts under the search', async () => {
      search('user-aa');

      expect(await page().findByRole('button', { name: 'All 2' })).toBeTruthy();
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
        await page().findByRole('button', { name: 'Warning 2' }),
      ).toBeTruthy();
      expect(chip('OK 1')).toBeTruthy();
    });

    it('filters by when users were last active', async () => {
      fireEvent.mouseDown(
        page().getByRole('combobox', { name: 'Last active' }),
      );
      fireEvent.click(screen.getByRole('option', { name: 'Last 15 minutes' }));

      await waitFor(() =>
        expectUserIds(['user-aabb2222', 'user-aaaa1111', 'user-cccc3333']),
      );
      expect(chip('All 3')).toBeTruthy();
    });

    it('sorts by a column from its header, ended windows last', async () => {
      expect(header('Last request')).toHaveProperty('ariaSort', 'descending');

      fireEvent.click(within(header('Requests left')).getByRole('button'));

      await waitFor(() =>
        expectUserIds([
          'user-cccc3333',
          'user-aabb2222',
          'user-dddd4444',
          'user-aaaa1111',
          'user-eeee5555',
        ]),
      );
      expect(header('Requests left')).toHaveProperty('ariaSort', 'ascending');
      expect(header('Last request')).toHaveProperty('ariaSort', null);

      fireEvent.click(within(header('Requests left')).getByRole('button'));

      await waitFor(() =>
        expectUserIds([
          'user-aaaa1111',
          'user-dddd4444',
          'user-aabb2222',
          'user-cccc3333',
          'user-eeee5555',
        ]),
      );
      expect(header('Requests left')).toHaveProperty('ariaSort', 'descending');
    });

    it('sorts at once though the pointer is on the table to click the header, then holds the new order', async () => {
      const table = page().getByRole('table', { name: 'Users' });
      const byRequestsLeft = [
        'user-cccc3333',
        'user-aabb2222',
        'user-dddd4444',
        'user-aaaa1111',
        'user-eeee5555',
      ];
      fireEvent.pointerEnter(table);

      fireEvent.click(within(header('Requests left')).getByRole('button'));

      await waitFor(() => expectUserIds(byRequestsLeft));

      fireEvent.pointerMove(table);
      act(() =>
        sendRateUpdate({
          row: { ...ok, requestsLeft: 1, status: 'warning' },
          requests: [],
        }),
      );

      expect(await rowOf('user-aaaa1111').findByText('1 / 100')).toBeTruthy();
      expectUserIds(byRequestsLeft);
    });

    it('says when nothing matches, and clears the filters', async () => {
      fireEvent.click(chip('Exceeded 1'));
      search('user-aa');

      expect(
        await page().findByText(
          'No users match this search and these filters.',
        ),
      ).toBeTruthy();

      fireEvent.click(
        page().getAllByRole('button', { name: 'Clear filters' })[0],
      );

      await waitFor(() =>
        expect(usersTable().getAllByRole('rowheader')).toHaveLength(5),
      );
      expect(chip('All 5')).toHaveProperty('ariaPressed', 'true');
    });
  });

  it('pages through the users', async () => {
    setMockUsers(
      Array.from({ length: 26 }, (_, i) =>
        userRow(`user-${String(i).padStart(2, '0')}`, 1, i * 1000),
      ),
    );
    await renderApp('/dashboard', { signedInAs: 'admin' });
    await page().findByRole('table', { name: 'Users' });

    expect(page().getByText('1–25 of 26')).toBeTruthy();

    fireEvent.click(page().getByRole('button', { name: 'Go to next page' }));

    await waitFor(() => expectUserIds(['user-25']));
  });

  it('points to the cookie clicker when there are no users yet', async () => {
    setMockUsers([]);
    await renderApp('/dashboard', { signedInAs: 'admin' });

    expect(await page().findByText('No users yet')).toBeTruthy();
    expect(
      page().getByRole('link', { name: 'Open the Cookie Clicker' }),
    ).toHaveProperty('pathname', '/play');
  });

  it('offers a retry when the users fail to load', async () => {
    server.use(
      http.get(
        '/api/admin/users',
        () => new HttpResponse(null, { status: 503 }),
        { once: true },
      ),
    );
    await renderApp('/dashboard', { signedInAs: 'admin' });

    fireEvent.click(await page().findByRole('button', { name: 'Retry' }));

    expect(await page().findByRole('table', { name: 'Users' })).toBeTruthy();
  });
});
