import type { Components, Theme } from '@mui/material/styles';

declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    /** A dashboard card: outlined, 16px padding, its content in a column. */
    card: true;
  }
}

const outline = (theme: Theme) => ({
  border: `1px solid ${theme.palette.border}`,
  borderRadius: 8,
});

/** Cards are `<Paper variant="outlined">` or, padded, `variant="card"`: flat, a 1px `border` and the 8px card radius, never a shadow. */
export const MuiPaper: Components<Theme>['MuiPaper'] = {
  styleOverrides: {
    outlined: ({ theme }) => outline(theme),
  },
  variants: [
    {
      props: { variant: 'card' },
      style: ({ theme }) => ({
        ...outline(theme),
        padding: theme.spacing(2),
        display: 'flex',
        flexDirection: 'column',
      }),
    },
  ],
};
