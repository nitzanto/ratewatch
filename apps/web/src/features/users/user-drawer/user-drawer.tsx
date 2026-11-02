import { Drawer } from '@mui/material';
import { useId, useRef, useState } from 'react';
import { UserDetails } from './details/user-details';

/** One user's stats, admin controls, activity and recent requests, live, in a dialog from the right; `userId` `null` closes it. */
export const UserDrawer = ({
  userId,
  frozenAt,
  onClose,
}: {
  userId: string | null;
  frozenAt: number | null;
  onClose: () => void;
}) => {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  // Still shows the user while the drawer slides out.
  const [shownUserId, setShownUserId] = useState<string | null>(userId);

  if (userId !== null && userId !== shownUserId) setShownUserId(userId);

  return (
    <Drawer
      anchor="right"
      open={userId !== null}
      onClose={onClose}
      // The focus starts on the close button, so Enter or Esc closes the drawer at once. MUI's own would go to the
      // panel, and the button can't take it before the panel starts sliding in.
      disableAutoFocus
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': titleId,
        },
        transition: { onEntering: () => closeRef.current?.focus() },
      }}
    >
      {shownUserId && (
        <UserDetails
          key={shownUserId}
          userId={shownUserId}
          titleId={titleId}
          closeRef={closeRef}
          frozenAt={frozenAt}
          onClose={onClose}
        />
      )}
    </Drawer>
  );
};
