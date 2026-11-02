import { StatusChip } from '@/components/status-chip';
import { getSortValue } from '@/api/users/users-queries';
import { defaultHourlyLimit, type UserRow } from '@ratewatch/contracts';
import { Checkbox, Link, Typography } from '@mui/material';
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
} from '@tanstack/react-table';
import { RelativeTime } from '../cells/relative-time';
import { RequestsLeftCell } from '../cells/requests-left-cell';
import { ResetCell } from '../cells/reset-cell';

export const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic },
  // When the live connection was lost, so the time cells stop moving with the data; `null` while live. How a
  // user's ID opens them, and the ticked users.
  tableMeta: {} as {
    frozenAt: number | null;
    onOpen: (userId: string) => void;
    selectedUserIds: string[];
    onSelect: (userIds: string[]) => void;
  },
});

const columnHelper = createColumnHelper<typeof features, UserRow>();

// Every column's ID is the API's sort key. The rows on screen sort the way the API orders them: a plain comparison,
// users with no value (an ended window) last.
export const defaultColumn = {
  sortFn: 'basic',
  sortUndefined: 'last',
} as const;

// Fixed shares of the table's width, so the columns don't shift as a filter or a live change alters the rows.
export const columnWidths: Record<string, string> = {
  select: '6%',
  id: '18%',
  left: '21%',
  resetAt: '17%',
  ratio: '17%',
  lastRequest: '21%',
};

export const columns = columnHelper.columns([
  // Ticks rows for the selection toolbar; the header ticks every row on screen, or none.
  columnHelper.display({
    id: 'select',
    header: ({ table }) => {
      const { selectedUserIds = [], onSelect } = table.options.meta ?? {};
      const userIds = table.getRowModel().rows.map((row) => row.id);
      const ticked = userIds.filter((userId) =>
        selectedUserIds.includes(userId),
      );

      return (
        <Checkbox
          size="small"
          checked={ticked.length > 0 && ticked.length === userIds.length}
          indeterminate={ticked.length > 0 && ticked.length < userIds.length}
          slotProps={{ input: { 'aria-label': 'Select every user shown' } }}
          onChange={(event) => onSelect?.(event.target.checked ? userIds : [])}
        />
      );
    },
    cell: ({ row, table }) => {
      const { selectedUserIds = [], onSelect } = table.options.meta ?? {};

      return (
        <Checkbox
          size="small"
          checked={selectedUserIds.includes(row.id)}
          slotProps={{ input: { 'aria-label': `Select ${row.id}` } }}
          // A tick never opens the user.
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            onSelect?.(
              event.target.checked
                ? [...selectedUserIds, row.id]
                : selectedUserIds.filter((userId) => userId !== row.id),
            )
          }
        />
      );
    },
  }),
  columnHelper.accessor('userId', {
    id: 'id',
    header: 'User',
    cell: ({ getValue, row, table }) => (
      <>
        <Link
          component="button"
          variant="body2"
          aria-haspopup="dialog"
          underline="hover"
          sx={{ color: 'text.primary', fontWeight: 600 }}
          onClick={(event) => {
            // The row opens the user too; once is enough.
            event.stopPropagation();
            table.options.meta?.onOpen(getValue());
          }}
        >
          {getValue()}
        </Link>
        {row.original.baseLimit !== defaultHourlyLimit && (
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'text.secondary' }}
          >
            Custom limit
          </Typography>
        )}
      </>
    ),
  }),
  columnHelper.accessor((row) => getSortValue(row, 'left'), {
    id: 'left',
    header: 'Requests left',
    cell: ({ row }) => <RequestsLeftCell user={row.original} />,
  }),
  columnHelper.accessor((row) => getSortValue(row, 'resetAt'), {
    id: 'resetAt',
    header: 'Resets',
    cell: ({ row, table }) => (
      <ResetCell
        resetAt={row.original.resetAt}
        frozenAt={table.options.meta?.frozenAt ?? null}
      />
    ),
  }),
  // The API sorts status by the share of the limit used.
  columnHelper.accessor((row) => getSortValue(row, 'ratio'), {
    id: 'ratio',
    header: 'Status',
    sortDescFirst: true,
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  }),
  columnHelper.accessor('lastRequestAt', {
    id: 'lastRequest',
    header: 'Last request',
    sortDescFirst: true,
    cell: ({ getValue, table }) => (
      <Typography variant="body2">
        <RelativeTime
          at={getValue()}
          frozenAt={table.options.meta?.frozenAt ?? null}
        />
      </Typography>
    ),
  }),
]);
