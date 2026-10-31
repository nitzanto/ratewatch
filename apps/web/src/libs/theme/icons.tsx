import { createSvgIcon } from '@mui/material/utils';

// Material Icons (filled) paths, so the app doesn't need the whole icon package. Status icons are in `status-icons.tsx`.
export const CloseIcon = createSvgIcon(
  <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />,
  'Close',
);
