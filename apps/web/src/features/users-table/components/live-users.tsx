import { useAdminUsers } from '@/hooks/api/use-admin-users';
import { formatClockTime } from '@/libs/utils/format-time';
import { Alert, Button, CircularProgress, Paper, Stack } from '@mui/material';
import { useLiveUsers } from '../hooks/use-live-users';
import { UsersEmptyState } from './users-empty-state';
import { UsersTable } from './users-table';

/** The dashboard's users table, kept live, with its loading, error, empty and connection-lost states. */
export const LiveUsers = () => {
  const { data, isPending, isError, refetch } = useAdminUsers();
  // Times stop moving while the connection is lost, so they read as of when it dropped.
  const lostAt = useLiveUsers();

  if (isPending) return <CircularProgress aria-label="Loading users" />;
  if (isError)
    return (
      <Alert
        severity="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      >
        Couldn't load the users.
      </Alert>
    );

  return (
    <Stack sx={{ gap: 2 }}>
      {lostAt !== null && (
        <Alert severity="info">
          Connection lost. Showing the users as of{' '}
          {formatClockTime(new Date(lostAt))}; reconnecting…
        </Alert>
      )}
      <Paper variant="outlined">
        {data.rows.length ? (
          <UsersTable rows={data.rows} frozenAt={lostAt} />
        ) : (
          <UsersEmptyState />
        )}
      </Paper>
    </Stack>
  );
};
