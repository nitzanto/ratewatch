import { statusStyles } from '@/components/business/status-chip';
import { sizes } from '@/libs/theme/sizes';
import {
  userStatusSchema,
  usersQuerySchema,
  type UsersPage,
  type UsersQuery,
} from '@ratewatch/contracts';
import { Box, Button, Chip, MenuItem, Stack, TextField } from '@mui/material';

const activeWithinLabels = {
  '15m': 'Last 15 minutes',
  '1h': 'Last hour',
  '24h': 'Last 24 hours',
} as const;

/** The status chips, each with its count under the search and last-active filter, then the last-active choice. */
export const UsersFilters = ({
  query,
  counts,
  filtered,
  onChange,
  onClear,
}: {
  query: UsersQuery;
  counts: UsersPage['counts'];
  filtered: boolean;
  onChange: (changes: Partial<UsersQuery>) => void;
  onClear: () => void;
}) => (
  <Stack
    direction="row"
    sx={{ alignItems: 'center', gap: 1, minHeight: sizes.filterRowHeight }}
  >
    <Stack
      role="group"
      aria-label="Filter by status"
      direction="row"
      sx={{ gap: 1 }}
    >
      <Chip
        variant="filter"
        color={query.status ? 'default' : 'primary'}
        aria-pressed={!query.status}
        label={`All ${Object.values(counts).reduce((sum, count) => sum + count, 0)}`}
        onClick={() => onChange({ status: undefined })}
      />
      {userStatusSchema.options.map((status) => {
        const { label, color, Icon } = statusStyles[status];
        const selected = query.status === status;
        return (
          <Chip
            key={status}
            variant="filter"
            color={selected ? 'primary' : color}
            aria-pressed={selected}
            icon={<Icon />}
            label={`${label} ${counts[status]}`}
            onClick={() => onChange({ status })}
          />
        );
      })}
    </Stack>
    {filtered && <Button onClick={onClear}>Clear filters</Button>}
    <Box sx={{ flexGrow: 1 }} />
    <TextField
      select
      size="small"
      label="Last active"
      value={query.activeWithin}
      onChange={(event) =>
        onChange({
          activeWithin: usersQuerySchema.shape.activeWithin.parse(
            event.target.value,
          ),
        })
      }
    >
      {Object.entries(activeWithinLabels).map(([value, label]) => (
        <MenuItem key={value} value={value}>
          {label}
        </MenuItem>
      ))}
    </TextField>
  </Stack>
);
