import { useHealth } from '@/hooks/api/use-health';
import { sizes } from '@/libs/theme/sizes';
import { Box, Chip } from '@mui/material';

/** The app bar's connection pill. The live and reconnecting states arrive with the realtime connection. */
export const ApiStatusPill = () => {
  const { isPending, isError } = useHealth();

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
      label={isError ? 'API unreachable' : 'API OK'}
    />
  );
};
