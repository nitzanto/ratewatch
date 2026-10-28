import { Alert, CircularProgress, Container, Typography } from '@mui/material';
import {
  type HealthResponse,
  healthResponseSchema,
} from '@ratewatch/contracts';
import { useEffect, useState } from 'react';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; health: HealthResponse }
  | { kind: 'error' };

async function fetchHealth(signal: AbortSignal): Promise<HealthResponse> {
  const res = await fetch('/api/health', { signal });
  if (!res.ok) throw new Error(`GET /api/health: ${res.status}`);
  // The API is a trust boundary for the browser too: parse, don't cast.
  return healthResponseSchema.parse(await res.json());
}

export default function App() {
  const [state, setState] = useState<HealthState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((health) => setState({ kind: 'ok', health }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: 'error' });
      });
    return () => controller.abort();
  }, []);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        ratewatch
      </Typography>
      {state.kind === 'loading' && <CircularProgress aria-label="Loading" />}
      {state.kind === 'ok' && (
        <Alert severity="success" role="status">
          API status: {state.health.status}
        </Alert>
      )}
      {state.kind === 'error' && (
        <Alert severity="error">API unreachable</Alert>
      )}
    </Container>
  );
}
