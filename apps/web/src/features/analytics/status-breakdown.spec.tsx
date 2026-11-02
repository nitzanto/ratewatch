import { userRow } from '@/mocks/data/users';
import { setMockUsers } from '@/mocks/handlers/users';
import { renderWithProviders } from '@/test/render-app';
import { screen, within } from '@testing-library/react';
import { StatusBreakdown } from './status-breakdown';

it('breaks the active users down by status, showing Paused only when someone is', async () => {
  setMockUsers([
    userRow('user-aaaa1111', 59, 4_000),
    userRow('user-bbbb2222', 10, 5_000),
    userRow('user-cccc3333', 95, 8_000),
    userRow('user-dddd4444', 100, 20_000),
  ]);
  await renderWithProviders(<StatusBreakdown />, { signedInAs: 'admin' });
  const breakdown = within(
    await screen.findByRole('region', { name: 'Status breakdown' }),
  );

  expect(
    breakdown.getByRole('img', { name: '2 OK, 1 Warning, 1 Exceeded' }),
  ).toBeTruthy();
  expect(breakdown.getAllByRole('listitem')).toEqual([
    expect.objectContaining({ textContent: 'OK · under 90% used2' }),
    expect.objectContaining({ textContent: 'Warning · 90% or more used1' }),
    expect.objectContaining({ textContent: 'Exceeded · all used1' }),
  ]);
});
