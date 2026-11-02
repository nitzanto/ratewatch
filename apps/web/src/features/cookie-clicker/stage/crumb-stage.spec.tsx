import { renderWithProviders } from '@/test/render-app';
import { fireEvent, screen } from '@testing-library/react';
import { CrumbStage } from './crumb-stage';

describe('CrumbStage', () => {
  it('sends a click and floats a "−1" each time Crumb is clicked', async () => {
    const onClick = vi.fn();
    await renderWithProviders(<CrumbStage mood="fresh" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Crumb, OK: fresh' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByText('−1')).toBeTruthy();
  });

  it('sends no click while disabled', async () => {
    const onClick = vi.fn();
    await renderWithProviders(
      <CrumbStage mood="exceeded" onClick={onClick} disabled />,
    );

    const crumb = screen.getByRole('button', { name: /^Crumb/ });
    fireEvent.click(crumb);

    expect(crumb).toHaveProperty('disabled', true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('draws what it is given around Crumb', async () => {
    await renderWithProviders(
      <CrumbStage mood="fresh" onClick={vi.fn()} around={<span>ring</span>} />,
    );

    expect(screen.getByText('ring')).toBeTruthy();
  });
});
