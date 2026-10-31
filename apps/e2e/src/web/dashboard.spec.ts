import { PlayPage } from './pages/play.page';
import { SignInPage } from './pages/sign-in.page';
import { expect, test } from './fixtures';

test("an admin sees a user's row change live while the user clicks", async ({
  browser,
  signInPage,
  homePage,
}) => {
  // The user plays in their own browser context, so the two sessions don't share a cookie.
  const userContext = await browser.newContext();
  try {
    const userPage = await userContext.newPage();
    await new SignInPage(userPage).signIn('User');
    const userId = await userPage
      .getByRole('banner')
      .getByText(/^user-/)
      .textContent();
    const playPage = new PlayPage(userPage);
    await playPage.crumbButton.click();
    await expect(playPage.requestsLeft).toBeVisible();

    await signInPage.signIn('Admin');
    const row = homePage.userRow(userId ?? '');
    // The user's record is written within a second of their click: reload until it's there.
    await expect(async () => {
      await homePage.goto();
      await expect(row).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10_000 });
    await expect(homePage.appBarStatus).toHaveText('Live · API OK');
    const before = await playPage.requestsLeftCount();
    await expect(row).toContainText(`${before} / 100`);

    await playPage.crumbButton.click();

    await expect(row).toContainText(`${before - 1} / 100`);
  } finally {
    await userContext.close();
  }
});

test('an admin opens a user and watches their requests arrive live', async ({
  browser,
  page,
  signInPage,
  homePage,
}) => {
  const userContext = await browser.newContext();
  try {
    const userPage = await userContext.newPage();
    await new SignInPage(userPage).signIn('User');
    const userId = String(
      await userPage
        .getByRole('banner')
        .getByText(/^user-/)
        .textContent(),
    );
    const playPage = new PlayPage(userPage);
    await playPage.crumbButton.click();
    await expect(playPage.requestsLeft).toBeVisible();

    await signInPage.signIn('Admin');
    // The user's record is written within a second of their click: reload until it's there.
    await expect(async () => {
      await homePage.goto();
      await expect(homePage.userRow(userId)).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10_000 });
    // Updates reach the admin only once the live connection is up.
    await expect(homePage.appBarStatus).toHaveText('Live · API OK');
    const drawer = await homePage.openUser(userId);
    await expect(
      drawer.getByRole('button', { name: 'Close user details' }),
    ).toBeFocused();
    await expect(homePage.recentRequests(userId)).toHaveCount(1);
    await expect(drawer).toContainText(
      '1 accepted and 0 refused in the past hour.',
    );

    await playPage.crumbButton.click();

    await expect(homePage.recentRequests(userId)).toHaveCount(2);
    await expect(drawer).toContainText('98 / 100');
    await expect(drawer).toContainText(
      '2 accepted and 0 refused in the past hour.',
    );

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  } finally {
    await userContext.close();
  }
});
