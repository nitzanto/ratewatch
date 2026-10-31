import { StatusChip } from '@/components/business/status-chip';
import type { UserRow } from '@ratewatch/contracts';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  useTable,
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

const columns = columnHelper.columns([
  columnHelper.accessor('userId', { header: 'User' }),
  columnHelper.accessor('requestsLeft', {
    header: 'Requests left',
    cell: ({ row }) => <RequestsLeftCell user={row.original} />,
  }),
  columnHelper.accessor('resetAt', {
    header: 'Resets',
    cell: ({ getValue, table }) => (
      <ResetCell
        resetAt={getValue()}
        frozenAt={table.options.meta?.frozenAt ?? null}
      />
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => <StatusChip status={getValue()} />,
  }),
  columnHelper.accessor('lastRequestAt', {
    header: 'Last request',
    sortFn: 'basic',
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

/** Every user's state, latest request first. Live changes re-sort it only while the pointer is off it. */
export const UsersTable = ({
  rows,
  frozenAt,
}: {
  rows: UserRow[];
  frozenAt: number | null;
}) => {
  // The row order on screen while the pointer is on the table, so a live change never moves a row under it.
  const [frozenOrder, setFrozenOrder] = useState<string[] | null>(null);
  const data = useMemo(
    () => (frozenOrder ? inOrder(rows, frozenOrder) : rows),
    [rows, frozenOrder],
  );
  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.userId,
    initialState: { sorting: [{ id: 'lastRequestAt', desc: true }] },
    manualSorting: frozenOrder !== null,
    meta: { frozenAt },
  });

  return (
    <TableContainer>
      <Table
        aria-label="Users"
        onPointerEnter={() =>
          setFrozenOrder(table.getRowModel().rows.map((row) => row.id))
        }
        onPointerLeave={() => setFrozenOrder(null)}
      >
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableCell key={header.id}>
                  <table.FlexRender header={header} />
                </TableCell>
              ))}
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
