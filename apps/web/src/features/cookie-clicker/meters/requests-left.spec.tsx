import { renderWithProviders } from '@/test/render-app';
import { screen } from '@testing-library/react';
import { RequestsLeft } from './requests-left';

describe('RequestsLeft', () => {
  it.each([
    [42, '42requests left this hour'],
    [1, '1request left this hour'],
  ])('shows %s left with the right word', async (left, text) => {
    await renderWithProviders(
      <RequestsLeft left={left} unavailable={false} reset={false} />,
    );

    expect(screen.getByRole('status')).toHaveProperty('textContent', text);
  });

  it.each([
    [false, false, 'Click Crumb to see your requests left.'],
    [true, false, 'Limit unavailable'],
    [false, true, 'Your limit has reset. Click to see your new count.'],
    [true, true, 'Your limit has reset. Click to see your new count.'],
  ])(
    'without a count (unavailable %s, reset %s), says: %s',
    async (unavailable, reset, text) => {
      await renderWithProviders(
        <RequestsLeft
          left={undefined}
          unavailable={unavailable}
          reset={reset}
        />,
      );

      expect(screen.getByText(text)).toBeTruthy();
    },
  );
});
