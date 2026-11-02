import { useAdminUsers } from '@/hooks/api/use-admin-users';
import { sizes } from '@/libs/theme/sizes';
import { formatClockTime } from '@/libs/utils/format-time';
import {
  usersPageSizes,
  usersQuerySchema,
  type UsersQuery,
} from '@ratewatch/contracts';
import {
  Alert,
  Button,
  Paper,
  Stack,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import { debounce } from '@mui/material/utils';
import { useMemo, useState } from 'react';
import { useLiveDashboard } from '@/hooks/api/use-live-dashboard';
import { SelectionToolbar } from './selection-toolbar';
import { UsersEmptyState } from './users-empty-state';
import { UsersTableSkeleton } from './users-table-skeleton';
import { UsersFilters } from './users-filters';
import { UserDrawer } from './user-drawer';
import { UsersTable } from './users-table';

const defaultQuery = usersQuerySchema.parse({});

/** The search runs once typing has paused this long, not on every keystroke. */
const searchDelayMs = 300;

/** The dashboard's users table, kept live, with its search, filters, sorting and pages, its loading, error, empty and connection-lost states, the selection toolbar, and the open user's drawer. */
export const LiveUsers = () => {
  const [query, setQuery] = useState(defaultQuery);
  // The search box shows each keystroke at once; the query takes it once typing pauses.
  const [search, setSearch] = useState('');
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const { data, isPending, isError, refetch } = useAdminUsers(query);
  // Times stop moving while the connection is lost, so they read as of when it dropped.
  const connectionLostAt = useLiveDashboard();

  // A new search, filter or sort starts again from the first page.
  const change = (changes: Partial<UsersQuery>) =>
    setQuery((current) => ({ ...current, page: 0, ...changes }));
  const searchLater = useMemo(
    () =>
      debounce(
        (userIdSearch: string) =>
          setQuery((current) => ({ ...current, page: 0, userIdSearch })),
        searchDelayMs,
      ),
    [],
  );

  const clearFilters = () => {
    searchLater.clear();
    setSearch('');
    change({
      userIdSearch: undefined,
      status: undefined,
      activeWithin: defaultQuery.activeWithin,
    });
  };

  const filtered =
    !!query.userIdSearch ||
    !!query.status ||
    query.activeWithin !== defaultQuery.activeWithin;

  if (isPending) return <UsersTableSkeleton />;

  if (isError)
    return (
      <Alert
        severity="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      >
        Couldn't load the users.
      </Alert>
    );

  // Only ticked users still on screen count: a new page, search or filter leaves the others out.
  const selectedOnScreen = selected.filter((userId) =>
    data.rows.some((row) => row.userId === userId),
  );

  return (
    <Stack sx={{ gap: 2 }}>
      {connectionLostAt !== null && (
        <Alert severity="info">
          Connection lost. Showing the users as of{' '}
          {formatClockTime(new Date(connectionLostAt))}; reconnecting…
        </Alert>
      )}
      <Paper variant="outlined">
        {!data.total && !filtered ? (
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
                <TextField
                  type="search"
                  size="small"
                  label="Search user ID"
                  sx={{ width: sizes.searchWidth }}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    searchLater(event.target.value);
                  }}
                />
              </Stack>
              {selectedOnScreen.length ? (
                <SelectionToolbar
                  userIds={selectedOnScreen}
                  onClear={() => setSelected([])}
                />
              ) : (
                <UsersFilters
                  query={query}
                  counts={data.counts}
                  filtered={filtered}
                  onChange={change}
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
                onSort={(sort, order) => change({ sort, order })}
                openUserId={openUserId}
                onOpen={setOpenUserId}
                selected={selectedOnScreen}
                onSelect={setSelected}
              />
            ) : (
              <Stack
                sx={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  px: 2,
                  height: sizes.usersTableHeight,
                }}
              >
                <Typography sx={{ color: 'text.secondary' }}>
                  No users match this search and these filters.
                </Typography>
                <Button variant="outlined" onClick={clearFilters}>
                  Clear filters
                </Button>
              </Stack>
            )}
            <TablePagination
              component="div"
              count={data.total}
              page={query.page}
              rowsPerPage={query.pageSize}
              rowsPerPageOptions={[...usersPageSizes]}
              onPageChange={(_, page) => setQuery({ ...query, page })}
              onRowsPerPageChange={(event) =>
                change({
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
