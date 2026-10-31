import type { Components, Theme } from '@mui/material/styles';
import { sizes } from '../sizes';

declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    /** A pill on the navy app bar, such as the connection status. */
    shell: true;
    /** A rate-limit status: outlined in the status colour (`success`, `warning`, `error`, or `default` for Paused), label in ink. */
    status: true;
    /** A filter the admin toggles, such as a status with its count: `primary` when selected, else the status colour for its icon. */
    filter: true;
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
    {
      // Paused is the neutral slate; `default` is the status chip with no status colour.
      props: { variant: 'status', color: 'default' },
      style: ({ theme }) => ({
        borderColor: theme.palette.paused,
        '& .MuiChip-icon': { color: theme.palette.paused },
      }),
    },
    {
      props: { variant: 'filter' },
      style: ({ theme }) => ({
        height: sizes.filterChipHeight,
        borderRadius: sizes.filterChipHeight / 2,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.borderControl}`,
        fontSize: '0.8125rem',
        fontWeight: 500,
        fontVariantNumeric: 'tabular-nums',
        '& .MuiChip-label': { paddingInline: 14 },
        '& .MuiChip-icon': { fontSize: 18, marginLeft: 10, marginRight: -6 },
        '&.MuiChip-clickable:hover, &.Mui-focusVisible': {
          backgroundColor: theme.palette.neutralFill,
        },
      }),
    },
    ...statusColors.map((color) => ({
      props: { variant: 'filter' as const, color },
      style: ({ theme }: { theme: Theme }) => ({
        '& .MuiChip-icon': {
          color:
            color === 'warning'
              ? theme.palette.warning.dark
              : theme.palette[color].main,
        },
      }),
    })),
    {
      props: { variant: 'filter', color: 'default' },
      style: ({ theme }) => ({
        '& .MuiChip-icon': { color: theme.palette.paused },
      }),
    },
    {
      props: { variant: 'filter', color: 'primary' },
      style: ({ theme }) => ({
        backgroundColor: theme.palette.primary.main,
        borderColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '& .MuiChip-icon': { color: theme.palette.primary.contrastText },
        '&.MuiChip-clickable:hover, &.Mui-focusVisible': {
          backgroundColor: theme.palette.primary.dark,
        },
      }),
    },
  ],
};
