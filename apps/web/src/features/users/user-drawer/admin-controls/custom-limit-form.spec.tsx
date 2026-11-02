import { userRow } from '@/mocks/data/users';
import { renderWithProviders } from '@/test/render-app';
import { minuteMs } from '@/test/users-table';
import { formatHourMinute } from '@/utils/format-time';
import type { UserRow } from '@ratewatch/contracts';
import { fireEvent, screen } from '@testing-library/react';
import { CustomLimitForm } from './custom-limit-form';

const renderForm = (row: UserRow, onSave = vi.fn()) =>
  renderWithProviders(
    <CustomLimitForm row={row} saving={false} onSave={onSave} />,
  );

const limitField = () =>
  screen.getByRole('spinbutton', { name: 'Limit every hour' });
const saveLimit = () => screen.getByRole('button', { name: 'Save limit' });
const typeLimit = (value: string) =>
  fireEvent.change(limitField(), { target: { value } });

it("starts from the user's limit, and saves a new one", async () => {
  const onSave = vi.fn();
  await renderForm(userRow('user-aaaa1111', 59, 4_000), onSave);
  expect(limitField()).toHaveProperty('value', '100');
  expect(saveLimit()).toHaveProperty('disabled', true);

  typeLimit('250');
  fireEvent.click(saveLimit());

  expect(onSave).toHaveBeenCalledWith(250);
});

it('warns only when the next request would be refused', async () => {
  await renderForm(userRow('user-aaaa1111', 59, 4_000));
  const warning =
    'user-aaaa1111 has already used 59 requests this hour, so their next one will be refused.';

  typeLimit('60');
  expect(screen.queryByText(warning)).toBeNull();

  typeLimit('59');
  expect(screen.getByText(warning)).toBeTruthy();
  expect(saveLimit()).toHaveProperty('disabled', false);
});

it("counts this window's extra requests before warning", async () => {
  // 60 used of 100 plus 10 extra requests.
  await renderForm(
    userRow('user-aaaa1111', 60, 4_000, { limit: 110, baseLimit: 100 }),
  );

  typeLimit('55');
  expect(screen.queryByRole('alert')).toBeNull();

  typeLimit('50');
  expect(screen.getByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('their next one will be refused'),
  );
});

it("splits this hour's limit into the limit every hour and the extra requests", async () => {
  const resetAt = new Date(Date.now() + 30 * minuteMs);
  await renderForm(
    userRow('user-aaaa1111', 60, 4_000, {
      limit: 110,
      baseLimit: 100,
      resetAt: resetAt.toISOString(),
    }),
  );
  const split = `110 this hour = 100 limit + 10 extra, until ${formatHourMinute(resetAt)}.`;

  // The field holds the limit every hour, so there's nothing to save: Reset limit is the way to drop the extra.
  expect(screen.getByRole('status')).toHaveProperty(
    'textContent',
    `${split} Reset limit clears the extra requests now.`,
  );
  expect(saveLimit()).toHaveProperty('disabled', true);

  typeLimit('150');
  expect(screen.getByRole('status')).toHaveProperty('textContent', split);
});

it('says a paused user is refused only once the pause ends', async () => {
  await renderForm(
    userRow('user-aaaa1111', 59, 4_000, {
      status: 'paused',
      pausedUntil: new Date(Date.now() + 15 * minuteMs).toISOString(),
    }),
  );

  typeLimit('50');

  expect(
    screen.getByText(
      'user-aaaa1111 has already used 59 requests this hour, so their requests will be refused once their pause ends.',
    ),
  ).toBeTruthy();
});

it.each(['0', '1001', '2.5', ''])(
  'refuses a limit of "%s", as the API does',
  async (value) => {
    await renderForm(userRow('user-aaaa1111', 59, 4_000));

    typeLimit(value);

    expect(
      screen.getByText('Enter a whole number from 1 to 1,000.'),
    ).toBeTruthy();
    expect(saveLimit()).toHaveProperty('disabled', true);
  },
);

it("keeps the limit and this window's extra requests at 1,000 or under", async () => {
  const onSave = vi.fn();
  await renderForm(
    userRow('user-aaaa1111', 60, 4_000, { limit: 110, baseLimit: 100 }),
    onSave,
  );

  typeLimit('991');

  expect(
    screen.getByText(
      "With 10 extra requests this hour, the limit can't go above 990.",
    ),
  ).toBeTruthy();
  expect(saveLimit()).toHaveProperty('disabled', true);

  typeLimit('990');
  fireEvent.click(saveLimit());

  expect(onSave).toHaveBeenCalledWith(990);
});
