import { renderApp } from '@/libs/test-utils/render-app';
import { server } from '@/mocks/node';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

const page = () => within(screen.getByRole('main'));
const appBar = () => within(screen.getByRole('banner'));
const pageTitle = (name: string) =>
  page().findByRole('heading', { level: 1, name });

describe('App', () => {
  it('shows the API health status on the dashboard and in the app bar', async () => {
    await renderApp();

    expect(page().getByRole('progressbar')).toBeTruthy();
    expect(await page().findByRole('status')).toHaveProperty(
      'textContent',
      'API status: ok',
    );
    expect(appBar().getByRole('status')).toHaveProperty(
      'textContent',
      'API OK',
    );
  });

  it('shows an error when the API is unreachable', async () => {
    server.use(
      http.get('/api/health', () => new HttpResponse(null, { status: 503 })),
    );

    await renderApp();

    expect(await page().findByText('API unreachable')).toBeTruthy();
    expect(appBar().getByRole('status')).toHaveProperty(
      'textContent',
      'API unreachable',
    );
  });

  it('shows an error when the response breaks the contract', async () => {
    server.use(
      http.get('/api/health', () => HttpResponse.json({ status: 'down' })),
    );

    await renderApp();

    expect(await page().findByText('API unreachable')).toBeTruthy();
  });
});

describe('Routing', () => {
  it('moves between the dashboard and the cookie clicker', async () => {
    await renderApp('/play');

    expect(await pageTitle('Cookie Clicker')).toBeTruthy();
    expect(
      appBar().getByRole('link', { name: 'Cookie Clicker', current: 'page' }),
    ).toBeTruthy();

    fireEvent.click(appBar().getByRole('link', { name: 'Dashboard' }));

    expect(await pageTitle('Dashboard')).toBeTruthy();
    expect(
      appBar().getByRole('link', { name: 'Dashboard', current: 'page' }),
    ).toBeTruthy();
  });

  it('shows a not-found page inside the shell for an unknown URL', async () => {
    await renderApp('/no-such-page');

    expect(await pageTitle('Page not found')).toBeTruthy();
    expect(appBar().getByRole('navigation', { name: 'Main' })).toBeTruthy();

    fireEvent.click(page().getByRole('link', { name: 'Go to the dashboard' }));

    expect(await pageTitle('Dashboard')).toBeTruthy();
  });
});
