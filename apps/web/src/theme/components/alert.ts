import type { Components, Theme } from '@mui/material/styles';
import { createElement } from 'react';
import { ExceededIcon, OkIcon, WarningIcon } from '../status-icons';

const tinted = ['success', 'warning', 'error'] as const;

/** Banners: the status tint behind ink text, the icon in the status colour. `info` is the neutral note. */
export const MuiAlert: Components<Theme>['MuiAlert'] = {
  defaultProps: {
    iconMapping: {
      success: createElement(OkIcon),
      warning: createElement(WarningIcon),
      error: createElement(ExceededIcon),
    },
  },
  styleOverrides: {
    root: ({ theme }) => ({
      color: theme.palette.text.primary,
      textAlign: 'left',
    }),
  },
  variants: [
    ...tinted.map((severity) => ({
      props: { variant: 'standard' as const, severity },
      style: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette[severity].light,
        '& .MuiAlert-icon': {
          // The light amber fails 3:1 on white, so Warning's icon uses `dark`.
          color:
            severity === 'warning'
              ? theme.palette.warning.dark
              : theme.palette[severity].main,
        },
      }),
    })),
    {
      props: { variant: 'standard', severity: 'info' },
      style: ({ theme }) => ({
        backgroundColor: theme.palette.neutralFill,
        '& .MuiAlert-icon': { color: theme.palette.crumb.chip },
      }),
    },
  ],
};
