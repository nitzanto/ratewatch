import { expect, test } from './fixtures';

test.beforeEach(({ signInPage }) => signInPage.signIn('Admin'));

test('home shows the API health status', async ({ homePage }) => {
  await homePage.goto();

  await expect(homePage.apiStatus).toHaveText('OK');
  // The dashboard holds the live connection, so the pill reports it too.
  await expect(homePage.appBarStatus).toHaveText('Live · API OK');
});

test('the tabs move between the dashboard and the cookie clicker', async ({
  page,
  homePage,
  playPage,
}) => {
  await homePage.goto();

  await homePage.tab('Cookie Clicker').click();
  await expect(page).toHaveURL('/play');
  await expect(playPage.heading).toBeVisible();
  await expect(homePage.tab('Cookie Clicker')).toHaveAttribute(
    'aria-current',
    'page',
  );

  await homePage.tab('Dashboard').click();
  await expect(page).toHaveURL('/dashboard');
  await expect(homePage.apiStatus).toHaveText('OK');
});
