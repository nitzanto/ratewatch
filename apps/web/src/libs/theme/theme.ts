import { createTheme } from '@mui/material';
import { MuiAlert } from './components/alert';
import { MuiAppBar } from './components/app-bar';
import { MuiButton } from './components/button';
import { MuiChip } from './components/chip';
import { MuiDrawer } from './components/drawer';
import { MuiLinearProgress } from './components/linear-progress';
import { MuiPaper } from './components/paper';
import { MuiTable, MuiTableCell, MuiTableRow } from './components/table';
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
    MuiDrawer,
    MuiLinearProgress,
    MuiPaper,
    MuiTable,
    MuiTableCell,
    MuiTableRow,
    MuiTypography: { defaultProps: { variantMapping: { countHero: 'span' } } },
  },
});
