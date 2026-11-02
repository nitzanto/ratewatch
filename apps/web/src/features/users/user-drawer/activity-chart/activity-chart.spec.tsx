import { userRow } from '@/mocks/data/users';
import { setMockUsers } from '@/mocks/handlers/users';
import { renderWithProviders } from '@/test/render-app';
import { fireEvent, screen } from '@testing-library/react';
import { ActivityChart } from './activity-chart';

it("shows the user's accepted and refused requests over the past hour or day", async () => {
  setMockUsers([userRow('user-aaaa1111', 59, 4_000)]);
  await renderWithProviders(<ActivityChart userId="user-aaaa1111" />, {
    signedInAs: 'admin',
  });

  expect(
    await screen.findByText('50 accepted and 0 refused in the past hour.'),
  ).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Past day' }));

  expect(
    await screen.findByText('50 accepted and 0 refused in the past day.'),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Past day' })).toHaveProperty(
    'ariaPressed',
    'true',
  );
});
