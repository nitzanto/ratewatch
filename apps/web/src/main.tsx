import { CssBaseline, createTheme, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';

// Dynamic imports keep MSW out of the production bundle.
if (import.meta.env.DEV && import.meta.env.VITE_MOCKS === 'true') {
  const { setupWorker } = await import('msw/browser');
  const { handlers } = await import('./mocks/handlers');
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass' });
}

const theme = createTheme();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
