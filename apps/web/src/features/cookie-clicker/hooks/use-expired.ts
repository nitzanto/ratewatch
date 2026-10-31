import { useEffect, useState } from 'react';

/** `true` once `ms` have passed since the component mounted; remount it (with a `key`) to start again. */
export const useExpired = (ms: number) => {
  const [expired, setExpired] = useState<boolean>(false);

  // eslint-disable-next-line no-restricted-syntax -- a timeout is an outside system to sync with: set on mount, cleared on unmount.
  useEffect(() => {
    const id = setTimeout(() => setExpired(true), ms);
    return () => clearTimeout(id);
  }, [ms]);

  return expired;
};
