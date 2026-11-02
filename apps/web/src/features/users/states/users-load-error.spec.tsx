import { renderWithProviders } from '@/test/render-app';
import { fireEvent, screen } from '@testing-library/react';
import { UsersLoadError } from './users-load-error';

it('says the users failed to load, and offers a retry', async () => {
  const onRetry = vi.fn();
  await renderWithProviders(<UsersLoadError onRetry={onRetry} />);

  expect(screen.getByText("Couldn't load the users.")).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(onRetry).toHaveBeenCalled();
});
