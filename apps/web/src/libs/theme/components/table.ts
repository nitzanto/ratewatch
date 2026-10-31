import type { Components, Theme } from '@mui/material/styles';

/** Numbers in tables use tabular figures, so columns of counts and times line up. */
export const MuiTable: Components<Theme>['MuiTable'] = {
  styleOverrides: {
    root: { fontVariantNumeric: 'tabular-nums' },
  },
};

/** A sticky header stays opaque over the rows scrolling under it, in `surface-sunken`. */
export const MuiTableCell: Components<Theme>['MuiTableCell'] = {
  styleOverrides: {
    stickyHeader: ({ theme }) => ({
      backgroundColor: theme.palette.surfaceSunken,
    }),
  },
};

/** The open user's row: `selection` fill with an `accent` inset bar on its leading edge. */
export const MuiTableRow: Components<Theme>['MuiTableRow'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      '&.Mui-selected': {
        backgroundColor: theme.palette.action.selected,
        boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`,
      },
    }),
  },
};
