import type { Components, Theme } from '@mui/material/styles';
import { sizes } from '../sizes';

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    /** A full-height tab or action in the navy app bar; as a tab, use with `component={NavLink}`, which marks the current page. */
    shellTab: true;
  }
}

export const MuiButton: Components<Theme>['MuiButton'] = {
  defaultProps: { disableElevation: true },
  variants: [
    {
      props: { variant: 'shellTab' },
      style: ({ theme }) => ({
        minHeight: sizes.appBarHeight,
        padding: theme.spacing(0, 2),
        borderRadius: 0,
        borderBottom: '2px solid transparent',
        color: theme.palette.shell.contrastText,
        fontWeight: 500,
        '&:hover': { backgroundColor: theme.palette.shell.raised },
        // The outline is the focus indicator; MUI's grey focus ripple would sit on top of it.
        '& .MuiTouchRipple-root': { display: 'none' },
        '&.Mui-focusVisible': {
          outline: `2px solid ${theme.palette.shell.accent}`,
          outlineOffset: -2,
        },
        '&[aria-current="page"]': {
          fontWeight: 600,
          borderBottomColor: theme.palette.shell.contrastText,
        },
      }),
    },
  ],
};
