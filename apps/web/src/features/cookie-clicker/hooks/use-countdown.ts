import { useEffect, useState } from 'react';

// Whole seconds, so the countdown and the ring move once a second.
const nowInSeconds = () => Math.floor(Date.now() / 1000) * 1000;

/** The current time, ticking every second until `until` (ms), then `onDone`. Runs only while its component is mounted. */
export const useCountdown = (until: number, onDone: () => void) => {
  const [now, setNow] = useState(nowInSeconds);

  // eslint-disable-next-line no-restricted-syntax -- a timer is an outside system to sync with: it starts on mount and is cleared on unmount, so it ticks only while the wait is on screen.
  useEffect(() => {
    const tick = () => {
      const time = nowInSeconds();
      setNow(time);
      if (time < until) return;
      clearInterval(id);
      onDone();
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until, onDone]);

  return now;
};
