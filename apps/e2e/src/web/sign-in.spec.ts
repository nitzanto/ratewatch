import { expect, test } from './fixtures';

test('a signed-out visitor signs in as a User, sees their user ID, and signs out', async ({
  page,
  signInPage,
  playPage,
}) => {
  await playPage.goto();
  await expect(signInPage.heading).toBeVisible();

  await signInPage.signInAs('User');

  await expect(playPage.heading).toBeVisible();
  const appBar = page.getByRole('banner');
  await expect(appBar.getByText(/^user-[0-9a-f]{8}$/)).toBeVisible();

  // The session survives a reload: it's in the cookie, not the page.
  await page.reload();
  await expect(appBar.getByText(/^user-[0-9a-f]{8}$/)).toBeVisible();

  await appBar.getByRole('button', { name: 'Sign out' }).click();
  await expect(signInPage.heading).toBeVisible();
  await page.reload();
  await expect(signInPage.heading).toBeVisible();
});

test('signs in as the Admin', async ({ page, signInPage }) => {
  await signInPage.goto();

  await signInPage.signInAs('Admin');

  await expect(page.getByRole('banner').getByText('Admin')).toBeVisible();
});
