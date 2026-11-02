import { Alert, Button } from '@mui/material';

type UsersLoadErrorProps = {
  onRetry: () => void;
};

/** Shown in place of the panel when the users fail to load. */
export const UsersLoadError = ({ onRetry }: UsersLoadErrorProps) => (
  <Alert severity="error" action={<Button onClick={onRetry}>Retry</Button>}>
    Couldn't load the users.
  </Alert>
);
