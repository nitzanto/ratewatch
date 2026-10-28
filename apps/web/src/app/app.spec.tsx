import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/node';
import App from './app';

describe('App', () => {
  it('shows the API health status', async () => {
    render(<App />);

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

    render(<App />);

    expect(await screen.findByText('API unreachable')).toBeTruthy();
  });

  it('shows an error when the response breaks the contract', async () => {
    server.use(
      http.get('/api/health', () => HttpResponse.json({ status: 'down' })),
    );

    render(<App />);

    expect(await screen.findByText('API unreachable')).toBeTruthy();
  });
});
