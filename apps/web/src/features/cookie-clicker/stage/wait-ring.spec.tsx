import { renderWithProviders } from '@/test/render-app';
import { screen } from '@testing-library/react';
import { WaitRing } from './wait-ring';

// The ring is an aria-hidden drawing with no role, so it's read through a wrapper's markup.
const renderRing = (filled: number) =>
  renderWithProviders(
    <span data-testid="ring">
      <WaitRing filled={filled} />
    </span>,
  );

const expectRingMarkup = (text: string) =>
  expect(screen.getByTestId('ring')).toHaveProperty(
    'innerHTML',
    expect.stringContaining(text),
  );

describe('WaitRing', () => {
  it.each([
    [0, '1'],
    [0.25, '0.75'],
    [1, '0'],
  ])(
    'with %s of the wait passed, leaves %s of the ring empty',
    async (filled, offset) => {
      await renderRing(filled);

      expectRingMarkup(`stroke-dashoffset="${offset}"`);
    },
  );

  it('is hidden from assistive technology', async () => {
    await renderRing(0.5);

    expectRingMarkup('aria-hidden="true"');
  });
});
