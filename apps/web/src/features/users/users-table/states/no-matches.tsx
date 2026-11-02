import { sizes } from '@/theme/sizes';
import { Button, Stack, Typography } from '@mui/material';

type NoMatchesProps = {
  onClearFilters: () => void;
};

/** Shown in place of the table's rows when the search and filters match no one. */
export const NoMatches = ({ onClearFilters }: NoMatchesProps) => (
  <Stack
    sx={{
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      px: 2,
      height: sizes.usersTableHeight,
    }}
  >
    <Typography sx={{ color: 'text.secondary' }}>
      No users match this search and these filters.
    </Typography>
    <Button variant="outlined" onClick={onClearFilters}>
      Clear filters
    </Button>
  </Stack>
);
