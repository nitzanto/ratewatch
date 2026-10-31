import { useResetLimits } from '@/hooks/api/use-admin-controls';
import { sizes } from '@/libs/theme/sizes';
import { Button, Stack, Typography } from '@mui/material';

/**
 * Takes the filter row's place, at its height, while rows are ticked, so the table never moves. Resets the ticked
 * users together and clears the selection once done; a failure says so in the bar, keeping the selection.
 */
export const SelectionToolbar = ({
  userIds,
  onClear,
}: {
  userIds: string[];
  onClear: () => void;
}) => {
  const reset = useResetLimits();
  return (
    <Stack
      role="toolbar"
      aria-label="Selected users"
      direction="row"
      sx={{ alignItems: 'center', gap: 1, minHeight: sizes.filterRowHeight }}
    >
      <Typography variant="subtitle2" sx={{ mr: 1 }}>
        {userIds.length === 1 ? '1 user' : `${userIds.length} users`} selected
      </Typography>
      <Button
        variant="outlined"
        loading={reset.isPending}
        onClick={() => reset.mutate(userIds, { onSuccess: onClear })}
      >
        Reset their limits
      </Button>
      <Button onClick={onClear}>Clear selection</Button>
      {reset.isError && (
        <Typography role="alert" variant="body2" sx={{ color: 'error.main' }}>
          Couldn't reset their limits. Try again.
        </Typography>
      )}
    </Stack>
  );
};
