import { createTheme } from '@mui/material';

/** One colour per rate-limit status: OK, Warning (90% of the limit used), Exceeded (100%). */
type StatusPalette = Record<'ok' | 'warning' | 'exceeded', string>;

declare module '@mui/material/styles' {
  interface Palette {
    status: StatusPalette;
  }
  interface PaletteOptions {
    status?: StatusPalette;
  }
}

export const theme = createTheme({
  palette: {
    // MUI's default success, warning and error hues until the design direction sets the palette.
    status: { ok: '#2e7d32', warning: '#ed6c02', exceeded: '#d32f2f' },
  },
});
