import { act, renderHook } from '@testing-library/react';
import {
  defaultUsersQuery,
  searchDelayMs,
  useUsersQuery,
} from './use-users-query';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('shows the search text at once, and searches once typing pauses, from the first page', () => {
  const { result } = renderHook(() => useUsersQuery());

  act(() => result.current.goToPage(2));
  act(() => result.current.search('user-a'));

  expect(result.current.searchText).toBe('user-a');
  expect(result.current.query.userIdSearch).toBeUndefined();

  act(() => vi.advanceTimersByTime(searchDelayMs));

  expect(result.current.query).toMatchObject({
    userIdSearch: 'user-a',
    page: 0,
  });
  expect(result.current.hasActiveFilters).toBe(true);
});

it('goes back to the first page on any other change too', () => {
  const { result } = renderHook(() => useUsersQuery());

  act(() => result.current.goToPage(3));
  act(() => result.current.updateUsersQuery({ status: 'warning' }));

  expect(result.current.query).toMatchObject({ status: 'warning', page: 0 });
});

it('clears the filters and the search box, and drops a search still waiting to run', () => {
  const { result } = renderHook(() => useUsersQuery());

  act(() => result.current.updateUsersQuery({ status: 'exceeded' }));
  act(() => result.current.search('user-a'));
  act(() => result.current.clearFilters());
  act(() => vi.advanceTimersByTime(searchDelayMs));

  expect(result.current.searchText).toBe('');
  expect(result.current.query).toEqual(defaultUsersQuery);
  expect(result.current.hasActiveFilters).toBe(false);
});
