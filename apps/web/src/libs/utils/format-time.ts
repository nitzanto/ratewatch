/** A wait as `m:ss`, from whole-second ms (see `useNow`). */
export const formatCountdown = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** How far ahead a time is, in whole minutes rounded up (`in 52 min`); `now` once it has come. */
export const formatTimeUntil = (ms: number) =>
  ms > 0 ? `in ${Math.ceil(ms / 60_000)} min` : 'now';

/** How long ago a time was (`8 s ago`, `3 min ago`, `2 h ago`). */
export const formatTimeAgo = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
};

/** A clock time to the minute, in the user's locale (`18:01`). */
export const formatHourMinute = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** A clock time to the second, in the user's locale (`18:01:30`). */
export const formatClockTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
