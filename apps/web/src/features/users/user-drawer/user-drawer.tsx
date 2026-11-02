import { LoadingPlaceholder } from '@/components/loading-placeholder';
import { StatusChip } from '@/components/status-chip';
import { useAdminUser } from '@/api/admin-users/use-admin-user';
import { CloseIcon } from '@/theme/icons';
import { sizes } from '@/theme/sizes';
import { ExceededIcon, OkIcon } from '@/theme/status-icons';
import { formatClockTime, formatHourMinute } from '@/utils/format-time';
import type { UserDetail } from '@ratewatch/contracts';
import {
  Alert,
  Box,
  Button,
  Skeleton,
  Drawer,
  IconButton,
  List,
  ListItem,
  Stack,
  Typography,
} from '@mui/material';
import { useId, useRef, useState, type ReactNode, type Ref } from 'react';
import { ActivityChart } from './activity-chart';
import { AdminControls } from './admin-controls/admin-controls';
import { RelativeTime } from '../users-table/cells/relative-time';
import { RequestsLeftCell } from '../users-table/cells/requests-left-cell';
import { DrawerSection } from './drawer-section';
import { ResetCell } from '../users-table/cells/reset-cell';

const Stat = ({ label, children }: { label: string; children: ReactNode }) => (
  <Box>
    <Typography
      component="dt"
      variant="caption"
      sx={{ color: 'text.secondary' }}
    >
      {label}
    </Typography>
    <Typography component="dd" variant="body2" sx={{ m: 0 }}>
      {children}
    </Typography>
  </Box>
);

const statLabels = [
  'Requests left',
  'Used this hour',
  'Last reset',
  'Next reset',
  'Last request',
  'Throttling',
];

/** The drawer while the user loads: the stats grid, the controls' buttons, the chart and the first recent requests. */
const DetailsSkeleton = () => (
  <LoadingPlaceholder
    label="Loading the user"
    sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
  >
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 2,
      }}
    >
      {statLabels.map((label) => (
        <Box key={label}>
          <Skeleton variant="text" width={80} sx={{ typography: 'caption' }} />
          <Skeleton variant="text" width={112} />
        </Box>
      ))}
    </Box>
    <Stack direction="row" sx={{ gap: 1 }}>
      <Skeleton variant="rounded" width={112} height={40} />
      <Skeleton variant="rounded" width={136} height={40} />
      <Skeleton variant="rounded" width={88} height={40} />
    </Stack>
    <Skeleton variant="rectangular" height={sizes.activityChartHeight} />
    <Stack>
      {[0, 1, 2, 3].map((position) => (
        <Stack
          key={position}
          direction="row"
          sx={{
            alignItems: 'center',
            gap: 1,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Skeleton variant="text" width={sizes.recentTimeWidth} />
          <Skeleton
            variant="circular"
            width={20}
            height={20}
            sx={{ ml: 'auto' }}
          />
          <Skeleton variant="text" width={64} />
        </Stack>
      ))}
    </Stack>
  </LoadingPlaceholder>
);

const Details = ({
  userId,
  detail: { row, lastResetAt, recent },
  frozenAt,
}: {
  userId: string;
  detail: UserDetail;
  frozenAt: number | null;
}) => (
  <>
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 2,
      }}
    >
      <Stat label="Requests left">
        <RequestsLeftCell user={row} />
      </Stat>
      <Stat label="Used this hour">
        {Math.round((100 * (row.limit - row.requestsLeft)) / row.limit)}%
      </Stat>
      <Stat label="Last reset">
        {lastResetAt ? formatClockTime(new Date(lastResetAt)) : 'Not yet'}
      </Stat>
      <Stat label="Next reset">
        <ResetCell resetAt={row.resetAt} frozenAt={frozenAt} />
      </Stat>
      <Stat label="Last request">
        <RelativeTime at={row.lastRequestAt} frozenAt={frozenAt} />
      </Stat>
      <Stat label="Throttling">
        {row.pausedUntil
          ? `Paused until ${formatHourMinute(new Date(row.pausedUntil))}`
          : 'On'}
      </Stat>
    </Box>
    <AdminControls row={row} />
    <ActivityChart userId={userId} />
    <DrawerSection title="Recent requests">
      {(titleId) => (
        <List aria-labelledby={titleId} disablePadding>
          {recent.map(({ at, allowed }, index) => {
            const Icon = allowed ? OkIcon : ExceededIcon;

            return (
              // Two requests can share a millisecond; the list only ever grows at the top.
              <ListItem
                key={`${at}-${recent.length - index}`}
                divider
                disableGutters
                sx={{ gap: 1, py: 1 }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    width: sizes.recentTimeWidth,
                    color: 'text.secondary',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatClockTime(new Date(at))}
                </Typography>
                <Icon
                  fontSize="small"
                  color={allowed ? 'success' : 'error'}
                  sx={{ ml: 'auto' }}
                />
                <Typography variant="subtitle2">
                  {allowed ? 'Accepted' : 'Refused'}
                </Typography>
              </ListItem>
            );
          })}
        </List>
      )}
    </DrawerSection>
  </>
);

const UserDetails = ({
  userId,
  titleId,
  closeRef,
  frozenAt,
  onClose,
}: {
  userId: string;
  titleId: string;
  closeRef: Ref<HTMLButtonElement>;
  frozenAt: number | null;
  onClose: () => void;
}) => {
  const { data, isPending, isError, refetch } = useAdminUser(userId);

  return (
    <Stack sx={{ gap: 3, px: 3, pt: 3, pb: 4 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Stack sx={{ gap: 1 }}>
          <Typography id={titleId} variant="h5" component="h2">
            {userId}
          </Typography>
          {data ? (
            <StatusChip status={data.row.status} />
          ) : (
            isPending && (
              <Skeleton
                variant="rounded"
                width={84}
                height={sizes.statusChipHeight}
                sx={{ borderRadius: sizes.statusChipHeight / 2 }}
              />
            )
          )}
        </Stack>
        <IconButton
          ref={closeRef}
          aria-label="Close user details"
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      </Stack>
      {isPending ? (
        <DetailsSkeleton />
      ) : isError ? (
        <Alert
          severity="error"
          action={<Button onClick={() => refetch()}>Retry</Button>}
        >
          Couldn't load this user.
        </Alert>
      ) : (
        <Details userId={userId} detail={data} frozenAt={frozenAt} />
      )}
    </Stack>
  );
};

/** One user's stats, admin controls, activity and recent requests, live, in a dialog from the right; `userId` `null` closes it. */
export const UserDrawer = ({
  userId,
  frozenAt,
  onClose,
}: {
  userId: string | null;
  frozenAt: number | null;
  onClose: () => void;
}) => {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  // Still shows the user while the drawer slides out.
  const [shown, setShown] = useState<string | null>(userId);

  if (userId !== null && userId !== shown) setShown(userId);

  return (
    <Drawer
      anchor="right"
      open={userId !== null}
      onClose={onClose}
      // The focus starts on the close button, so Enter or Esc closes the drawer at once. MUI's own would go to the
      // panel, and the button can't take it before the panel starts sliding in.
      disableAutoFocus
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': titleId,
        },
        transition: { onEntering: () => closeRef.current?.focus() },
      }}
    >
      {shown && (
        <UserDetails
          key={shown}
          userId={shown}
          titleId={titleId}
          closeRef={closeRef}
          frozenAt={frozenAt}
          onClose={onClose}
        />
      )}
    </Drawer>
  );
};
