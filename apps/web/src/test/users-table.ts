import { screen, within } from '@testing-library/react';

export const minuteMs = 60_000;

export const usersTable = () =>
  within(screen.getByRole('table', { name: 'Users' }));

/** Asserts the users table lists exactly these users, in this order. */
export const expectUserIds = (userIds: string[]) =>
  expect(usersTable().getAllByRole('rowheader')).toEqual(
    userIds.map((textContent) => expect.objectContaining({ textContent })),
  );

export const rowOf = (userId: string) =>
  within(usersTable().getByRole('row', { name: new RegExp(userId) }));

/**
 * The times on screen count from the real clock: a slow render would turn "8 s ago" into "9 s ago". Faking only
 * `Date` freezes them, while MSW, TanStack Query and the one-second tick keep their real timers. Undo it with
 * `vi.useRealTimers()` after each test.
 */
export const freezeClock = () => vi.useFakeTimers({ toFake: ['Date'] });
