import { Crumb } from '@/components/ui/crumb';
import { sizes } from '@/libs/theme/sizes';
import { Stack, Typography } from '@mui/material';

// shortcut: placeholder until the clicker itself (#34) makes every click a request.
export const PlayPage = () => (
  <Stack spacing={3} sx={{ alignItems: 'center' }}>
    <Typography variant="h4" component="h1">
      Cookie clicker
    </Typography>
    <Crumb mood="fresh" size={sizes.crumbClicker} />
    <Typography sx={{ color: 'text.secondary' }}>
      Crumb is getting ready. Clicking arrives soon.
    </Typography>
  </Stack>
);
