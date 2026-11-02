import { sizes } from '@/theme/sizes';
import { ExceededIcon, OkIcon } from '@/theme/status-icons';
import { formatClockTime, formatHourMinute } from '@/utils/format-time';
import type { UserDetail } from '@ratewatch/contracts';
import { Box, List, ListItem, Typography } from '@mui/material';
import { ActivityChart } from '../activity-chart/activity-chart';
import { AdminControls } from '../admin-controls/admin-controls';
import { DrawerSection } from '../drawer-section';
import { RelativeTime } from '../../users-table/cells/relative-time';
import { RequestsLeftCell } from '../../users-table/cells/requests-left-cell';
import { ResetCell } from '../../users-table/cells/reset-cell';
import { Stat } from './stat';

/** A loaded user's stats, admin controls, activity and recent requests. */
export const Details = ({
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
