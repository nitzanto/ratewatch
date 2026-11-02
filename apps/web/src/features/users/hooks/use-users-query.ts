import { usersQuerySchema, type UsersQuery } from '@ratewatch/contracts';
import { debounce } from '@mui/material/utils';
import { useMemo, useState } from 'react';

export const defaultUsersQuery = usersQuerySchema.parse({});

/** The search runs once typing has paused this long, not on every keystroke. */
export const searchDelayMs = 300;

/**
 * The users panel's query: its search, filters, sort and page, plus the text in the search box. The box shows each
 * keystroke at once; the query takes it once typing pauses.
 */
export const useUsersQuery = () => {
  const [query, setQuery] = useState<UsersQuery>(defaultUsersQuery);
  const [searchText, setSearchText] = useState<string>('');

  // A new search, filter, sort or page size starts again from the first page.
  const updateUsersQuery = (changes: Partial<UsersQuery>) =>
    setQuery((current) => ({ ...current, page: 0, ...changes }));

  const debouncedSetUserIdSearch = useMemo(
    () =>
      debounce(
        (userIdSearch: string) =>
          setQuery((current) => ({ ...current, page: 0, userIdSearch })),
        searchDelayMs,
      ),
    [],
  );

  const search = (text: string) => {
    setSearchText(text);
    debouncedSetUserIdSearch(text);
  };

  const goToPage = (page: number) =>
    setQuery((current) => ({ ...current, page }));

  const clearFilters = () => {
    debouncedSetUserIdSearch.clear();
    setSearchText('');
    updateUsersQuery({
      userIdSearch: undefined,
      status: undefined,
      activeWithin: defaultUsersQuery.activeWithin,
    });
  };

  const hasActiveFilters =
    !!query.userIdSearch ||
    !!query.status ||
    query.activeWithin !== defaultUsersQuery.activeWithin;

  return {
    query,
    searchText,
    search,
    updateUsersQuery,
    goToPage,
    clearFilters,
    hasActiveFilters,
  };
};
