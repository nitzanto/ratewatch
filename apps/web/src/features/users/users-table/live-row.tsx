import { palette } from '@/theme/palette';
import type { UserRow } from '@ratewatch/contracts';
import { TableRow } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useChangeCount } from './hooks/use-change-count';

// Two copies of the flash, alternated per change so each one restarts it. Emotion names keyframes
// by their content, so the second is written with percentages to get its own name.
const flash = keyframes`from { background-color: ${palette.liveFlash} } to { background-color: transparent }`;
const flashAgain = keyframes`0% { background-color: ${palette.liveFlash} } 100% { background-color: transparent }`;

/**
 * A row that flashes `live-flash` each time its user changes, and opens its user on a click. The rows come from the
 * query cache, which keeps an unchanged row the same object.
 */
export const LiveRow = ({
  user,
  selected,
  onClick,
  children,
}: {
  user: UserRow;
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) => {
  const changeCount = useChangeCount(user);

  return (
    <TableRow
      hover
      selected={selected}
      onClick={onClick}
      data-flash={changeCount ? changeCount % 2 : undefined}
      sx={{
        cursor: 'pointer',
        ...(changeCount && {
          animation: `${changeCount % 2 ? flash : flashAgain} 1.6s ease-out`,
        }),
      }}
    >
      {children}
    </TableRow>
  );
};
