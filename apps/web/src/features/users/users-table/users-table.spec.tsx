import { AppProviders, createQueryClient } from '@/app/providers';
import { userRow } from '@/mocks/data/users';
import {
  expectUserIds,
  freezeClock,
  minuteMs,
  rowOf,
  usersTable,
} from '@/test/users-table';
import type { UserRow } from '@ratewatch/contracts';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { UsersTable } from './users-table';

type TableProps = ComponentProps<typeof UsersTable>;

/** Renders the table with `rows`, and returns a function that re-renders it with some props changed, as the panel would. */
const renderTable = (props: Partial<TableProps> & { rows: UserRow[] }) => {
  let current: TableProps = {
    frozenAt: null,
    sort: 'lastRequest',
    order: 'desc',
    onSort: vi.fn(),
    openUserId: null,
    onOpen: vi.fn(),
    selectedUserIds: [],
    onSelect: vi.fn(),
    ...props,
  };
  const queryClient = createQueryClient();
  const view = render(<UsersTable {...current} />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppProviders queryClient={queryClient}>{children}</AppProviders>
    ),
  });

  return (changes: Partial<TableProps>) => {
    current = { ...current, ...changes };
    view.rerender(<UsersTable {...current} />);

    return current;
  };
};

const header = (name: string) =>
  usersTable().getByRole('columnheader', { name });

afterEach(() => vi.useRealTimers());

it("shows each user's requests left, reset time, status and last request, latest first", () => {
  freezeClock();
  renderTable({
    rows: [
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
    ],
  });

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
  const requestFrom = (row: UserRow, used: number) => ({
    ...row,
    requestsLeft: row.limit - used,
    lastRequestAt: new Date().toISOString(),
  });

  it('flashes the row whose user changed', () => {
    const rerender = renderTable({ rows: [first, second, third] });

    rerender({ rows: [first, requestFrom(second, 21), third] });

    expect(rowOf('user-bbbb2222').getByText('79 / 100')).toBeTruthy();
    expect(
      usersTable().getByRole('row', { name: /user-bbbb2222/ }),
    ).toHaveProperty('dataset.flash');
    expect(
      usersTable().getByRole('row', { name: /user-cccc3333/ }),
    ).not.toHaveProperty('dataset.flash');
  });

  it('keeps the order while the pointer is on the table, then re-sorts', () => {
    const rerender = renderTable({ rows: [first, second, third] });
    const table = screen.getByRole('table', { name: 'Users' });

    fireEvent.pointerEnter(table);
    rerender({ rows: [first, second, requestFrom(third, 11)] });

    expect(rowOf('user-cccc3333').getByText('89 / 100')).toBeTruthy();
    expectUserIds(['user-aaaa1111', 'user-bbbb2222', 'user-cccc3333']);

    fireEvent.pointerLeave(table);

    expectUserIds(['user-cccc3333', 'user-aaaa1111', 'user-bbbb2222']);
  });

  it('re-sorts at once while the pointer is off the table', () => {
    const rerender = renderTable({ rows: [first, second, third] });

    rerender({ rows: [first, second, requestFrom(third, 11)] });

    expectUserIds(['user-cccc3333', 'user-aaaa1111', 'user-bbbb2222']);
  });
});

describe('sorting', () => {
  const ok = userRow('user-aaaa1111', 10, 2 * minuteMs);
  const rows = [
    ok,
    userRow('user-aabb2222', 95, 30_000),
    userRow('user-cccc3333', 100, 5 * minuteMs),
    userRow('user-dddd4444', 50, 40 * minuteMs, {
      status: 'paused',
      pausedUntil: new Date(Date.now() + 15 * minuteMs).toISOString(),
    }),
    userRow('user-eeee5555', 0, 3 * 60 * minuteMs, { resetAt: null }),
  ];
  const byRequestsLeft = [
    'user-cccc3333',
    'user-aabb2222',
    'user-dddd4444',
    'user-aaaa1111',
    'user-eeee5555',
  ];

  it('sorts by a column from its header, ended windows last', () => {
    const onSort = vi.fn();
    const rerender = renderTable({ rows, onSort });
    expect(header('Last request')).toHaveProperty('ariaSort', 'descending');

    fireEvent.click(within(header('Requests left')).getByRole('button'));

    expect(onSort).toHaveBeenLastCalledWith('left', 'asc');
    rerender({ sort: 'left', order: 'asc' });
    expectUserIds(byRequestsLeft);
    expect(header('Requests left')).toHaveProperty('ariaSort', 'ascending');
    expect(header('Last request')).toHaveProperty('ariaSort', null);

    fireEvent.click(within(header('Requests left')).getByRole('button'));

    expect(onSort).toHaveBeenLastCalledWith('left', 'desc');
    rerender({ order: 'desc' });
    expectUserIds([
      'user-aaaa1111',
      'user-dddd4444',
      'user-aabb2222',
      'user-cccc3333',
      'user-eeee5555',
    ]);
    expect(header('Requests left')).toHaveProperty('ariaSort', 'descending');
  });

  it('sorts at once though the pointer is on the table to click the header, then holds the new order', async () => {
    const rerender = renderTable({ rows });
    const table = screen.getByRole('table', { name: 'Users' });
    fireEvent.pointerEnter(table);

    fireEvent.click(within(header('Requests left')).getByRole('button'));
    rerender({ sort: 'left', order: 'asc' });

    await waitFor(() => expectUserIds(byRequestsLeft));

    fireEvent.pointerMove(table);
    rerender({
      rows: rows.map((row) =>
        row === ok ? { ...ok, requestsLeft: 1, status: 'warning' } : row,
      ),
    });

    expect(rowOf('user-aaaa1111').getByText('1 / 100')).toBeTruthy();
    expectUserIds(byRequestsLeft);
  });
});

it('opens a user from their row or their ID, and ticks a user without opening them', () => {
  const onOpen = vi.fn();
  const onSelect = vi.fn();
  renderTable({
    rows: [userRow('user-aaaa1111', 59, 4_000)],
    onOpen,
    onSelect,
  });

  fireEvent.click(usersTable().getByRole('button', { name: 'user-aaaa1111' }));
  fireEvent.click(rowOf('user-aaaa1111').getByText('41 / 100'));
  fireEvent.click(
    rowOf('user-aaaa1111').getByRole('checkbox', {
      name: 'Select user-aaaa1111',
    }),
  );

  expect(onOpen.mock.calls).toEqual([['user-aaaa1111'], ['user-aaaa1111']]);
  expect(onSelect).toHaveBeenCalledWith(['user-aaaa1111']);
});

it('ticks every user shown from the header', () => {
  const onSelect = vi.fn();
  renderTable({
    rows: [
      userRow('user-aaaa1111', 59, 4_000),
      userRow('user-bbbb2222', 10, 8_000),
    ],
    onSelect,
  });

  fireEvent.click(
    usersTable().getByRole('checkbox', { name: 'Select every user shown' }),
  );

  expect(onSelect).toHaveBeenCalledWith(['user-aaaa1111', 'user-bbbb2222']);
});

it('marks a user with a custom limit', () => {
  renderTable({
    rows: [
      userRow('user-aaaa1111', 59, 4_000, { limit: 250, baseLimit: 250 }),
      userRow('user-bbbb2222', 10, 8_000),
    ],
  });

  expect(rowOf('user-aaaa1111').getByText('Custom limit')).toBeTruthy();
  expect(rowOf('user-bbbb2222').queryByText('Custom limit')).toBeNull();
});
