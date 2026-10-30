import { expect, test } from './fixtures';

test('home shows the API health status', async ({ homePage }) => {
  await homePage.goto();

  await expect(homePage.apiStatus).toHaveText('API status: ok');
  await expect(homePage.appBarStatus).toHaveText('API OK');
});

test('the tabs move between the dashboard and the cookie clicker', async ({
  page,
  homePage,
  playPage,
}) => {
  await homePage.goto();

  await homePage.tab('Cookie clicker').click();
  await expect(page).toHaveURL('/play');
  await expect(playPage.heading).toBeVisible();
  await expect(homePage.tab('Cookie clicker')).toHaveAttribute(
    'aria-current',
    'page',
  );

  await homePage.tab('Dashboard').click();
  await expect(page).toHaveURL('/');
  await expect(homePage.apiStatus).toHaveText('API status: ok');
});
