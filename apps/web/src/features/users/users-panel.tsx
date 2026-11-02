import { useUsers } from '@/api/users/use-users';
import { useLiveDashboard } from '@/api/realtime/use-live-dashboard';
import { usersPageSizes, usersQuerySchema } from '@ratewatch/contracts';
import { Paper, Stack, TablePagination, Typography } from '@mui/material';
import { useState } from 'react';
import { SelectionToolbar } from './controls/selection-toolbar';
import { UsersFilters } from './controls/users-filters';
import { UsersSearch } from './controls/users-search';
import { useRowSelection } from './hooks/use-row-selection';
import { useUsersQuery } from './hooks/use-users-query';
import { ConnectionLostBanner } from './states/connection-lost-banner';
import { UsersLoadError } from './states/users-load-error';
import { UserDrawer } from './user-drawer/user-drawer';
import { NoMatches } from './users-table/states/no-matches';
import { UsersEmptyState } from './users-table/states/users-empty-state';
import { UsersTableSkeleton } from './users-table/states/users-table-skeleton';
import { UsersTable } from './users-table/users-table';

/** The dashboard's users section, kept live: lays out the controls, table, states and drawer around the users query. */
export const UsersPanel = () => {
  const {
    query,
    searchText,
    search,
    updateUsersQuery,
    goToPage,
    clearFilters,
    hasActiveFilters,
  } = useUsersQuery();

  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const { data, isPending, isError, refetch } = useUsers(query);
  const { selectedOnScreen, select, clearSelection } = useRowSelection(
    data?.rows ?? [],
  );

  // Times stop moving while the connection is lost, so they read as of when it dropped.
  const connectionLostAt = useLiveDashboard();

  if (isPending) return <UsersTableSkeleton />;

  if (isError) return <UsersLoadError onRetry={() => refetch()} />;

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
                  onClear={clearSelection}
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
                onSelect={select}
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
              onPageChange={(_, page) => goToPage(page)}
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
