import type { Components, Theme } from '@mui/material/styles';

/** The navy shell, flat: surfaces are separated by borders, not shadows. */
export const MuiAppBar: Components<Theme>['MuiAppBar'] = {
  defaultProps: { position: 'static', elevation: 0 },
  styleOverrides: {
    root: ({ theme }) => ({
      backgroundColor: theme.palette.shell.main,
      color: theme.palette.shell.contrastText,
    }),
  },
};
