import { renderWithProviders } from '@/test/render-app';
import { screen } from '@testing-library/react';
import { UsageMeter } from './usage-meter';

// Hidden (before a count) the bar has no accessible name, so it's found by role alone.
const bar = () => screen.getByRole('progressbar', { hidden: true });

describe('UsageMeter', () => {
  it('shows the share used and the status', async () => {
    await renderWithProviders(<UsageMeter status="warning" left={10} />);

    expect(
      screen.getByRole('progressbar', { name: 'Requests used this hour' }),
    ).toHaveProperty('ariaValueNow', '90');
    expect(screen.getByText('90% used')).toBeTruthy();
    expect(screen.getByText('Warning')).toBeTruthy();
  });

  it('stays in the layout at 0% with no status chip until there is a count', async () => {
    await renderWithProviders(
      <UsageMeter status={undefined} left={undefined} />,
    );

    expect(bar()).toHaveProperty('ariaValueNow', '0');
    expect(screen.queryByText('OK')).toBeNull();
  });
});
