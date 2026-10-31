import type { TypographyVariantsOptions } from '@mui/material/styles';
import type { CSSProperties } from 'react';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    countHero: CSSProperties;
  }
  interface TypographyVariantsOptions {
    countHero?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    /** The clicker's big number: requests left, or the countdown. */
    countHero: true;
  }
}

const heading = { fontWeight: 600 };

/** IBM Plex Sans; headings semibold, never light; buttons in sentence case. */
export const typography: TypographyVariantsOptions = {
  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  h1: heading,
  h2: heading,
  h3: heading,
  h4: { ...heading, letterSpacing: '-0.01em' },
  h5: heading,
  h6: { ...heading, lineHeight: 1.4 },
  button: { fontWeight: 600, textTransform: 'none' },
  countHero: {
    fontSize: '3.75rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
  },
};
