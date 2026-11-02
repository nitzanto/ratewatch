import { useState } from 'react';

/**
 * How many times `value` has changed since the component mounted, compared by identity. The query cache keeps an
 * unchanged row the same object, so a new object means a real change.
 */
export const useChangeCount = <Value>(value: Value) => {
  const [lastSeenValue, setLastSeenValue] = useState<Value>(value);
  const [changeCount, setChangeCount] = useState<number>(0);

  // Adjusting state while rendering, as React's docs show for "storing information from previous renders".
  if (value !== lastSeenValue) {
    setLastSeenValue(value);
    setChangeCount(changeCount + 1);
  }

  return changeCount;
};
