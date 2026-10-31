/** A wait as `m:ss`, from whole-second ms (see `useNow`). */
export const formatCountdown = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** A clock time to the second, in the user's locale (`18:01:30`). */
export const formatClockTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
