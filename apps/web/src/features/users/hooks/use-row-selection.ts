import type { UserRow } from '@ratewatch/contracts';
import { useState } from 'react';

/**
 * The ticked users. Only those still on screen count: a new page, search or filter leaves the others out, so
 * `selectedOnScreen` is what the toolbar acts on and the table shows ticked.
 */
export const useRowSelection = (rowsOnScreen: UserRow[]) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const selectedOnScreen = selectedUserIds.filter((userId) =>
    rowsOnScreen.some((row) => row.userId === userId),
  );

  return {
    selectedOnScreen,
    select: setSelectedUserIds,
    clearSelection: () => setSelectedUserIds([]),
  };
};
