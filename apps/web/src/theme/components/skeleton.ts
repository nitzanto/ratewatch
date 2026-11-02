import type { Components, Theme } from '@mui/material/styles';

/** Loading placeholders in `neutral-fill`, the same calm grey as empty bars; they hold still under reduced motion. */
export const MuiSkeleton: Components<Theme>['MuiSkeleton'] = {
  defaultProps: { animation: 'pulse' },
  styleOverrides: {
    root: ({ theme }) => ({
      backgroundColor: theme.palette.neutralFill,
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
    }),
  },
};
