import { expect, test } from './fixtures';

test.beforeEach(({ signInPage }) => signInPage.signIn('Admin'));

test('home shows the API health status', async ({ homePage }) => {
  await homePage.goto();

  await expect(homePage.apiStatus).toHaveText('OK');
  // The dashboard holds the live connection, so the pill reports it too.
  await expect(homePage.appBarStatus).toHaveText('Live · API OK');
});

test('the Admin has no cookie clicker: no tab, and its URL is not found', async ({
  page,
  homePage,
  playPage,
}) => {
  await homePage.goto();

  await expect(homePage.tab('Dashboard')).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(homePage.tab('Cookie Clicker')).toHaveCount(0);

  await page.goto('/play');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Page not found' }),
  ).toBeVisible();
  await expect(playPage.heading).toHaveCount(0);
});
