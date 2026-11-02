import { sizes } from '@/theme/sizes';
import { TextField } from '@mui/material';

type UsersSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

/** The user ID search box. The panel decides when a search runs. */
export const UsersSearch = ({ value, onChange }: UsersSearchProps) => (
  <TextField
    type="search"
    size="small"
    label="Search user ID"
    sx={{ width: sizes.searchWidth }}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
);
