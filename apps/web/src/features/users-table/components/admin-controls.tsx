import {
  useAddExtraRequests,
  useResetLimit,
} from '@/hooks/api/use-admin-controls';
import {
  canAddExtraRequests,
  extraRequestsAmount,
  maxLimit,
  type UserRow,
} from '@ratewatch/contracts';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { DrawerSection } from './drawer-section';

/** The drawer's actions on the user's limit; the user's numbers above change at once, and a failure says so here. */
export const AdminControls = ({ row }: { row: UserRow }) => {
  const reset = useResetLimit();
  const addExtra = useAddExtraRequests();
  const noWindow = row.resetAt === null;
  const atMax = !canAddExtraRequests(row.limit);

  return (
    <DrawerSection title="Admin controls">
      {() => (
        <Stack sx={{ gap: 1 }}>
          <Stack direction="row" sx={{ gap: 1 }}>
            <Button
              variant="outlined"
              loading={reset.isPending}
              onClick={() => {
                addExtra.reset();
                reset.mutate(row.userId);
              }}
            >
              Reset limit
            </Button>
            <Button
              variant="outlined"
              disabled={noWindow || atMax}
              loading={addExtra.isPending}
              onClick={() => {
                reset.reset();
                addExtra.mutate(row.userId);
              }}
            >
              Add {extraRequestsAmount} requests
            </Button>
          </Stack>
          {(noWindow || atMax) && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {noWindow
                ? 'Extra requests are for the current window, and this user has none open.'
                : `A limit can't go above ${maxLimit.toLocaleString('en')}.`}
            </Typography>
          )}
          {reset.isError && (
            <Alert severity="error">
              Couldn't reset {row.userId}'s limit. Try again.
            </Alert>
          )}
          {addExtra.isError && (
            <Alert severity="error">
              Couldn't add requests for {row.userId}. Try again.
            </Alert>
          )}
        </Stack>
      )}
    </DrawerSection>
  );
};
