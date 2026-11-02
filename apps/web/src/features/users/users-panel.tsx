import { useUsers } from '@/api/users/use-users';
import { useLiveDashboard } from '@/api/realtime/use-live-dashboard';
import {
  usersPageSizes,
  usersQuerySchema,
  type UsersQuery,
} from '@ratewatch/contracts';
import { Paper, Stack, TablePagination, Typography } from '@mui/material';
import { debounce } from '@mui/material/utils';
import { useMemo, useState } from 'react';
import { SelectionToolbar } from './controls/selection-toolbar';
import { UsersFilters } from './controls/users-filters';
import { UsersSearch } from './controls/users-search';
import { ConnectionLostBanner } from './states/connection-lost-banner';
import { UsersLoadError } from './states/users-load-error';
import { UserDrawer } from './user-drawer/user-drawer';
import { NoMatches } from './users-table/states/no-matches';
import { UsersEmptyState } from './users-table/states/users-empty-state';
import { UsersTableSkeleton } from './users-table/states/users-table-skeleton';
import { UsersTable } from './users-table/users-table';

const defaultQuery = usersQuerySchema.parse({});

/** The search runs once typing has paused this long, not on every keystroke. */
const searchDelayMs = 300;

/** The dashboard's users section, kept live: owns the query (search, filters, sort, page), the ticked users and the open user, and lays out the controls, table, states and drawer. */
export const UsersPanel = () => {
  const [query, setQuery] = useState<UsersQuery>(defaultQuery);

  // The search box shows each keystroke at once; the query takes it once typing pauses.
  const [searchText, setSearchText] = useState<string>('');
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const { data, isPending, isError, refetch } = useUsers(query);

  // Times stop moving while the connection is lost, so they read as of when it dropped.
  const connectionLostAt = useLiveDashboard();

  // A new search, filter, sort or page size starts again from the first page.
  const updateUsersQuery = (changes: Partial<UsersQuery>) =>
    setQuery((current) => ({ ...current, page: 0, ...changes }));

  const debouncedSetUserIdSearch = useMemo(
    () =>
      debounce(
        (userIdSearch: string) => updateUsersQuery({ userIdSearch }),
        searchDelayMs,
      ),
    [],
  );

  const search = (text: string) => {
    setSearchText(text);
    debouncedSetUserIdSearch(text);
  };

  const clearFilters = () => {
    debouncedSetUserIdSearch.clear();
    setSearchText('');
    updateUsersQuery({
      userIdSearch: undefined,
      status: undefined,
      activeWithin: defaultQuery.activeWithin,
    });
  };

  const hasActiveFilters =
    !!query.userIdSearch ||
    !!query.status ||
    query.activeWithin !== defaultQuery.activeWithin;

  if (isPending) return <UsersTableSkeleton />;

  if (isError) return <UsersLoadError onRetry={() => refetch()} />;

  // Only ticked users still on screen count: a new page, search or filter leaves the others out.
  const selectedOnScreen = selectedUserIds.filter((userId) =>
    data.rows.some((row) => row.userId === userId),
  );

  return (
    <Stack sx={{ gap: 2 }}>
      {connectionLostAt !== null && (
        <ConnectionLostBanner lostAt={connectionLostAt} />
      )}
      <Paper variant="outlined">
        {!data.total && !hasActiveFilters ? (
          <UsersEmptyState />
        ) : (
          <>
            <Stack sx={{ gap: 2, p: 2 }}>
              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography variant="h6" component="h2">
                  Users
                </Typography>
                <UsersSearch value={searchText} onChange={search} />
              </Stack>
              {selectedOnScreen.length ? (
                <SelectionToolbar
                  userIds={selectedOnScreen}
                  onClear={() => setSelectedUserIds([])}
                />
              ) : (
                <UsersFilters
                  query={query}
                  counts={data.counts}
                  hasActiveFilters={hasActiveFilters}
                  onChange={updateUsersQuery}
                  onClear={clearFilters}
                />
              )}
            </Stack>
            {data.rows.length ? (
              <UsersTable
                rows={data.rows}
                frozenAt={connectionLostAt}
                sort={query.sort}
                order={query.order}
                onSort={(sort, order) => updateUsersQuery({ sort, order })}
                openUserId={openUserId}
                onOpen={setOpenUserId}
                selectedUserIds={selectedOnScreen}
                onSelect={setSelectedUserIds}
              />
            ) : (
              <NoMatches onClearFilters={clearFilters} />
            )}
            <TablePagination
              component="div"
              count={data.total}
              page={query.page}
              rowsPerPage={query.pageSize}
              rowsPerPageOptions={[...usersPageSizes]}
              onPageChange={(_, page) => setQuery({ ...query, page })}
              onRowsPerPageChange={(event) =>
                updateUsersQuery({
                  pageSize: usersQuerySchema.shape.pageSize.parse(
                    event.target.value,
                  ),
                })
              }
            />
          </>
        )}
      </Paper>
      <UserDrawer
        userId={openUserId}
        frozenAt={connectionLostAt}
        onClose={() => setOpenUserId(null)}
      />
    </Stack>
  );
};
