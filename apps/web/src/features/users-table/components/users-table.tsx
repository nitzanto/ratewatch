import { StatusChip } from '@/components/business/status-chip';
import { sortValueOf } from '@/libs/api/admin-users-queries';
import { sizes } from '@/libs/theme/sizes';
import {
  usersQuerySchema,
  type UserRow,
  type UsersQuery,
} from '@ratewatch/contracts';
import {
  Checkbox,
  Link,
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
  // When the live connection was lost, so the time cells stop moving with the data; `null` while live. How a
  // user's ID opens them, and the ticked users.
  tableMeta: {} as {
    frozenAt: number | null;
    onOpen: (userId: string) => void;
    selected: string[];
    onSelect: (userIds: string[]) => void;
  },
});

const columnHelper = createColumnHelper<typeof features, UserRow>();

// Each column's ID is the API's sort key, and it sorts the rows on screen the way the API does.
const sortsLikeTheApi = { sortFn: 'basic', sortUndefined: 'last' } as const;

// Fixed shares of the table's width, so the columns don't shift as a filter or a live change alters the rows.
const columnWidths: Record<string, string> = {
  select: '6%',
  id: '18%',
  left: '21%',
  resetAt: '17%',
  ratio: '17%',
  lastRequest: '21%',
};

const columns = columnHelper.columns([
  // Ticks rows for the selection toolbar; the header ticks every row on screen, or none.
  columnHelper.display({
    id: 'select',
    header: ({ table }) => {
      const { selected = [], onSelect } = table.options.meta ?? {};
      const userIds = table.getRowModel().rows.map((row) => row.id);
      const ticked = userIds.filter((userId) => selected.includes(userId));
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
      const { selected = [], onSelect } = table.options.meta ?? {};
      return (
        <Checkbox
          size="small"
          checked={selected.includes(row.id)}
          slotProps={{ input: { 'aria-label': `Select ${row.id}` } }}
          // A tick never opens the user.
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            onSelect?.(
              event.target.checked
                ? [...selected, row.id]
                : selected.filter((userId) => userId !== row.id),
            )
          }
        />
      );
    },
  }),
  columnHelper.accessor('userId', {
    id: 'id',
    header: 'User',
    ...sortsLikeTheApi,
    cell: ({ getValue, table }) => (
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
    ),
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
 * Every user's state, in the API's order: a header sorts the API's page with `onSort`, a row opens its user with
 * `onOpen`, and its checkbox ticks it for the selection toolbar (`selected`, `onSelect`). Live changes re-sort the rows on screen the same way, only while the pointer is off the table and no user
 * is open.
 */
export const UsersTable = ({
  rows,
  frozenAt,
  sort,
  order,
  onSort,
  openUserId,
  onOpen,
  selected,
  onSelect,
}: {
  rows: UserRow[];
  frozenAt: number | null;
  sort: UsersQuery['sort'];
  order: UsersQuery['order'];
  onSort: (sort: UsersQuery['sort'], order: UsersQuery['order']) => void;
  openUserId: string | null;
  onOpen: (userId: string) => void;
  selected: string[];
  onSelect: (userIds: string[]) => void;
}) => {
  // The row order on screen when the pointer came onto the table or a user opened, so a live change never moves a
  // row under the admin. It holds while either lasts.
  const [frozenOrder, setFrozenOrder] = useState<string[] | null>(null);
  const [pointerOn, setPointerOn] = useState(false);
  const heldOrder = pointerOn || openUserId !== null ? frozenOrder : null;
  const data = useMemo(
    () => (heldOrder ? inOrder(rows, heldOrder) : rows),
    [rows, heldOrder],
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
    manualSorting: heldOrder !== null,
    meta: {
      frozenAt,
      onOpen: (userId) => {
        freeze();
        onOpen(userId);
      },
      selected,
      onSelect,
    },
  });

  // Called from events only, once `table` exists.
  const freeze = () =>
    setFrozenOrder(table.getRowModel().rows.map((row) => row.id));

  return (
    // A fixed height, whatever the page size or the rows a filter leaves: the table scrolls inside it, under its header.
    <TableContainer sx={{ height: sizes.usersTableHeight }}>
      <Table
        stickyHeader
        sx={{ tableLayout: 'fixed' }}
        aria-label="Users"
        onPointerEnter={() => {
          setPointerOn(true);
          freeze();
        }}
        // A header click lifts the freeze; the next move takes it again, in the new order.
        onPointerMove={() => {
          if (!frozenOrder) freeze();
        }}
        onPointerLeave={() => setPointerOn(false)}
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
                    padding={
                      header.column.id === 'select' ? 'checkbox' : 'normal'
                    }
                    sx={{ width: columnWidths[header.column.id] }}
                  >
                    {header.column.getCanSort() ? (
                      <TableSortLabel
                        active={sorted !== false}
                        direction={sorted || header.column.getFirstSortDir()}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <table.FlexRender header={header} />
                      </TableSortLabel>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <LiveRow
              key={row.id}
              user={row.original}
              selected={row.id === openUserId}
              onClick={() => table.options.meta?.onOpen(row.id)}
            >
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  padding={cell.column.id === 'select' ? 'checkbox' : 'normal'}
                  // The user ID heads its row, so a screen reader names each cell by its user.
                  {...(cell.column.id === 'id' && {
                    component: 'th',
                    scope: 'row',
                  })}
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
