import { useHealth } from '@/hooks/api/use-health';
import { realtimeStatusStore } from '@/libs/realtime/realtime-client';
import { sizes } from '@/libs/theme/sizes';
import { Box, Chip } from '@mui/material';
import { useSyncExternalStore } from 'react';

const realtimeLabels = {
  connecting: '',
  live: 'Live · ',
  lost: 'Reconnecting · ',
};

/** The app bar's connection pill: the API's health, and the live connection's state on a page that holds one. */
export const ApiStatusPill = () => {
  const { isPending, isError } = useHealth();
  const realtime = useSyncExternalStore(
    realtimeStatusStore.subscribe,
    realtimeStatusStore.get,
  );

  if (isPending) return null;

  return (
    <Chip
      variant="shell"
      role="status"
      icon={
        <Box
          sx={{
            width: sizes.statusDot,
            height: sizes.statusDot,
            borderRadius: '50%',
            bgcolor: isError ? 'shell.down' : 'shell.ok',
          }}
        />
      }
      label={
        isError
          ? 'API unreachable'
          : `${realtime ? realtimeLabels[realtime] : ''}API OK`
      }
    />
  );
};
