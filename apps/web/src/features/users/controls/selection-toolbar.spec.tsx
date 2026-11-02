import { userRow } from '@/mocks/data/users';
import { setMockUsers } from '@/mocks/handlers/users';
import { server } from '@/mocks/node';
import { renderWithProviders } from '@/test/render-app';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { SelectionToolbar } from './selection-toolbar';

const renderToolbar = (userIds: string[], onClear = vi.fn()) =>
  renderWithProviders(
    <SelectionToolbar userIds={userIds} onClear={onClear} />,
    { signedInAs: 'admin' },
  );

it('says how many users are ticked, and clears them', async () => {
  const onClear = vi.fn();
  await renderToolbar(['user-aaaa1111', 'user-bbbb2222'], onClear);

  expect(screen.getByText('2 users selected')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

  expect(onClear).toHaveBeenCalled();
});

it('clears the selection once their limits are reset', async () => {
  setMockUsers([userRow('user-aaaa1111', 59, 4_000)]);
  const onClear = vi.fn();
  await renderToolbar(['user-aaaa1111'], onClear);

  fireEvent.click(screen.getByRole('button', { name: 'Reset their limits' }));

  await waitFor(() => expect(onClear).toHaveBeenCalled());
});

it('keeps the selection and says so when the reset fails', async () => {
  server.use(
    http.post(
      '/api/admin/users/reset',
      () => new HttpResponse(null, { status: 503 }),
    ),
  );
  const onClear = vi.fn();
  await renderToolbar(['user-aaaa1111'], onClear);

  fireEvent.click(screen.getByRole('button', { name: 'Reset their limits' }));

  expect(
    await screen.findByText("Couldn't reset their limits. Try again."),
  ).toBeTruthy();
  expect(screen.getByText('1 user selected')).toBeTruthy();
  expect(onClear).not.toHaveBeenCalled();
});
