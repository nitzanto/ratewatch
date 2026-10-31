import {
  canSetLimit,
  limitSchema,
  maxLimit,
  type UserRow,
} from '@ratewatch/contracts';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { useState, type SubmitEvent } from 'react';

/** Why `limit` can't be saved, or `undefined` when it can; `extra` is the window's extra requests, kept on top. */
const problemWith = (limit: number | null, extra: number) => {
  if (limit === null)
    return `Enter a whole number from 1 to ${maxLimit.toLocaleString('en')}.`;
  if (!canSetLimit(limit, extra))
    return `With ${extra} extra requests this hour, the limit can't go above ${(maxLimit - extra).toLocaleString('en')}.`;
  return undefined;
};

/**
 * The custom limit's field and Save limit, the drawer's one primary action. Render it with `key={row.baseLimit}`, so
 * the field starts again from the user's limit whenever it changes.
 */
export const CustomLimitForm = ({
  row,
  saving,
  onSave,
}: {
  row: UserRow;
  saving: boolean;
  onSave: (limit: number) => void;
}) => {
  const [value, setValue] = useState(String(row.baseLimit));
  const parsed = limitSchema.safeParse(Number(value));
  // An empty field is 0, so it fails the 1 to 1,000 rule too.
  const limit = parsed.success ? parsed.data : null;
  const extra = row.limit - row.baseLimit;
  const problem = problemWith(limit, extra);
  // The next request is refused once what's used reaches the new limit plus this window's extra requests.
  const refusesNext =
    limit !== null && row.resetAt !== null && row.used >= limit + extra;

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (limit !== null && !problem) onSave(limit);
  };

  return (
    <Stack component="form" onSubmit={submit} noValidate sx={{ gap: 1 }}>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-start' }}>
        <TextField
          size="small"
          type="number"
          label="Limit per hour"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={problem !== undefined}
          helperText={problem}
          slotProps={{ htmlInput: { min: 1, max: maxLimit, step: 1 } }}
          sx={{ flexGrow: 1 }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={problem !== undefined || limit === row.baseLimit}
          loading={saving}
        >
          Save limit
        </Button>
      </Stack>
      {!problem && refusesNext && (
        <Alert severity="warning">
          {row.userId} has already used {row.used.toLocaleString('en')} requests
          this hour, so{' '}
          {row.pausedUntil
            ? 'their requests will be refused once their pause ends.'
            : 'their next one will be refused.'}
        </Alert>
      )}
    </Stack>
  );
};
