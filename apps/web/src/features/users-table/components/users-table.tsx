import { StatusChip } from '@/components/business/status-chip';
import { sortValueOf } from '@/libs/api/admin-users-queries';
import { sizes } from '@/libs/theme/sizes';
import {
  usersQuerySchema,
  type UserRow,
  type UsersQuery,
} from '@ratewatch/contracts';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  useTable,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { LiveRow } from './live-row';
import { RelativeTime } from './relative-time';
import { RequestsLeftCell } from './requests-left-cell';
import { ResetCell } from './reset-cell';

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic },
  // When the live connection was lost, so the time cells stop moving with the data; `null` while live.
  tableMeta: {} as { frozenAt: number | null },
});

const columnHelper = createColumnHelper<typeof features, UserRow>();

// Each column's ID is the API's sort key, and it sorts the rows on screen the way the API does.
const sortsLikeTheApi = { sortFn: 'basic', sortUndefined: 'last' } as const;

// Fixed shares of the table's width, so the columns don't shift as a filter or a live change alters the rows.
const columnWidths: Record<string, string> = {
  id: '20%',
  left: '22%',
  resetAt: '18%',
  ratio: '18%',
  lastRequest: '22%',
};

const columns = columnHelper.columns([
  columnHelper.accessor('userId', {
    id: 'id',
    header: 'User',
    ...sortsLikeTheApi,
  }),
  columnHelper.accessor((row) => sortValueOf(row, 'left'), {
    id: 'left',
    header: 'Requests left',
    ...sortsLikeTheApi,
    cell: ({ row }) => <RequestsLeftCell user={row.original} />,
  }),
  columnHelper.accessor((row) => sortValueOf(row, 'resetAt'), {
    id: 'resetAt',
    header: 'Resets',
    ...sortsLikeTheApi,
    cell: ({ row, table }) => (
      <ResetCell
        resetAt={row.original.resetAt}
        frozenAt={table.options.meta?.frozenAt ?? null}
      />
    ),
  }),
  // The API sorts status by the share of the limit used.
  columnHelper.accessor((row) => sortValueOf(row, 'ratio'), {
    id: 'ratio',
    header: 'Status',
    ...sortsLikeTheApi,
    sortDescFirst: true,
    cell: ({ row }) => <StatusChip status={row.original.status} />,
  }),
  columnHelper.accessor('lastRequestAt', {
    id: 'lastRequest',
    header: 'Last request',
    ...sortsLikeTheApi,
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

/** `rows` in `order` (user IDs); rows not in it go last. */
const inOrder = (rows: UserRow[], order: string[]) => {
  const rank = new Map(order.map((userId, index) => [userId, index]));
  const rankOf = (row: UserRow) => rank.get(row.userId) ?? order.length;
  return [...rows].sort((a, b) => rankOf(a) - rankOf(b));
};

/**
 * Every user's state, in the API's order: a header sorts the API's page with `onSort`. Live changes re-sort the rows
 * on screen the same way, only while the pointer is off the table.
 */
export const UsersTable = ({
  rows,
  frozenAt,
  sort,
  order,
  onSort,
}: {
  rows: UserRow[];
  frozenAt: number | null;
  sort: UsersQuery['sort'];
  order: UsersQuery['order'];
  onSort: (sort: UsersQuery['sort'], order: UsersQuery['order']) => void;
}) => {
  // The row order on screen while the pointer is on the table, so a live change never moves a row under it.
  const [frozenOrder, setFrozenOrder] = useState<string[] | null>(null);
  const data = useMemo(
    () => (frozenOrder ? inOrder(rows, frozenOrder) : rows),
    [rows, frozenOrder],
  );
  const sorting = [{ id: sort, desc: order === 'desc' }];
  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.userId,
    state: { sorting },
    onSortingChange: (updater: Updater<SortingState>) => {
      const [next] = typeof updater === 'function' ? updater(sorting) : updater;
      // The admin asked for this order, so it shows at once though the pointer is on the header.
      setFrozenOrder(null);
      onSort(
        usersQuerySchema.shape.sort.parse(next.id),
        next.desc ? 'desc' : 'asc',
      );
    },
    enableSortingRemoval: false,
    sortDescFirst: false,
    manualSorting: frozenOrder !== null,
    meta: { frozenAt },
  });

  const freeze = () =>
    setFrozenOrder(table.getRowModel().rows.map((row) => row.id));

  return (
    // A fixed height, whatever the page size or the rows a filter leaves: the table scrolls inside it, under its header.
    <TableContainer sx={{ height: sizes.usersTableHeight }}>
      <Table
        stickyHeader
        sx={{ tableLayout: 'fixed' }}
        aria-label="Users"
        onPointerEnter={freeze}
        // A header click lifts the freeze; the next move takes it again, in the new order.
        onPointerMove={() => {
          if (!frozenOrder) freeze();
        }}
        onPointerLeave={() => setFrozenOrder(null)}
      >
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  // `sortDirection` sets `aria-sort`.
                  <TableCell
                    key={header.id}
                    sortDirection={sorted}
                    sx={{ width: columnWidths[header.column.id] }}
                  >
                    <TableSortLabel
                      active={sorted !== false}
                      direction={sorted || header.column.getFirstSortDir()}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <table.FlexRender header={header} />
                    </TableSortLabel>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <LiveRow key={row.id} user={row.original}>
              {row.getAllCells().map((cell, index) => (
                <TableCell
                  key={cell.id}
                  // The user ID heads its row, so a screen reader names each cell by its user.
                  {...(index === 0 && { component: 'th', scope: 'row' })}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </LiveRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
