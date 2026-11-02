import { sizes } from '@/theme/sizes';
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
} from '@mui/material';
import {
  useTable,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { LiveRow } from './live-row';
import {
  columns,
  columnWidths,
  defaultColumn,
  features,
} from './utils/columns';

/**
 * Every user's state, in the API's order: a header sorts the API's page with `onSort`, a row opens its user with
 * `onOpen`, and its checkbox ticks it for the selection toolbar (`selectedUserIds`, `onSelect`). Live changes re-sort
 * the rows on screen the same way, at once.
 */
export const UsersTable = ({
  rows,
  frozenAt,
  sort,
  order,
  onSort,
  openUserId,
  onOpen,
  selectedUserIds,
  onSelect,
}: {
  rows: UserRow[];
  frozenAt: number | null;
  sort: UsersQuery['sort'];
  order: UsersQuery['order'];
  onSort: (sort: UsersQuery['sort'], order: UsersQuery['order']) => void;
  openUserId: string | null;
  onOpen: (userId: string) => void;
  selectedUserIds: string[];
  onSelect: (userIds: string[]) => void;
}) => {
  const sorting = [{ id: sort, desc: order === 'desc' }];

  const table = useTable({
    features,
    columns,
    defaultColumn,
    data: rows,
    getRowId: (row) => row.userId,
    state: { sorting },
    onSortingChange: (updater: Updater<SortingState>) => {
      const [next] = typeof updater === 'function' ? updater(sorting) : updater;

      onSort(
        usersQuerySchema.shape.sort.parse(next.id),
        next.desc ? 'desc' : 'asc',
      );
    },
    enableSortingRemoval: false,
    sortDescFirst: false,
    meta: { frozenAt, onOpen, selectedUserIds, onSelect },
  });

  return (
    // A fixed height, whatever the page size or the rows a filter leaves: the table scrolls inside it, under its header.
    <TableContainer sx={{ height: sizes.usersTableHeight }}>
      <Table stickyHeader sx={{ tableLayout: 'fixed' }} aria-label="Users">
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
