import { userRow } from '@/mocks/data/users';
import { setMockUsers } from '@/mocks/handlers/users';
import { server } from '@/mocks/node';
import { renderWithProviders } from '@/test/render-app';
import { freezeClock, minuteMs } from '@/test/users-table';
import type { UserRow } from '@ratewatch/contracts';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { UserDrawer } from '../user-drawer';
import { AdminControls } from './admin-controls';

/**
 * A change shows in the user's numbers above the controls, so these render the controls inside the drawer, as the
 * user `row`, and wait until it shows `shown`.
 */
const openDrawer = async (row: UserRow, shown: string) => {
  setMockUsers([row]);
  await renderWithProviders(
    <UserDrawer userId={row.userId} frozenAt={null} onClose={vi.fn()} />,
    { signedInAs: 'admin' },
  );
  const drawer = await screen.findByRole('dialog', { name: row.userId });
  await within(drawer).findByText(shown);

  return drawer;
};

const renderControls = (row: UserRow) =>
  renderWithProviders(<AdminControls row={row} />, { signedInAs: 'admin' });

const hourMinute = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const pauseFor = (drawer: HTMLElement, duration: string) => {
  fireEvent.click(within(drawer).getByRole('button', { name: 'Pause' }));
  fireEvent.click(screen.getByRole('menuitem', { name: duration }));
};

afterEach(() => vi.useRealTimers());

it("resets a user's limit", async () => {
  const drawer = await openDrawer(
    userRow('user-aaaa1111', 59, 4_000),
    '41 / 100',
  );

  fireEvent.click(within(drawer).getByRole('button', { name: 'Reset limit' }));

  expect(await within(drawer).findByText('100 / 100')).toBeTruthy();
  expect(within(drawer).getByText('0%')).toBeTruthy();
});

it('adds 10 requests to the current window', async () => {
  const drawer = await openDrawer(
    userRow('user-aaaa1111', 100, 4_000),
    '0 / 100',
  );

  fireEvent.click(
    within(drawer).getByRole('button', { name: 'Add 10 requests' }),
  );

  expect(await within(drawer).findByText('10 / 110')).toBeTruthy();
  expect(within(drawer).getByText('Warning')).toBeTruthy();
});

it('offers no extra requests past a limit of 1,000', async () => {
  await renderControls(userRow('user-aaaa1111', 10, 4_000, { limit: 995 }));

  expect(
    screen.getByRole('button', { name: 'Add 10 requests' }),
  ).toHaveProperty('disabled', true);
  expect(screen.getByText("A limit can't go above 1,000.")).toBeTruthy();
});

it('offers no extra requests without an open window', async () => {
  await renderControls(userRow('user-bbbb2222', 0, 4_000, { resetAt: null }));

  expect(
    screen.getByRole('button', { name: 'Add 10 requests' }),
  ).toHaveProperty('disabled', true);
});

it('says when a change fails', async () => {
  server.use(
    http.post(
      '/api/admin/users/:id/reset',
      () => new HttpResponse(null, { status: 503 }),
    ),
  );
  const drawer = await openDrawer(
    userRow('user-aaaa1111', 59, 4_000),
    '41 / 100',
  );

  fireEvent.click(within(drawer).getByRole('button', { name: 'Reset limit' }));

  expect(
    await within(drawer).findByText(
      "Couldn't reset user-aaaa1111's limit. Try again.",
    ),
  ).toBeTruthy();
  expect(within(drawer).getByText('41 / 100')).toBeTruthy();
});

describe('custom limit', () => {
  const typeLimit = (drawer: HTMLElement, value: string) =>
    fireEvent.change(
      within(drawer).getByRole('spinbutton', { name: 'Limit every hour' }),
      { target: { value } },
    );
  const save = (drawer: HTMLElement) =>
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save limit' }));

  it('sets a limit for every window', async () => {
    const drawer = await openDrawer(
      userRow('user-aaaa1111', 59, 4_000),
      '41 / 100',
    );

    typeLimit(drawer, '250');
    save(drawer);

    expect(await within(drawer).findByText('191 / 250')).toBeTruthy();
    expect(
      within(drawer).getByRole('spinbutton', { name: 'Limit every hour' }),
    ).toHaveProperty('value', '250');
  });

  it("keeps this window's extra requests on top of a new limit", async () => {
    const drawer = await openDrawer(
      userRow('user-aaaa1111', 60, 4_000, { limit: 110, baseLimit: 100 }),
      '50 / 110',
    );

    typeLimit(drawer, '990');
    save(drawer);

    expect(await within(drawer).findByText('940 / 1000')).toBeTruthy();
  });

  it('says when saving fails', async () => {
    server.use(
      http.put(
        '/api/admin/users/:id/limit',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    const drawer = await openDrawer(
      userRow('user-aaaa1111', 59, 4_000),
      '41 / 100',
    );

    typeLimit(drawer, '250');
    save(drawer);

    expect(
      await within(drawer).findByText(
        "Couldn't change user-aaaa1111's limit. Try again.",
      ),
    ).toBeTruthy();
    expect(within(drawer).getByText('41 / 100')).toBeTruthy();
  });
});

describe('pause and unlock', () => {
  it('pauses for 15 minutes or 1 hour, until a time in local HH:MM', async () => {
    freezeClock();
    const drawer = await openDrawer(
      userRow('user-aaaa1111', 100, 4_000),
      'Exceeded',
    );

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

  it('pauses until the next reset', async () => {
    const user = userRow('user-aaaa1111', 30, 4_000);
    const drawer = await openDrawer(user, '70 / 100');

    pauseFor(drawer, 'Until next reset');

    expect(
      await within(drawer).findByText(
        `Paused until ${hourMinute(user.resetAt ?? '')}`,
      ),
    ).toBeTruthy();
  });

  it('offers no pause until the next reset to a user without an open window', async () => {
    await renderControls(userRow('user-bbbb2222', 0, 4_000, { resetAt: null }));

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    expect(
      screen.getByRole('menuitem', { name: 'Until next reset' }),
    ).toHaveProperty('ariaDisabled', 'true');
  });

  it('unlocks a paused user early', async () => {
    const pausedUntil = new Date(Date.now() + 40 * minuteMs).toISOString();
    const drawer = await openDrawer(
      userRow('user-aaaa1111', 100, 4_000, { status: 'paused', pausedUntil }),
      `Paused until ${hourMinute(pausedUntil)}`,
    );

    fireEvent.click(within(drawer).getByRole('button', { name: 'Unlock' }));

    expect(await within(drawer).findByText('Exceeded')).toBeTruthy();
    expect(within(drawer).getByText('On')).toBeTruthy();
    expect(within(drawer).getByRole('button', { name: 'Pause' })).toBeTruthy();
  });
});
