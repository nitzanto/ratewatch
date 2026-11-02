import { userRow } from '@/mocks/data/users';
import {
  setMockRefusedToday,
  setMockUsers,
} from '@/mocks/handlers/admin-users';
import { server } from '@/mocks/node';
import { renderWithProviders } from '@/test/render-app';
import { minuteMs } from '@/test/users-table';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { SummaryCards } from './summary-cards';

const card = (name: string) => within(screen.getByRole('region', { name }));

const renderCards = () =>
  renderWithProviders(<SummaryCards />, { signedInAs: 'admin' });

it('shows the users, the share near their limit and the 429s today', async () => {
  setMockUsers([
    userRow('user-aaaa1111', 59, 4_000),
    userRow('user-bbbb2222', 95, 8_000),
    userRow('user-cccc3333', 100, 20_000),
    userRow('user-dddd4444', 12, 30_000),
    userRow('user-eeee5555', 0, 70 * minuteMs, {
      requestsLeft: 100,
      resetAt: null,
    }),
  ]);
  setMockRefusedToday(1234);
  await renderCards();

  expect(await card('Total users').findByText('5')).toBeTruthy();
  // Warning and Exceeded both count as near the limit.
  expect(card('Near their limit').getByText('40%')).toBeTruthy();
  expect(
    card('Near their limit').getByText('1 in Warning, 1 Exceeded'),
  ).toBeTruthy();
  expect(card('429s today (UTC)').getByText('1,234')).toBeTruthy();
});

it('shows no one near their limit when there are no users', async () => {
  setMockUsers([]);
  await renderCards();

  expect(await card('Near their limit').findByText('0%')).toBeTruthy();
});

it("says when the summary couldn't load", async () => {
  server.use(
    http.get('/api/admin/summary', () =>
      HttpResponse.json({ message: 'Down' }, { status: 503 }),
    ),
  );
  await renderCards();

  expect(
    await card('429s today (UTC)').findByText("Couldn't load the summary"),
  ).toBeTruthy();
});
