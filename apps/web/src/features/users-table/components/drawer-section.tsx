import { Stack, Typography } from '@mui/material';
import { useId, type ReactNode } from 'react';

/** A titled part of the drawer, ruled off from the one above. */
export const DrawerSection = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: (titleId: string) => ReactNode;
}) => {
  const titleId = useId();
  return (
    <Stack
      component="section"
      aria-labelledby={titleId}
      sx={{ gap: 1, pt: 2, borderTop: 1, borderColor: 'border' }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography id={titleId} variant="subtitle2" component="h3">
          {title}
        </Typography>
        {action}
      </Stack>
      {children(titleId)}
    </Stack>
  );
};
