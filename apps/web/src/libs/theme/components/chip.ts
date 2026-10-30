import type { Components, Theme } from '@mui/material/styles';
import { sizes } from '../sizes';

declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    /** A pill on the navy app bar, such as the connection status. */
    shell: true;
    /** A rate-limit status: outlined in the status colour (`success`, `warning` or `error`), label in ink. */
    status: true;
  }
}

const statusColors = ['success', 'warning', 'error'] as const;

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
    {
      props: { variant: 'status' },
      style: ({ theme }) => ({
        height: sizes.statusChipHeight,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: '1px solid',
        fontSize: '0.8125rem',
        '& .MuiChip-icon': { fontSize: 18, marginLeft: 6 },
      }),
    },
    ...statusColors.map((color) => ({
      props: { variant: 'status' as const, color },
      style: ({ theme }: { theme: Theme }) => {
        // The light amber fails 3:1 on white, so Warning's border and icon use `dark`.
        const strong =
          color === 'warning'
            ? theme.palette.warning.dark
            : theme.palette[color].main;
        return { borderColor: strong, '& .MuiChip-icon': { color: strong } };
      },
    })),
  ],
};
