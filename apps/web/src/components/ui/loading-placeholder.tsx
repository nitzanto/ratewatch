import { Box, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * Wraps a skeleton so assistive technology hears one "loading" announcement, as it did from the spinner it replaces:
 * an indeterminate progress bar named `label`, with the placeholder shapes hidden.
 */
export const LoadingPlaceholder = ({
  label,
  children,
  sx,
}: {
  label: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
}) => (
  <Box role="progressbar" aria-label={label} aria-busy sx={sx}>
    <Box aria-hidden sx={{ display: 'contents' }}>
      {children}
    </Box>
  </Box>
);
