import { renderApp } from '@/test/render-app';
import { server } from '@/mocks/node';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

const page = () => within(screen.getByRole('main'));
const appBar = () => within(screen.getByRole('banner'));
const crumb = () => page().getByRole('button', { name: /^Crumb/ });

describe('Play page', () => {
  it('shows the cookie clicker under its title', async () => {
    await renderApp('/play');

    expect(
      await page().findByRole('heading', { name: 'Cookie Clicker', level: 1 }),
    ).toBeTruthy();
    expect(await page().findByRole('button', { name: /^Crumb/ })).toBeTruthy();
  });

  describe('at the limit', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date('2026-10-30T18:00:00.000Z'));
    });
    afterEach(() => vi.useRealTimers());

    it('keeps the wait when the user leaves the page and comes back', async () => {
      server.use(
        http.post('/api/clicks', () =>
          HttpResponse.json(
            {
              message: 'Too many requests.',
              retryAt: '2026-10-30T18:01:30.000Z',
              reason: 'hourly',
            },
            { status: 429 },
          ),
        ),
      );
      await renderApp('/play');
      fireEvent.click(await page().findByRole('button', { name: /^Crumb/ }));
      expect(await page().findByRole('timer')).toBeTruthy();

      // A User has no other tab: home unmounts the page, then sends them back to it.
      fireEvent.click(appBar().getByRole('link', { name: /ratewatch/ }));

      expect(await page().findByRole('timer')).toBeTruthy();
      expect(crumb()).toHaveProperty('disabled', true);
    });
  });
});
