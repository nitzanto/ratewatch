import { StatusChip } from '@/components/status-chip';
import { useUser } from '@/api/users/use-user';
import { CloseIcon } from '@/theme/icons';
import { sizes } from '@/theme/sizes';
import {
  Alert,
  Button,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import type { Ref } from 'react';
import { Details } from './details';
import { DetailsSkeleton } from './details-skeleton';

/** The open user's header (ID, status, close button), then their details once loaded, a skeleton while loading, or a retry. */
export const UserDetails = ({
  userId,
  titleId,
  closeRef,
  frozenAt,
  onClose,
}: {
  userId: string;
  titleId: string;
  closeRef: Ref<HTMLButtonElement>;
  frozenAt: number | null;
  onClose: () => void;
}) => {
  const { data, isPending, isError, refetch } = useUser(userId);

  return (
    <Stack sx={{ gap: 3, px: 3, pt: 3, pb: 4 }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Stack sx={{ gap: 1 }}>
          <Typography id={titleId} variant="h5" component="h2">
            {userId}
          </Typography>
          {data ? (
            <StatusChip status={data.row.status} />
          ) : (
            isPending && (
              <Skeleton
                variant="rounded"
                width={84}
                height={sizes.statusChipHeight}
                sx={{ borderRadius: sizes.statusChipHeight / 2 }}
              />
            )
          )}
        </Stack>
        <IconButton
          ref={closeRef}
          aria-label="Close user details"
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      </Stack>
      {isPending ? (
        <DetailsSkeleton />
      ) : isError ? (
        <Alert
          severity="error"
          action={<Button onClick={() => refetch()}>Retry</Button>}
        >
          Couldn't load this user.
        </Alert>
      ) : (
        <Details userId={userId} detail={data} frozenAt={frozenAt} />
      )}
    </Stack>
  );
};
