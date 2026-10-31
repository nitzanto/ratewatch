import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import {
  defineConfig,
  devices,
  type ReporterDescription,
} from '@playwright/test';

// From the root .env, which Nx loads, so they match the servers Nx starts.
const apiUrl = process.env['API_URL'];
const webUrl = `http://${process.env['WEB_HOST']}:${process.env['WEB_PORT']}`;

const preset = nxE2EPreset(import.meta.dirname, { testDir: './src' });

export default defineConfig({
  ...preset,
  // The preset only writes HTML and blob reports on CI: add one line per test, and failure annotations on the PR.
  reporter: process.env['CI']
    ? [...(preset.reporter as ReporterDescription[]), ['list'], ['github']]
    : preset.reporter,
  use: { trace: 'on-first-retry' },
  // Nx starts both servers first (inferred from these commands), so Playwright must reuse them, on CI too.
  webServer: [
    {
      command: 'pnpm nx serve api',
      url: `${apiUrl}/api/health`,
      reuseExistingServer: true,
      cwd: workspaceRoot,
    },
    {
      command: 'pnpm nx serve web',
      url: webUrl,
      reuseExistingServer: true,
      cwd: workspaceRoot,
    },
  ],
  projects: [
    // HTTP only, straight to the API through the `request` fixture: no browser, no web app.
    { name: 'api', testDir: './src/api', use: { baseURL: apiUrl } },
    {
      name: 'web',
      testDir: './src/web',
      use: { ...devices['Desktop Chrome'], baseURL: webUrl },
    },
  ],
});
