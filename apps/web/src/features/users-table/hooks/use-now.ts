import { useSyncExternalStore } from 'react';

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

const tick = () => {
  now = Date.now();
  listeners.forEach((listener) => listener());
};

// One timer for every component on screen, running only while one is subscribed.
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(tick, 1000);
    tick();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    clearInterval(timer);
    timer = undefined;
  };
};

/** The current time (ms), ticking every second. Only the component that calls it re-renders on a tick. */
export const useNow = () => useSyncExternalStore(subscribe, () => now);
