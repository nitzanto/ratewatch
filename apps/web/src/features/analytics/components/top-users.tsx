import { useAdminSummary } from '@/hooks/api/use-admin-summary';
import { sizes } from '@/libs/theme/sizes';
import { Box, Paper, Stack, Typography, type Theme } from '@mui/material';

/** A top user's details line up past their rank and the gap after it. */
const pastRank = (theme: Theme) =>
  `calc(${sizes.topUserRankWidth}px + ${theme.spacing(1)})`;

/** The users with the most requests in their current window, each with a bar against the first; kept live by `rate:summary`. */
export const TopUsers = () => {
  const { data } = useAdminSummary();
  const topUsers = data?.topUsers ?? [];
  const most = Math.max(1, ...topUsers.map(({ used }) => used));

  return (
    <Paper
      variant="card"
      component="section"
      aria-labelledby="top-users-title"
      sx={{ gap: 1.5 }}
    >
      <Stack>
        <Typography variant="h6" component="h2" id="top-users-title">
          Top users
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          By requests in the current window
        </Typography>
      </Stack>
      {topUsers.length ? (
        <Stack component="ol" sx={{ m: 0, p: 0, listStyle: 'none', gap: 1.5 }}>
          {topUsers.map(({ userId, used, limit }, i) => (
            <Stack component="li" key={userId} sx={{ gap: 0.5 }}>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'baseline' }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    width: sizes.topUserRankWidth,
                  }}
                >
                  {i + 1}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ flexGrow: 1, fontWeight: 600 }}
                >
                  {userId}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                >
                  {used} {used === 1 ? 'request' : 'requests'}
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', pl: pastRank }}
              >
                {Math.max(limit - used, 0)} of {limit} left
              </Typography>
              <Box
                aria-hidden
                sx={{
                  ml: pastRank,
                  height: sizes.topUserBarHeight,
                  borderRadius: sizes.topUserBarHeight / 2,
                  bgcolor: 'border',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: 1,
                    width: `${(used / most) * 100}%`,
                    bgcolor: 'dataBar',
                  }}
                />
              </Box>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {data
            ? 'No requests in the current window yet.'
            : 'Waiting for the API'}
        </Typography>
      )}
    </Paper>
  );
};
