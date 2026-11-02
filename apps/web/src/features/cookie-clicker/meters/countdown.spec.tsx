import { renderWithProviders } from '@/test/render-app';
import { formatClockTime } from '@/utils/format-time';
import { screen } from '@testing-library/react';
import { Countdown } from './countdown';

describe('Countdown', () => {
  it('counts down to the retry time as m:ss and says when clicking comes back', async () => {
    const retryAt = new Date('2026-10-30T18:01:30.000Z');

    await renderWithProviders(
      <Countdown
        now={Date.parse('2026-10-30T18:00:00.000Z')}
        retryAt={retryAt}
      />,
    );

    expect(screen.getByRole('timer')).toHaveProperty('textContent', '1:30');
    expect(
      screen.getByText(
        `until Crumb is whole again and you can click at ${formatClockTime(retryAt)}`,
      ),
    ).toBeTruthy();
  });

  it('never shows a negative wait', async () => {
    await renderWithProviders(
      <Countdown
        now={Date.parse('2026-10-30T18:02:00.000Z')}
        retryAt={new Date('2026-10-30T18:01:30.000Z')}
      />,
    );

    expect(screen.getByRole('timer')).toHaveProperty('textContent', '0:00');
  });
});
