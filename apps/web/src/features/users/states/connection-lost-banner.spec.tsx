import { renderWithProviders } from '@/test/render-app';
import { formatClockTime } from '@/utils/format-time';
import { screen } from '@testing-library/react';
import { ConnectionLostBanner } from './connection-lost-banner';

it('says the users shown are as of when the connection dropped', async () => {
  const lostAt = Date.parse('2026-11-02T09:15:30Z');
  await renderWithProviders(<ConnectionLostBanner lostAt={lostAt} />);

  expect(screen.getByRole('alert')).toHaveProperty(
    'textContent',
    `Connection lost. Showing the users as of ${formatClockTime(new Date(lostAt))}; reconnecting…`,
  );
});
