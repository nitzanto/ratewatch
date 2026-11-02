import { canSetLimit, maxLimit, type UserRow } from '@ratewatch/contracts';
import { formatHourMinute } from '@/utils/format-time';

/** Why `limit` can't be saved, or `undefined` when it can; `extra` is the window's extra requests, kept on top. */
export const getLimitProblem = (limit: number | null, extra: number) => {
  if (limit === null)
    return `Enter a whole number from 1 to ${maxLimit.toLocaleString('en')}.`;

  if (!canSetLimit(limit, extra))
    return `With ${extra} extra requests this hour, the limit can't go above ${(maxLimit - extra).toLocaleString('en')}.`;

  return undefined;
};

/**
 * How this hour's limit splits into the limit every hour and the extra requests on top, or `undefined` without extra
 * requests. Typing the limit it already has points to Reset limit, the one way to drop the extra requests early.
 */
export const buildSplitNote = (
  row: UserRow,
  limit: number | null,
  extra: number,
) => {
  if (extra <= 0 || row.resetAt === null) return undefined;

  const split = `${row.limit.toLocaleString('en')} this hour = ${row.baseLimit.toLocaleString('en')} limit + ${extra} extra, until ${formatHourMinute(new Date(row.resetAt))}.`;

  return limit === row.baseLimit
    ? `${split} Reset limit clears the extra requests now.`
    : split;
};
