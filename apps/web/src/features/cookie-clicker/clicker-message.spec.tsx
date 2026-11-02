import { renderWithProviders } from '@/test/render-app';
import { act, screen } from '@testing-library/react';
import { ClickerMessage } from './clicker-message';

const hint = /^Each click spends one request/;

describe('ClickerMessage', () => {
  it('tells a waiting user that Crumb grows his bite back', async () => {
    await renderWithProviders(
      <ClickerMessage
        note={{ kind: 'refused', message: 'Too many requests.', waiting: true }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveProperty(
      'textContent',
      "You've hit your limitToo many requests. Crumb is growing his bite back while you wait.",
    );
  });

  it.each([
    [1, 'Almost out: 1 request left this hour.'],
    [5, 'Almost out: 5 requests left this hour.'],
  ])('warns when almost out, with %s left', async (requestsLeft, text) => {
    await renderWithProviders(
      <ClickerMessage note={{ kind: 'almost-out', requestsLeft }} />,
    );

    expect(screen.getByRole('note')).toHaveProperty('textContent', text);
  });

  it('warns after the last request', async () => {
    await renderWithProviders(
      <ClickerMessage note={{ kind: 'last-request' }} />,
    );

    expect(
      screen.getByText(/^That was your last request this hour/),
    ).toBeTruthy();
  });

  describe('brief notes', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
    afterEach(() => vi.useRealTimers());

    it.each([
      [
        'stage',
        { kind: 'stage', stage: 2 } as const,
        /^Three chips left/,
        4000,
      ],
      [
        'welcome-back',
        { kind: 'welcome-back' } as const,
        /^Welcome back\./,
        5000,
      ],
    ])(
      'shows the %s note for a moment, then the hint',
      async (_, note, text, ms) => {
        await renderWithProviders(<ClickerMessage note={note} />);

        expect(screen.getByText(text)).toBeTruthy();

        act(() => vi.advanceTimersByTime(ms));

        expect(screen.queryByText(text)).toBeNull();
        expect(screen.getByText(hint)).toBeTruthy();
      },
    );
  });
});
