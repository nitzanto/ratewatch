import { renderWithProviders } from '@/test/render-app';
import { click } from '@/mocks/data/clicks';
import { server } from '@/mocks/node';
import { act, fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { CookieClicker } from './cookie-clicker';

const crumb = () => screen.getByRole('button', { name: /^Crumb/ });
const clickCrumb = async () =>
  fireEvent.click(await screen.findByRole('button', { name: /^Crumb/ }));

describe('CookieClicker', () => {
  it('counts down the requests left from each response', async () => {
    await renderWithProviders(<CookieClicker />);

    await clickCrumb();
    expect(await screen.findByText('99')).toBeTruthy();

    await clickCrumb();
    expect(await screen.findByText('98')).toBeTruthy();
    expect(screen.getByRole('status')).toHaveProperty(
      'textContent',
      '98requests left this hour',
    );
  });

  it.each([
    ['11', 'Crumb, OK: tired', 'OK', '89'],
    ['10', 'Crumb, Warning: nervous, one chip left', 'Warning', '90'],
    ['0', 'Crumb, Exceeded: bitten, no chips left', 'Exceeded', '100'],
  ])(
    'with %s left, Crumb is %s and the status is %s',
    async (count, name, status, usedPercent) => {
      server.use(
        http.post('/api/clicks', () =>
          HttpResponse.json(click(), { headers: { 'x-count': count } }),
        ),
      );
      await renderWithProviders(<CookieClicker />);

      await clickCrumb();

      expect(await screen.findByRole('button', { name })).toBeTruthy();
      expect(screen.getByText(status)).toBeTruthy();
      expect(
        screen.getByRole('progressbar', { name: 'Requests used this hour' }),
      ).toHaveProperty('ariaValueNow', usedPercent);
    },
  );

  it('drops an old count when a later response has no x-count', async () => {
    await renderWithProviders(<CookieClicker />);

    await clickCrumb();
    expect(await screen.findByText('99')).toBeTruthy();

    server.use(http.post('/api/clicks', () => HttpResponse.json(click())));
    await clickCrumb();

    expect(await screen.findByText('Limit unavailable')).toBeTruthy();
    expect(screen.queryByText('99')).toBeNull();
  });

  it('notes when Crumb drops a chip', async () => {
    const counts = ['81', '80'];
    server.use(
      http.post('/api/clicks', () =>
        HttpResponse.json(click(), {
          headers: { 'x-count': counts.shift() ?? '80' },
        }),
      ),
    );
    await renderWithProviders(<CookieClicker />);

    await clickCrumb();
    expect(await screen.findByText('81')).toBeTruthy();
    await clickCrumb();

    expect(
      await screen.findByText(/^Crumb dropped his first chip/),
    ).toBeTruthy();
  });

  it.each([
    ['missing', {}],
    ['malformed', { 'x-count': 'lots' }],
  ])('says the limit is unavailable when x-count is %s', async (_, headers) => {
    server.use(
      http.post('/api/clicks', () => HttpResponse.json(click(), { headers })),
    );
    await renderWithProviders(<CookieClicker />);

    expect(
      await screen.findByText('Click Crumb to see your requests left.'),
    ).toBeTruthy();

    await clickCrumb();

    expect(await screen.findByText('Limit unavailable')).toBeTruthy();
  });

  it('asks the user to slow down on a burst refusal, keeping the count and clicking on', async () => {
    let clicks = 0;
    server.use(
      http.post('/api/clicks', () =>
        ++clicks === 1
          ? HttpResponse.json(click(), { headers: { 'x-count': '99' } })
          : HttpResponse.json(
              {
                message: 'Too many requests at once. Slow down a little.',
                retryAt: new Date(Date.now() + 200).toISOString(),
                reason: 'burst',
              },
              { status: 429 },
            ),
      ),
    );
    await renderWithProviders(<CookieClicker />);

    await clickCrumb();
    expect(await screen.findByText('99')).toBeTruthy();
    await clickCrumb();

    expect(
      await screen.findByText('Too many requests at once. Slow down a little.'),
    ).toBeTruthy();
    expect(screen.getByText('99')).toBeTruthy();
    expect(screen.queryByRole('timer')).toBeNull();
    expect(crumb()).toHaveProperty('disabled', false);
  });

  describe('at the limit', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date('2026-10-30T18:00:00.000Z'));
    });
    afterEach(() => vi.useRealTimers());

    const refuseUntil = (retryAt: string) =>
      server.use(
        http.post('/api/clicks', () =>
          HttpResponse.json(
            { message: 'Too many requests.', retryAt, reason: 'hourly' },
            { status: 429 },
          ),
        ),
      );

    it('shows the message and counts down to the retry time, with clicking paused', async () => {
      refuseUntil('2026-10-30T18:01:30.000Z');
      await renderWithProviders(<CookieClicker />);

      await clickCrumb();

      expect(await screen.findByRole('alert')).toHaveProperty(
        'textContent',
        expect.stringContaining('Too many requests.'),
      );
      expect(screen.getByRole('timer')).toHaveProperty('textContent', '1:30');
      expect(crumb()).toHaveProperty('disabled', true);

      act(() => vi.advanceTimersByTime(61_000));
      expect(screen.getByRole('timer')).toHaveProperty('textContent', '0:29');
      expect(
        screen.getByRole('button', {
          name: 'Crumb, Exceeded: resting while his bite grows back',
        }),
      ).toBeTruthy();

      act(() => vi.advanceTimersByTime(29_000));
      expect(screen.queryByRole('timer')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(crumb()).toHaveProperty('disabled', false);
      expect(screen.getByText(/^Welcome back\./)).toBeTruthy();
      expect(
        screen.getByText('Your limit has reset. Click to see your new count.'),
      ).toBeTruthy();
    });

    it('shows no old count when the first click after a wait fails', async () => {
      refuseUntil('2026-10-30T18:01:30.000Z');
      await renderWithProviders(<CookieClicker />);
      await clickCrumb();
      await screen.findByRole('timer');
      act(() => vi.advanceTimersByTime(90_000));
      expect(screen.getByText(/^Welcome back\./)).toBeTruthy();

      server.use(
        http.post('/api/clicks', () => new HttpResponse(null, { status: 500 })),
      );
      await clickCrumb();

      expect(await screen.findByRole('alert')).toHaveProperty(
        'textContent',
        "Crumb's click didn't go through. Try again.",
      );
      expect(screen.queryByText('requests left this hour')).toBeNull();
      expect(
        screen.getByText('Your limit has reset. Click to see your new count.'),
      ).toBeTruthy();
    });

    it('still shows the refusal when its retry time has already passed on this clock', async () => {
      refuseUntil('2026-10-30T17:59:00.000Z');
      await renderWithProviders(<CookieClicker />);

      await clickCrumb();

      expect(await screen.findByRole('alert')).toHaveProperty(
        'textContent',
        expect.stringContaining('Too many requests.'),
      );
      expect(screen.queryByRole('timer')).toBeNull();
      expect(crumb()).toHaveProperty('disabled', false);
    });

    it('shows a plain error, without a countdown, when the 429 body breaks the contract', async () => {
      server.use(
        http.post('/api/clicks', () =>
          HttpResponse.json({ message: 'Too many' }, { status: 429 }),
        ),
      );
      await renderWithProviders(<CookieClicker />);

      await clickCrumb();

      expect(await screen.findByRole('alert')).toHaveProperty(
        'textContent',
        "Crumb's click didn't go through. Try again.",
      );
      expect(screen.queryByRole('timer')).toBeNull();
      expect(crumb()).toHaveProperty('disabled', false);
    });
  });
});
