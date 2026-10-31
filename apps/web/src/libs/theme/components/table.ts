import type { Components, Theme } from '@mui/material/styles';

/** Numbers in tables use tabular figures, so columns of counts and times line up. */
export const MuiTable: Components<Theme>['MuiTable'] = {
  styleOverrides: {
    root: { fontVariantNumeric: 'tabular-nums' },
  },
};
