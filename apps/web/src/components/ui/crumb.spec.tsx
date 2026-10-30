import { sizes } from '@/libs/theme/sizes';
import { theme } from '@/libs/theme/theme';
import { ThemeProvider } from '@mui/material';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Crumb, type CrumbMood } from './crumb';

// Crumb's moods aren't all reachable through a page yet, so he's rendered on his own with the real theme.
const render = (ui: ReactElement) =>
  rtlRender(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    ),
  });

describe('Crumb', () => {
  it.each<[CrumbMood, string]>([
    ['fresh', 'Crumb, OK: fresh'],
    ['warming-up', 'Crumb, OK: warming up'],
    ['excited', 'Crumb, OK: excited'],
    ['focused', 'Crumb, OK: focused'],
    ['tired', 'Crumb, OK: tired'],
    ['warning', 'Crumb, Warning: nervous, one chip left'],
    ['exceeded', 'Crumb, Exceeded: bitten, no chips left'],
    ['resting', 'Crumb, Exceeded: resting while his bite grows back'],
    ['unsure', 'Crumb, limit unavailable'],
  ])('renders the %s mood', (mood, name) => {
    render(<Crumb mood={mood} size={sizes.crumbClicker} />);

    expect(screen.getByRole('img', { name })).toBeTruthy();
  });

  it('hides the brand mark from assistive technology', () => {
    render(<Crumb mood="mark" size={sizes.crumbMark} />);

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('is a button named by his mood when clickable', () => {
    const onClick = vi.fn();
    render(
      <Crumb mood="warning" size={sizes.crumbClicker} onClick={onClick} />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Crumb, Warning: nervous, one chip left',
      }),
    );

    expect(onClick).toHaveBeenCalledOnce();
  });
});
