import type { Components, Theme } from '@mui/material/styles';
import { sizes } from '../sizes';

declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    /** A pill on the navy app bar, such as the connection status. */
    shell: true;
  }
}

export const MuiChip: Components<Theme>['MuiChip'] = {
  variants: [
    {
      props: { variant: 'shell' },
      style: ({ theme }) => ({
        height: sizes.shellPillHeight,
        backgroundColor: theme.palette.shell.raised,
        color: theme.palette.shell.contrastText,
        fontSize: '0.8125rem',
      }),
    },
  ],
};
