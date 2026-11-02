import { renderWithProviders } from '@/test/render-app';
import { usersQuerySchema, type UsersQuery } from '@ratewatch/contracts';
import { fireEvent, screen } from '@testing-library/react';
import { UsersFilters } from './users-filters';

const counts = { ok: 2, warning: 1, exceeded: 1, paused: 1 };

const renderFilters = (
  changes: Partial<UsersQuery> = {},
  { hasActiveFilters = false, onChange = vi.fn(), onClear = vi.fn() } = {},
) =>
  renderWithProviders(
    <UsersFilters
      query={{ ...usersQuerySchema.parse({}), ...changes }}
      counts={counts}
      hasActiveFilters={hasActiveFilters}
      onChange={onChange}
      onClear={onClear}
    />,
  );

const chip = (name: string) => screen.getByRole('button', { name });

it('counts each status on its chip, and picks a status from its chip', async () => {
  const onChange = vi.fn();
  await renderFilters({}, { onChange });

  expect(chip('All 5')).toHaveProperty('ariaPressed', 'true');
  expect(chip('OK 2')).toBeTruthy();
  expect(chip('Exceeded 1')).toBeTruthy();
  expect(chip('Paused 1')).toBeTruthy();

  fireEvent.click(chip('Warning 1'));

  expect(onChange).toHaveBeenCalledWith({ status: 'warning' });
});

it("marks the picked status's chip", async () => {
  await renderFilters({ status: 'warning' });

  expect(chip('Warning 1')).toHaveProperty('ariaPressed', 'true');
  expect(chip('All 5')).toHaveProperty('ariaPressed', 'false');
});

it('offers to clear the filters while some are set', async () => {
  const onClear = vi.fn();
  await renderFilters(
    { status: 'warning' },
    { hasActiveFilters: true, onClear },
  );

  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

  expect(onClear).toHaveBeenCalled();
});

it('offers no clearing without filters', async () => {
  await renderFilters();

  expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
});

it('picks when users were last active', async () => {
  const onChange = vi.fn();
  await renderFilters({}, { onChange });

  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Last active' }));
  fireEvent.click(screen.getByRole('option', { name: 'Last 15 minutes' }));

  expect(onChange).toHaveBeenCalledWith({ activeWithin: '15m' });
});
