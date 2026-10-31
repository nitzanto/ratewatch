import { expect, test } from './fixtures';

test.beforeEach(({ signInPage }) => signInPage.signIn('User'));

test('a deep link opens the cookie clicker, with Crumb bobbing', async ({
  playPage,
}) => {
  await playPage.goto();

  await expect(playPage.heading).toBeVisible();
  expect(await playPage.crumbAnimations()).toBeGreaterThan(0);
});

test('each click on Crumb spends one request of the real limit', async ({
  playPage,
}) => {
  await playPage.goto();

  await playPage.crumbButton.click();
  await expect(playPage.requestsLeft).toBeVisible();
  const left = await playPage.requestsLeftCount();
  await playPage.crumbButton.click();

  // Loading the page spends requests too (restoring the session counts), so only the step is exact.
  expect(left).toBeLessThan(100);
  // The count and its label are separate elements, with no space between them in the text.
  await expect(playPage.requestsLeft).toHaveText(
    new RegExp(`^${left - 1}requests? left`),
  );
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('Crumb stays still', async ({ playPage }) => {
    await playPage.goto();

    await expect(playPage.crumb).toBeVisible();
    expect(await playPage.crumbAnimations()).toBe(0);
  });
});
