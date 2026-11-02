import { renderWithProviders } from '@/test/render-app';
import { fireEvent, screen } from '@testing-library/react';
import { UsersSearch } from './users-search';

it('shows the search and hands on each keystroke', async () => {
  const onChange = vi.fn();
  await renderWithProviders(<UsersSearch value="user-a" onChange={onChange} />);
  const searchbox = screen.getByRole('searchbox', { name: 'Search user ID' });

  expect(searchbox).toHaveProperty('value', 'user-a');

  fireEvent.change(searchbox, { target: { value: 'user-aa' } });

  expect(onChange).toHaveBeenCalledWith('user-aa');
});
