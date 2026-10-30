import type { TypographyVariantsOptions } from '@mui/material/styles';

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
};
