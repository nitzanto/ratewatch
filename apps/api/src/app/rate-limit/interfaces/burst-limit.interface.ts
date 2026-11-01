/** A token bucket per User, on top of the hourly window: it holds `capacity` tokens and gets `refillPerSecond` back. */
export interface BurstLimit {
  capacity: number;
  refillPerSecond: number;
}
