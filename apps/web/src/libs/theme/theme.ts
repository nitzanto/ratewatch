import { createTheme } from '@mui/material';
import { MuiAlert } from './components/alert';
import { MuiAppBar } from './components/app-bar';
import { MuiButton } from './components/button';
import { MuiChip } from './components/chip';
import { MuiLinearProgress } from './components/linear-progress';
import { MuiPaper } from './components/paper';
import { palette } from './palette';
import { typography } from './typography';

/** The design system from `DESIGN.md`. Each component's overrides and variants live in `components/<name>.ts`. */
export const theme = createTheme({
  palette,
  typography,
  shape: { borderRadius: 6 },
  components: {
    MuiAlert,
    MuiAppBar,
    MuiButton,
    MuiChip,
    MuiLinearProgress,
    MuiPaper,
    MuiTypography: { defaultProps: { variantMapping: { countHero: 'span' } } },
  },
});
