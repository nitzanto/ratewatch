import type { PaletteOptions } from '@mui/material/styles';

/** The navy app bar: its text, muted text, raised fill (hover, pill), accent (`accent-on-dark`: focus rings) and the status pill's dots. */
type ShellPalette = Record<
  'main' | 'contrastText' | 'muted' | 'raised' | 'accent' | 'ok' | 'down',
  string
>;

/** Crumb the mascot's own colours; never used in UI chrome. */
type CrumbPalette = Record<
  | 'dough'
  | 'doughBitten'
  | 'crust'
  | 'highlight'
  | 'chip'
  | 'face'
  | 'cheek'
  | 'sweat'
  | 'crumbs',
  string
>;

declare module '@mui/material/styles' {
  interface Palette {
    shell: ShellPalette;
    crumb: CrumbPalette;
    paused: string;
    liveFlash: string;
    dataBar: string;
    border: string;
    borderControl: string;
    surfaceSunken: string;
    neutralFill: string;
  }
  interface PaletteOptions {
    shell?: ShellPalette;
    crumb?: CrumbPalette;
    paused?: string;
    liveFlash?: string;
    dataBar?: string;
    border?: string;
    borderControl?: string;
    surfaceSunken?: string;
    neutralFill?: string;
  }
}

/** The Harbor palette from `DESIGN.md`. Rate-limit status is `success` (OK), `warning` and `error` (Exceeded). */
export const palette: PaletteOptions = {
  primary: {
    main: '#1F5BD8',
    dark: '#1849B0',
    light: '#E8EFFC',
    contrastText: '#FFFFFF',
  },
  background: { default: '#F4F6F9', paper: '#FFFFFF' },
  text: { primary: '#0F1A24', secondary: '#52606D', disabled: '#B8C1CB' },
  divider: '#E8ECF1',
  action: { active: '#5F6B78', selected: '#CFE0FB', disabled: '#B8C1CB' },
  success: { main: '#0E7C66', light: '#E3F2EE', contrastText: '#FFFFFF' },
  // The light amber fails 3:1 on white, so text and icons use `dark`.
  warning: {
    main: '#F5B83D',
    dark: '#9A5B00',
    light: '#FEF4DC',
    contrastText: '#0F1A24',
  },
  error: { main: '#8E1B3A', light: '#F7E4E9', contrastText: '#FFFFFF' },
  shell: {
    main: '#0B1F33',
    contrastText: '#FFFFFF',
    muted: '#AFC0D3',
    raised: '#283A4C',
    accent: '#9DBBF5',
    ok: '#3FC1A1',
    down: '#F28BA6',
  },
  crumb: {
    dough: '#E2A75B',
    doughBitten: '#D9A15A',
    crust: '#B9773A',
    highlight: '#F1C88A',
    chip: '#5B3A1F',
    face: '#3A2414',
    cheek: '#E57360',
    sweat: '#8EC5EA',
    crumbs: '#C98A45',
  },
  paused: '#52606D',
  liveFlash: '#DCE6F2',
  dataBar: '#8A9BB0',
  // Card and ring outlines; `divider` is the lighter rule inside a surface.
  border: '#E2E7ED',
  // Outlines of controls: inputs and unselected filter chips.
  borderControl: '#84919F',
  // Table headers.
  surfaceSunken: '#F8FAFC',
  // Neutral notes and the halo behind Crumb.
  neutralFill: '#EDF1F5',
};
