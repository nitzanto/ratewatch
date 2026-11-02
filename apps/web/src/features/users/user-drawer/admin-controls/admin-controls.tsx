import {
  canAddExtraRequests,
  extraRequestsAmount,
  maxLimit,
  type PauseDuration,
  type UserRow,
} from '@ratewatch/contracts';
import {
  Alert,
  Button,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { useId, useState } from 'react';
import { CustomLimitForm } from './custom-limit-form';
import { DrawerSection } from '../drawer-section';
import { useAdminControlMutations } from './hooks/use-admin-control-mutations';

const pauseLabels: Record<PauseDuration, string> = {
  '15m': '15 minutes',
  '1h': '1 hour',
  untilReset: 'Until next reset',
};

/** The drawer's actions on the user's limit; the user's numbers above change at once, and a failure says so here. */
export const AdminControls = ({ row }: { row: UserRow }) => {
  const { userId } = row;
  const {
    reset,
    addExtra,
    setLimit,
    pause,
    unlock,
    clearOtherFailures,
    failureMessages,
  } = useAdminControlMutations(userId);
  const [pauseMenuAnchor, setPauseMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const pauseMenuId = useId();
  const hasNoOpenWindow = row.resetAt === null;
  const isAtExtraRequestsMax = !canAddExtraRequests(row.limit);

  return (
    <DrawerSection title="Admin controls">
      {() => (
        <Stack sx={{ gap: 2 }}>
          <Stack sx={{ gap: 1 }}>
            <Stack direction="row" sx={{ gap: 1 }}>
              <Button
                variant="outlined"
                loading={reset.isPending}
                onClick={() => {
                  clearOtherFailures(reset);
                  reset.mutate(userId);
                }}
              >
                Reset limit
              </Button>
              <Button
                variant="outlined"
                disabled={hasNoOpenWindow || isAtExtraRequestsMax}
                loading={addExtra.isPending}
                onClick={() => {
                  clearOtherFailures(addExtra);
                  addExtra.mutate(userId);
                }}
              >
                Add {extraRequestsAmount} requests
              </Button>
              {row.pausedUntil ? (
                <Button
                  variant="outlined"
                  loading={unlock.isPending}
                  onClick={() => {
                    clearOtherFailures(unlock);
                    unlock.mutate(userId);
                  }}
                >
                  Unlock
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  loading={pause.isPending}
                  aria-haspopup="menu"
                  aria-expanded={pauseMenuAnchor !== null}
                  aria-controls={pauseMenuAnchor ? pauseMenuId : undefined}
                  onClick={(event) => setPauseMenuAnchor(event.currentTarget)}
                >
                  Pause
                </Button>
              )}
            </Stack>
            {(hasNoOpenWindow || isAtExtraRequestsMax) && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {hasNoOpenWindow
                  ? 'Extra requests are for the current window, and this user has none open.'
                  : `A limit can't go above ${maxLimit.toLocaleString('en')}.`}
              </Typography>
            )}
          </Stack>
          <Menu
            id={pauseMenuId}
            anchorEl={pauseMenuAnchor}
            open={pauseMenuAnchor !== null}
            onClose={() => setPauseMenuAnchor(null)}
          >
            {(Object.keys(pauseLabels) as PauseDuration[]).map((duration) => (
              <MenuItem
                key={duration}
                disabled={duration === 'untilReset' && hasNoOpenWindow}
                onClick={() => {
                  setPauseMenuAnchor(null);
                  clearOtherFailures(pause);
                  pause.mutate({ userId, pause: { duration } });
                }}
              >
                {pauseLabels[duration]}
              </MenuItem>
            ))}
          </Menu>
          <CustomLimitForm
            key={row.baseLimit}
            row={row}
            saving={setLimit.isPending}
            onSave={(limit) => {
              clearOtherFailures(setLimit);
              setLimit.mutate({ userId, limit });
            }}
          />
          {failureMessages.map((message) => (
            <Alert key={message} severity="error">
              {`${message} Try again.`}
            </Alert>
          ))}
        </Stack>
      )}
    </DrawerSection>
  );
};
