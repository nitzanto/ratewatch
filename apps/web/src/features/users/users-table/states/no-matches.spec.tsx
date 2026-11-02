import { renderWithProviders } from '@/test/render-app';
import { fireEvent, screen } from '@testing-library/react';
import { NoMatches } from './no-matches';

it('says nothing matches, and clears the filters', async () => {
  const onClearFilters = vi.fn();
  await renderWithProviders(<NoMatches onClearFilters={onClearFilters} />);

  expect(
    screen.getByText('No users match this search and these filters.'),
  ).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

  expect(onClearFilters).toHaveBeenCalled();
});
