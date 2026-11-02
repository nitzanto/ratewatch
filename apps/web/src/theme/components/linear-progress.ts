import type { Components, Theme } from '@mui/material/styles';
import { sizes } from '../sizes';

/** The usage bar: 8px, rounded, filling over 250ms. */
export const MuiLinearProgress: Components<Theme>['MuiLinearProgress'] = {
  styleOverrides: {
    root: {
      height: sizes.usageBarHeight,
      borderRadius: sizes.usageBarHeight / 2,
    },
    bar: {
      borderRadius: sizes.usageBarHeight / 2,
      transitionDuration: '250ms',
      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
    },
  },
};
