import {
  connectRealtime,
  type RealtimeConnection,
} from '@/api/realtime/realtime-client';
import { dropRealtime } from '@/mocks/realtime';
import { renderWithProviders } from '@/test/render-app';
import { act, screen, waitFor } from '@testing-library/react';
import { ApiStatusPill } from './api-status-pill';

it('shows the live connection beside the API health while a page holds one', async () => {
  await renderWithProviders(<ApiStatusPill />);
  const pill = () => screen.getByRole('status');

  await waitFor(() => expect(pill()).toHaveProperty('textContent', 'API OK'));

  // The connection a page such as the dashboard opens.
  let connection: RealtimeConnection | undefined;
  act(() => {
    connection = connectRealtime({
      onUpdate: vi.fn(),
      onLimitExceeded: vi.fn(),
      onSummary: vi.fn(),
      onRows: vi.fn(),
      onStatus: vi.fn(),
      onRefused: vi.fn(),
    });
  });

  expect(pill()).toHaveProperty('textContent', 'Live · API OK');

  act(() => dropRealtime());

  expect(pill()).toHaveProperty('textContent', 'Reconnecting · API OK');

  act(() => connection?.close());

  expect(pill()).toHaveProperty('textContent', 'API OK');
});
