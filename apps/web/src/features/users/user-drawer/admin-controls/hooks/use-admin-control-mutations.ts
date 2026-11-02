import {
  useAddExtraRequests,
  usePause,
  useResetLimit,
  useSetLimit,
  useUnlock,
} from '@/api/admin-controls/use-admin-controls';

/**
 * The five admin controls' mutations for one user, the failure messages to show, and `clearOtherFailures` to call
 * before a change starts, so only the latest change's failure shows.
 */
export const useAdminControlMutations = (userId: string) => {
  const reset = useResetLimit();
  const addExtra = useAddExtraRequests();
  const setLimit = useSetLimit();
  const pause = usePause();
  const unlock = useUnlock();

  const changes = [
    [reset, `Couldn't reset ${userId}'s limit.`],
    [addExtra, `Couldn't add requests for ${userId}.`],
    [setLimit, `Couldn't change ${userId}'s limit.`],
    [pause, `Couldn't pause ${userId}'s limit.`],
    [unlock, `Couldn't unlock ${userId}'s limit.`],
  ] as const;

  /** Clears every other change's failure; returns how many it cleared. */
  const clearOtherFailures = (mutation: (typeof changes)[number][0]) => {
    const others = changes.filter(([other]) => other !== mutation);

    for (const [other] of others) other.reset();

    return others.length;
  };

  const failureMessages = changes
    .filter(([mutation]) => mutation.isError)
    .map(([, message]) => message);

  return {
    reset,
    addExtra,
    setLimit,
    pause,
    unlock,
    clearOtherFailures,
    failureMessages,
  };
};
