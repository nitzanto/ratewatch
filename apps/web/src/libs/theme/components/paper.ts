import type { Components, Theme } from '@mui/material/styles';

/** Cards are `<Paper variant="outlined">`: flat, a 1px `border` and the 8px card radius, never a shadow. */
export const MuiPaper: Components<Theme>['MuiPaper'] = {
  styleOverrides: {
    outlined: ({ theme }) => ({
      borderColor: theme.palette.border,
      borderRadius: 8,
    }),
  },
};
