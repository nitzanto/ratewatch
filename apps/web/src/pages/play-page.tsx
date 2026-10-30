import { CookieClicker } from '@/features/cookie-clicker/components/cookie-clicker';
import { sizes } from '@/libs/theme/sizes';
import { Stack, Typography } from '@mui/material';
import { defaultHourlyLimit } from '@ratewatch/contracts';

export const PlayPage = () => (
  <Stack spacing={3} sx={{ maxWidth: sizes.clickerColumn, mx: 'auto' }}>
    <Stack spacing={0.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
      <Typography variant="h4" component="h1">
        Cookie Clicker
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        Every click is one request. You can make {defaultHourlyLimit} an hour,
        and Crumb gets nervous as you near the limit.
      </Typography>
    </Stack>
    <CookieClicker />
  </Stack>
);
