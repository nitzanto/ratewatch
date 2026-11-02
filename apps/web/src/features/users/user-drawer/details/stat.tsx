import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

/** One labelled number in the drawer's stats grid, as a term and its description. */
export const Stat = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
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
