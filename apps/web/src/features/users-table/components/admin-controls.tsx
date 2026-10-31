import {
  useAddExtraRequests,
  usePause,
  useResetLimit,
  useSetLimit,
  useUnlock,
} from '@/hooks/api/use-admin-controls';
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
import { DrawerSection } from './drawer-section';

const pauseLabels: Record<PauseDuration, string> = {
  '15m': '15 minutes',
  '1h': '1 hour',
  untilReset: 'Until next reset',
};

/** The drawer's actions on the user's limit; the user's numbers above change at once, and a failure says so here. */
export const AdminControls = ({ row }: { row: UserRow }) => {
  const { userId } = row;
  const reset = useResetLimit();
  const addExtra = useAddExtraRequests();
  const setLimit = useSetLimit();
  const pause = usePause();
  const unlock = useUnlock();
  const [pauseMenu, setPauseMenu] = useState<HTMLElement | null>(null);
  const pauseMenuId = useId();
  const noWindow = row.resetAt === null;
  const atMax = !canAddExtraRequests(row.limit);

  const changes = [
    [reset, `Couldn't reset ${userId}'s limit.`],
    [addExtra, `Couldn't add requests for ${userId}.`],
    [setLimit, `Couldn't change ${userId}'s limit.`],
    [pause, `Couldn't pause ${userId}'s limit.`],
    [unlock, `Couldn't unlock ${userId}'s limit.`],
  ] as const;
  /** Before a change starts: only the latest change's failure shows. */
  const clearOtherFailures = (mutation: (typeof changes)[number][0]) => {
    for (const [other] of changes) if (other !== mutation) other.reset();
  };

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
                disabled={noWindow || atMax}
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
                  aria-expanded={pauseMenu !== null}
                  aria-controls={pauseMenu ? pauseMenuId : undefined}
                  onClick={(event) => setPauseMenu(event.currentTarget)}
                >
                  Pause
                </Button>
              )}
            </Stack>
            {(noWindow || atMax) && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {noWindow
                  ? 'Extra requests are for the current window, and this user has none open.'
                  : `A limit can't go above ${maxLimit.toLocaleString('en')}.`}
              </Typography>
            )}
          </Stack>
          <Menu
            id={pauseMenuId}
            anchorEl={pauseMenu}
            open={pauseMenu !== null}
            onClose={() => setPauseMenu(null)}
          >
            {(Object.keys(pauseLabels) as PauseDuration[]).map((duration) => (
              <MenuItem
                key={duration}
                disabled={duration === 'untilReset' && noWindow}
                onClick={() => {
                  setPauseMenu(null);
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
          {changes.map(
            ([mutation, message]) =>
              mutation.isError && (
                <Alert key={message} severity="error">
                  {`${message} Try again.`}
                </Alert>
              ),
          )}
        </Stack>
      )}
    </DrawerSection>
  );
};
