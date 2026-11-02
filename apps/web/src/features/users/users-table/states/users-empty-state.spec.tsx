import { renderWithProviders } from '@/test/render-app';
import { screen } from '@testing-library/react';
import { UsersEmptyState } from './users-empty-state';

it('says how to make users when there are none yet, without linking to the cookie clicker', async () => {
  await renderWithProviders(<UsersEmptyState />, { signedInAs: 'admin' });

  expect(screen.getByText('No users yet')).toBeTruthy();
  expect(
    screen.getByText(
      'To send some, sign in as a User in a private window and click the cookie.',
    ),
  ).toBeTruthy();
  expect(screen.queryByRole('link', { name: /cookie clicker/i })).toBeNull();
});
