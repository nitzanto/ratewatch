import { renderApp } from '@/libs/test-utils/render-app';
import { server } from '@/mocks/node';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

describe('App', () => {
  it('shows the API health status', async () => {
    renderApp();

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(await screen.findByRole('status')).toHaveProperty(
      'textContent',
      'API status: ok',
    );
  });

  it('shows an error when the API is unreachable', async () => {
    server.use(
      http.get('/api/health', () => new HttpResponse(null, { status: 503 })),
    );

    renderApp();

    expect(await screen.findByText('API unreachable')).toBeTruthy();
  });

  it('shows an error when the response breaks the contract', async () => {
    server.use(
      http.get('/api/health', () => HttpResponse.json({ status: 'down' })),
    );

    renderApp();

    expect(await screen.findByText('API unreachable')).toBeTruthy();
  });
});
