import { Stack, Typography } from '@mui/material';

type RequestsLeftProps = {
  left: number | undefined;
  unavailable: boolean;
  /** The limit reset after a wait, so there's no current count until the next click. */
  reset: boolean;
};

/** The big requests-left count, announced to screen readers whenever it changes. */
export const RequestsLeft = ({
  left,
  unavailable,
  reset,
}: RequestsLeftProps) => (
  <Stack role="status" sx={{ alignItems: 'center', gap: 0.5 }}>
    <Typography variant="countHero">
      {left ?? <span aria-hidden>—</span>}
    </Typography>
    <Typography
      variant="body1"
      component="span"
      sx={{ color: 'text.secondary' }}
    >
      {left !== undefined
        ? `${left === 1 ? 'request' : 'requests'} left this hour`
        : reset
          ? 'Your limit has reset. Click to see your new count.'
          : unavailable
            ? 'Limit unavailable'
            : 'Click Crumb to see your requests left.'}
    </Typography>
  </Stack>
);
