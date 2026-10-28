import { render, screen } from '@testing-library/react';
import App from './app';

// shortcut: stubs fetch directly; switch to MSW handlers when #9 lands.
function stubFetch(response: Response) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the API health status', async () => {
    stubFetch(Response.json({ status: 'ok' }));

    render(<App />);

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(await screen.findByRole('status')).toHaveProperty(
      'textContent',
      'API status: ok',
    );
    expect(fetch).toHaveBeenCalledWith('/api/health', expect.anything());
  });

  it('shows an error when the API is unreachable', async () => {
    stubFetch(new Response(null, { status: 503 }));

    render(<App />);

    expect(await screen.findByText('API unreachable')).toBeTruthy();
  });

  it('shows an error when the response breaks the contract', async () => {
    stubFetch(Response.json({ status: 'down' }));

    render(<App />);

    expect(await screen.findByText('API unreachable')).toBeTruthy();
  });
});
