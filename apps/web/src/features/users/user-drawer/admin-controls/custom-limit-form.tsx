import { limitSchema, maxLimit, type UserRow } from '@ratewatch/contracts';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { useState, type SubmitEvent } from 'react';
import { buildSplitNote, getLimitProblem } from './utils/custom-limit';

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
  const [limitInput, setLimitInput] = useState<string>(String(row.baseLimit));
  const parsed = limitSchema.safeParse(Number(limitInput));

  // An empty field is 0, so it fails the 1 to 1,000 rule too.
  const limit = parsed.success ? parsed.data : null;
  const extra = row.limit - row.baseLimit;
  const problem = getLimitProblem(limit, extra);
  const note = buildSplitNote(row, limit, extra);

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
          label="Limit every hour"
          value={limitInput}
          onChange={(event) => setLimitInput(event.target.value)}
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
      {!problem && note && (
        // A status, not an alert: it explains the limit, nothing is wrong.
        <Alert severity="info" role="status">
          {note}
        </Alert>
      )}
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
