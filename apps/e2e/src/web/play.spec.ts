import { expect, test } from './fixtures';

test('a deep link opens the cookie clicker, with Crumb bobbing', async ({
  playPage,
}) => {
  await playPage.goto();

  await expect(playPage.heading).toBeVisible();
  expect(await playPage.crumbAnimations()).toBeGreaterThan(0);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('Crumb stays still', async ({ playPage }) => {
    await playPage.goto();

    await expect(playPage.crumb).toBeVisible();
    expect(await playPage.crumbAnimations()).toBe(0);
  });
});
