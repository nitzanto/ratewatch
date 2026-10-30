import { createTheme } from '@mui/material';
import { MuiAppBar } from './components/app-bar';
import { MuiButton } from './components/button';
import { MuiChip } from './components/chip';
import { palette } from './palette';
import { typography } from './typography';

/** The design system from `DESIGN.md`. Each component's overrides and variants live in `components/<name>.ts`. */
export const theme = createTheme({
  palette,
  typography,
  shape: { borderRadius: 6 },
  components: { MuiAppBar, MuiButton, MuiChip },
});
