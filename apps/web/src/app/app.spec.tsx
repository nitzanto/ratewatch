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
    await renderApp('/dashboard', { signedInAs: 'admin' });

    expect(page().getByRole('progressbar', { name: 'Loading' })).toBeTruthy();
    expect(await page().findByRole('status')).toHaveProperty(
      'textContent',
      'OK',
    );
    expect(appBar().getByRole('status')).toHaveProperty(
      'textContent',
      'Live · API OK',
    );
  });

  it('shows an error when the API is unreachable', async () => {
    server.use(
      http.get('/api/health', () => new HttpResponse(null, { status: 503 })),
    );

    await renderApp('/dashboard', { signedInAs: 'admin' });

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

    await renderApp('/dashboard', { signedInAs: 'admin' });

    expect(await page().findByText('API unreachable')).toBeTruthy();
  });
});

describe('Routing', () => {
  it.each([
    ['a User', 'user', 'Cookie Clicker'],
    ['the Admin', 'admin', 'Dashboard'],
  ] as const)('opens %s on their start page', async (_, role, title) => {
    await renderApp('/', { signedInAs: role });

    expect(await pageTitle(title)).toBeTruthy();
  });

  it('moves between the dashboard and the cookie clicker', async () => {
    await renderApp('/play', { signedInAs: 'admin' });

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

  it('hides the Dashboard tab from a User', async () => {
    await renderApp('/play');

    expect(
      await appBar().findByRole('link', { name: 'Cookie Clicker' }),
    ).toBeTruthy();
    expect(appBar().queryByRole('link', { name: 'Dashboard' })).toBeNull();
  });

  it("shows a User who opens the dashboard a not-found page, so it doesn't reveal admin pages", async () => {
    await renderApp('/dashboard');

    expect(await pageTitle('Page not found')).toBeTruthy();
    expect(page().queryByRole('status')).toBeNull();
  });

  it('shows a not-found page inside the shell for an unknown URL', async () => {
    await renderApp('/no-such-page');

    expect(await pageTitle('Page not found')).toBeTruthy();
    expect(appBar().getByRole('navigation', { name: 'Main' })).toBeTruthy();

    fireEvent.click(page().getByRole('link', { name: 'Go to the start page' }));

    expect(await pageTitle('Cookie Clicker')).toBeTruthy();
  });
});
