import { alpha, type Components, type Theme } from '@mui/material/styles';
import { sizes } from '../sizes';

/** The user drawer: 460px of `surface` from the right, the one shadow besides the snackbar's (ink), over a navy (`shell`) scrim. */
export const MuiDrawer: Components<Theme>['MuiDrawer'] = {
  styleOverrides: {
    paper: ({ theme }) => ({
      width: sizes.drawerWidth,
      boxShadow: `-8px 0 24px ${alpha(theme.palette.text.primary, 0.16)}`,
    }),
    modal: ({ theme }) => ({
      '& .MuiBackdrop-root': {
        backgroundColor: alpha(theme.palette.shell.main, 0.32),
      },
    }),
  },
};
