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
import type { UserRow } from '@ratewatch/contracts';
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
    const type = (q: string) =>
      fireEvent.change(
        page().getByRole('searchbox', { name: 'Search user ID' }),
        { target: { value: q } },
      );
    /** Types `q` and waits out the pause the search waits for (300 ms), so the next wait has all its time for the fetch. */
    const search = async (q: string) => {
      type(q);
      await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
    };
    const header = (name: string) =>
      usersTable().getByRole('columnheader', { name });

    beforeEach(async () => {
      setMockUsers([ok, warning, exceeded, paused, ended]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
      await page().findByRole('table', { name: 'Users' });
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
        const q = new URL(request.url).searchParams.get('q');
        if (q) searched.push(q);
      };
      server.events.on('request:start', onRequest);

      for (const q of ['u', 'us', 'user-a', 'user-aa']) type(q);

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
      await search('user-aa');

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
      await search('user-aa');

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

  describe('user detail', () => {
    const openUser = async (userId: string) => {
      fireEvent.click(
        within(await page().findByRole('table', { name: 'Users' })).getByRole(
          'button',
          { name: userId },
        ),
      );
      return screen.findByRole('dialog', { name: userId });
    };
    const recentRequests = (drawer: HTMLElement) =>
      within(
        within(drawer).getByRole('list', { name: 'Recent requests' }),
      ).getAllByRole('listitem');

    it("shows the user's stats, recent requests and activity, with the focus on the close button", async () => {
      freezeClock();
      setMockUsers([
        userRow('user-aaaa1111', 59, 4_000),
        userRow('user-bbbb2222', 10, minuteMs),
      ]);
      await renderApp('/dashboard', { signedInAs: 'admin' });

      const drawer = await openUser('user-aaaa1111');

      const close = within(drawer).getByRole('button', {
        name: 'Close user details',
      });
      await waitFor(() =>
        expect(close).toHaveProperty('ownerDocument.activeElement', close),
      );
      expect(await within(drawer).findByText('41 / 100')).toBeTruthy();
      expect(within(drawer).getByText('59%')).toBeTruthy();
      expect(within(drawer).getByText('OK')).toBeTruthy();
      expect(within(drawer).getByText('4 s ago')).toBeTruthy();
      expect(recentRequests(drawer)).toHaveLength(50);
      // The activity is its own request, so it may arrive after the rest.
      expect(
        await within(drawer).findByText(
          '50 accepted and 0 refused in the past hour.',
        ),
      ).toBeTruthy();

      fireEvent.click(within(drawer).getByRole('button', { name: 'Past day' }));

      expect(
        await within(drawer).findByText(
          '50 accepted and 0 refused in the past day.',
        ),
      ).toBeTruthy();
      expect(
        within(drawer).getByRole('button', { name: 'Past day' }),
      ).toHaveProperty('ariaPressed', 'true');
    });

    it("streams the open user's requests and numbers as they happen", async () => {
      const user = userRow('user-aaaa1111', 10, 30_000);
      setMockUsers([user]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
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
      await renderApp('/dashboard', { signedInAs: 'admin' });
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

    it('closes with Esc or the close button', async () => {
      setMockUsers([userRow('user-aaaa1111', 10, 30_000)]);
      await renderApp('/dashboard', { signedInAs: 'admin' });

      fireEvent.keyDown(await openUser('user-aaaa1111'), { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

      fireEvent.click(
        within(await openUser('user-aaaa1111')).getByRole('button', {
          name: 'Close user details',
        }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it("keeps the table's order while a user is open, then re-sorts", async () => {
      const first = userRow('user-aaaa1111', 50, 5_000);
      const second = userRow('user-bbbb2222', 20, minuteMs);
      setMockUsers([first, second]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
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

      fireEvent.keyDown(drawer, { key: 'Escape' });

      await waitFor(() => expectUserIds(['user-bbbb2222', 'user-aaaa1111']));
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
      await renderApp('/dashboard', { signedInAs: 'admin' });
      const drawer = await openUser('user-aaaa1111');

      fireEvent.click(
        await within(drawer).findByRole('button', { name: 'Retry' }),
      );

      expect(await within(drawer).findByText('90 / 100')).toBeTruthy();
    });
  });

  describe('admin controls', () => {
    const openUser = async (userId: string) => {
      fireEvent.click(
        within(await page().findByRole('table', { name: 'Users' })).getByRole(
          'button',
          { name: userId },
        ),
      );
      return screen.findByRole('dialog', { name: userId });
    };

    it("resets a user's limit from their detail, in the drawer and the table", async () => {
      setMockUsers([userRow('user-aaaa1111', 59, 4_000)]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
      const drawer = await openUser('user-aaaa1111');
      await within(drawer).findByText('41 / 100');

      fireEvent.click(
        within(drawer).getByRole('button', { name: 'Reset limit' }),
      );

      expect(await within(drawer).findByText('100 / 100')).toBeTruthy();
      expect(within(drawer).getByText('0%')).toBeTruthy();
      fireEvent.keyDown(drawer, { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(rowOf('user-aaaa1111').getByText('100 / 100')).toBeTruthy();
    });

    it('adds 10 requests to the current window', async () => {
      setMockUsers([userRow('user-aaaa1111', 100, 4_000)]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
      const drawer = await openUser('user-aaaa1111');
      await within(drawer).findByText('0 / 100');

      fireEvent.click(
        within(drawer).getByRole('button', { name: 'Add 10 requests' }),
      );

      expect(await within(drawer).findByText('10 / 110')).toBeTruthy();
      expect(within(drawer).getByText('Warning')).toBeTruthy();
    });

    it('offers no extra requests past a limit of 1,000, or without an open window', async () => {
      setMockUsers([
        userRow('user-aaaa1111', 10, 4_000, { limit: 995 }),
        userRow('user-bbbb2222', 0, 4_000, { resetAt: null }),
      ]);
      await renderApp('/dashboard', { signedInAs: 'admin' });

      const full = await openUser('user-aaaa1111');
      await within(full).findByText('985 / 995');
      expect(
        within(full).getByRole('button', { name: 'Add 10 requests' }),
      ).toHaveProperty('disabled', true);
      expect(
        within(full).getByText("A limit can't go above 1,000."),
      ).toBeTruthy();
      fireEvent.keyDown(full, { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

      const ended = await openUser('user-bbbb2222');
      await within(ended).findByText('100 / 100');
      expect(
        within(ended).getByRole('button', { name: 'Add 10 requests' }),
      ).toHaveProperty('disabled', true);
    });

    it('says when a change fails', async () => {
      server.use(
        http.post(
          '/api/admin/users/:id/reset',
          () => new HttpResponse(null, { status: 503 }),
        ),
      );
      setMockUsers([userRow('user-aaaa1111', 59, 4_000)]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
      const drawer = await openUser('user-aaaa1111');
      await within(drawer).findByText('41 / 100');

      fireEvent.click(
        within(drawer).getByRole('button', { name: 'Reset limit' }),
      );

      expect(
        await within(drawer).findByText(
          "Couldn't reset user-aaaa1111's limit. Try again.",
        ),
      ).toBeTruthy();
      expect(within(drawer).getByText('41 / 100')).toBeTruthy();
    });

    it('resets the ticked users together from the selection toolbar, in place of the filters', async () => {
      setMockUsers([
        userRow('user-aaaa1111', 59, 4_000),
        userRow('user-bbbb2222', 100, 8_000),
        userRow('user-cccc3333', 20, 12_000),
      ]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
      await page().findByRole('table', { name: 'Users' });

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
        page().getByRole('toolbar', { name: 'Selected users' }),
      );
      expect(toolbar.getByText('2 users selected')).toBeTruthy();
      expect(
        page().queryByRole('group', { name: 'Filter by status' }),
      ).toBeNull();

      fireEvent.click(
        toolbar.getByRole('button', { name: 'Reset their limits' }),
      );

      expect(await rowOf('user-aaaa1111').findByText('100 / 100')).toBeTruthy();
      expect(rowOf('user-bbbb2222').getByText('100 / 100')).toBeTruthy();
      expect(rowOf('user-cccc3333').getByText('80 / 100')).toBeTruthy();
      expect(
        page().getByRole('group', { name: 'Filter by status' }),
      ).toBeTruthy();
      expectUserIds(['user-aaaa1111', 'user-bbbb2222', 'user-cccc3333']);
    });

    it('keeps the selection and says so when a bulk reset fails', async () => {
      server.use(
        http.post(
          '/api/admin/users/reset',
          () => new HttpResponse(null, { status: 503 }),
        ),
      );
      setMockUsers([userRow('user-aaaa1111', 59, 4_000)]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
      await page().findByRole('table', { name: 'Users' });
      fireEvent.click(
        rowOf('user-aaaa1111').getByRole('checkbox', {
          name: 'Select user-aaaa1111',
        }),
      );

      fireEvent.click(
        page().getByRole('button', { name: 'Reset their limits' }),
      );

      expect(
        await page().findByText("Couldn't reset their limits. Try again."),
      ).toBeTruthy();
      expect(page().getByText('1 user selected')).toBeTruthy();
      expect(rowOf('user-aaaa1111').getByText('41 / 100')).toBeTruthy();
    });

    it('ticks every user shown from the header', async () => {
      setMockUsers([
        userRow('user-aaaa1111', 59, 4_000),
        userRow('user-bbbb2222', 10, 8_000),
      ]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
      await page().findByRole('table', { name: 'Users' });

      fireEvent.click(
        usersTable().getByRole('checkbox', { name: 'Select every user shown' }),
      );

      expect(page().getByText('2 users selected')).toBeTruthy();

      fireEvent.click(page().getByRole('button', { name: 'Clear selection' }));

      expect(
        page().getByRole('group', { name: 'Filter by status' }),
      ).toBeTruthy();
    });

    it("applies another admin's change to a user, though the row looks older", async () => {
      const user = userRow('user-aaaa1111', 59, 4_000);
      setMockUsers([user]);
      await renderApp('/dashboard', { signedInAs: 'admin' });
      await page().findByRole('table', { name: 'Users' });

      act(() =>
        sendRateUpdate({
          row: { ...user, requestsLeft: 100, resetAt: null },
          requests: [],
          byAdmin: true,
        }),
      );

      expect(await rowOf('user-aaaa1111').findByText('100 / 100')).toBeTruthy();
    });

    describe('custom limit', () => {
      const limitField = (drawer: HTMLElement) =>
        within(drawer).getByRole('spinbutton', { name: 'Limit per hour' });
      const saveLimit = (drawer: HTMLElement) =>
        within(drawer).getByRole('button', { name: 'Save limit' });
      const typeLimit = (drawer: HTMLElement, value: string) =>
        fireEvent.change(limitField(drawer), { target: { value } });
      const openWith = async (row: UserRow, shown: string) => {
        setMockUsers([row]);
        await renderApp('/dashboard', { signedInAs: 'admin' });
        const drawer = await openUser(row.userId);
        await within(drawer).findByText(shown);
        return drawer;
      };

      it('sets a limit for every window, marked in the table', async () => {
        const drawer = await openWith(
          userRow('user-aaaa1111', 59, 4_000),
          '41 / 100',
        );
        expect(limitField(drawer)).toHaveProperty('value', '100');
        expect(saveLimit(drawer)).toHaveProperty('disabled', true);

        typeLimit(drawer, '250');
        fireEvent.click(saveLimit(drawer));

        expect(await within(drawer).findByText('191 / 250')).toBeTruthy();
        expect(limitField(drawer)).toHaveProperty('value', '250');
        fireEvent.keyDown(drawer, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(rowOf('user-aaaa1111').getByText('Custom limit')).toBeTruthy();
      });

      it('warns only when the next request would be refused', async () => {
        const drawer = await openWith(
          userRow('user-aaaa1111', 59, 4_000),
          '41 / 100',
        );
        const warning =
          'user-aaaa1111 has already used 59 requests this hour, so their next one will be refused.';

        typeLimit(drawer, '60');
        expect(within(drawer).queryByText(warning)).toBeNull();

        typeLimit(drawer, '59');
        expect(within(drawer).getByText(warning)).toBeTruthy();
        expect(saveLimit(drawer)).toHaveProperty('disabled', false);
      });

      it("counts this window's extra requests before warning", async () => {
        // 60 used of 100 plus 10 extra requests.
        const drawer = await openWith(
          userRow('user-aaaa1111', 60, 4_000, { limit: 110, baseLimit: 100 }),
          '50 / 110',
        );

        typeLimit(drawer, '55');
        expect(within(drawer).queryByRole('alert')).toBeNull();

        typeLimit(drawer, '50');
        expect(within(drawer).getByRole('alert')).toHaveProperty(
          'textContent',
          expect.stringContaining('their next one will be refused'),
        );
      });

      it('says a paused user is refused only once the pause ends', async () => {
        const drawer = await openWith(
          userRow('user-aaaa1111', 59, 4_000, {
            status: 'paused',
            pausedUntil: new Date(Date.now() + 15 * minuteMs).toISOString(),
          }),
          '41 / 100',
        );

        typeLimit(drawer, '50');

        expect(
          within(drawer).getByText(
            'user-aaaa1111 has already used 59 requests this hour, so their requests will be refused once their pause ends.',
          ),
        ).toBeTruthy();
      });

      it.each(['0', '1001', '2.5', ''])(
        'refuses a limit of "%s", as the API does',
        async (value) => {
          const drawer = await openWith(
            userRow('user-aaaa1111', 59, 4_000),
            '41 / 100',
          );

          typeLimit(drawer, value);

          expect(
            within(drawer).getByText('Enter a whole number from 1 to 1,000.'),
          ).toBeTruthy();
          expect(saveLimit(drawer)).toHaveProperty('disabled', true);
        },
      );

      it("keeps the limit and this window's extra requests at 1,000 or under", async () => {
        const drawer = await openWith(
          userRow('user-aaaa1111', 60, 4_000, { limit: 110, baseLimit: 100 }),
          '50 / 110',
        );

        typeLimit(drawer, '991');

        expect(
          within(drawer).getByText(
            "With 10 extra requests this hour, the limit can't go above 990.",
          ),
        ).toBeTruthy();
        expect(saveLimit(drawer)).toHaveProperty('disabled', true);

        typeLimit(drawer, '990');
        fireEvent.click(saveLimit(drawer));

        expect(await within(drawer).findByText('940 / 1000')).toBeTruthy();
      });

      it('says when saving fails', async () => {
        server.use(
          http.put(
            '/api/admin/users/:id/limit',
            () => new HttpResponse(null, { status: 503 }),
          ),
        );
        const drawer = await openWith(
          userRow('user-aaaa1111', 59, 4_000),
          '41 / 100',
        );

        typeLimit(drawer, '250');
        fireEvent.click(saveLimit(drawer));

        expect(
          await within(drawer).findByText(
            "Couldn't change user-aaaa1111's limit. Try again.",
          ),
        ).toBeTruthy();
        expect(within(drawer).getByText('41 / 100')).toBeTruthy();
      });
    });

    describe('pause and unlock', () => {
      const pauseFor = (drawer: HTMLElement, duration: string) => {
        fireEvent.click(within(drawer).getByRole('button', { name: 'Pause' }));
        fireEvent.click(screen.getByRole('menuitem', { name: duration }));
      };
      const hourMinute = (iso: string) =>
        new Date(iso).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      const pausedUser = (pausedUntil: string) =>
        userRow('user-aaaa1111', 100, 4_000, { status: 'paused', pausedUntil });

      it('pauses for 15 minutes or 1 hour, until a time in local HH:MM', async () => {
        freezeClock();
        setMockUsers([userRow('user-aaaa1111', 100, 4_000)]);
        await renderApp('/dashboard', { signedInAs: 'admin' });
        const drawer = await openUser('user-aaaa1111');
        await within(drawer).findByText('Exceeded');

        pauseFor(drawer, '15 minutes');

        expect(
          await within(drawer).findByText(
            `Paused until ${hourMinute(new Date(Date.now() + 15 * minuteMs).toISOString())}`,
          ),
        ).toBeTruthy();
        expect(within(drawer).getByText('Paused')).toBeTruthy();

        fireEvent.click(within(drawer).getByRole('button', { name: 'Unlock' }));
        await within(drawer).findByText('Exceeded');
        pauseFor(drawer, '1 hour');

        expect(
          await within(drawer).findByText(
            `Paused until ${hourMinute(new Date(Date.now() + 60 * minuteMs).toISOString())}`,
          ),
        ).toBeTruthy();
      });

      it('pauses until the next reset, which a user without an open window is not offered', async () => {
        const user = userRow('user-aaaa1111', 30, 4_000);
        setMockUsers([
          user,
          userRow('user-bbbb2222', 0, 4_000, { resetAt: null }),
        ]);
        await renderApp('/dashboard', { signedInAs: 'admin' });
        const open = await openUser('user-aaaa1111');
        await within(open).findByText('70 / 100');

        pauseFor(open, 'Until next reset');

        expect(
          await within(open).findByText(
            `Paused until ${hourMinute(user.resetAt ?? '')}`,
          ),
        ).toBeTruthy();
        fireEvent.keyDown(open, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

        const ended = await openUser('user-bbbb2222');
        await within(ended).findByText('100 / 100');
        fireEvent.click(within(ended).getByRole('button', { name: 'Pause' }));
        expect(
          screen.getByRole('menuitem', { name: 'Until next reset' }),
        ).toHaveProperty('ariaDisabled', 'true');
      });

      it('unlocks a paused user early', async () => {
        const pausedUntil = new Date(Date.now() + 40 * minuteMs).toISOString();
        setMockUsers([pausedUser(pausedUntil)]);
        await renderApp('/dashboard', { signedInAs: 'admin' });
        const drawer = await openUser('user-aaaa1111');
        await within(drawer).findByText(
          `Paused until ${hourMinute(pausedUntil)}`,
        );

        fireEvent.click(within(drawer).getByRole('button', { name: 'Unlock' }));

        expect(await within(drawer).findByText('Exceeded')).toBeTruthy();
        expect(within(drawer).getByText('On')).toBeTruthy();
        expect(
          within(drawer).getByRole('button', { name: 'Pause' }),
        ).toBeTruthy();
      });

      it('shows the pause ended once its time comes, with no update from the API', async () => {
        setMockUsers([pausedUser(new Date(Date.now() + 1000).toISOString())]);
        await renderApp('/dashboard', { signedInAs: 'admin' });
        const drawer = await openUser('user-aaaa1111');
        await within(drawer).findByRole('button', { name: 'Unlock' });

        expect(
          await within(drawer).findByText('On', {}, { timeout: 4000 }),
        ).toBeTruthy();
        expect(within(drawer).getByText('Exceeded')).toBeTruthy();
        fireEvent.keyDown(drawer, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(rowOf('user-aaaa1111').getByText('Exceeded')).toBeTruthy();
      });

      it('shows Paused in the table and under its filter chip', async () => {
        setMockUsers([
          userRow('user-aaaa1111', 10, 4_000),
          userRow('user-bbbb2222', 20, 5_000),
        ]);
        await renderApp('/dashboard', { signedInAs: 'admin' });
        const drawer = await openUser('user-aaaa1111');
        await within(drawer).findByText('90 / 100');
        pauseFor(drawer, '15 minutes');
        await within(drawer).findByText('Paused');
        fireEvent.keyDown(drawer, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

        expect(rowOf('user-aaaa1111').getByText('Paused')).toBeTruthy();
        fireEvent.click(page().getByRole('button', { name: 'Paused 1' }));

        await waitFor(() => expectUserIds(['user-aaaa1111']));
      });
    });
  });
});
