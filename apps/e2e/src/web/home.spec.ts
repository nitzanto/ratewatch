import { expect, test } from './fixtures';

test('home shows the API health status', async ({ homePage }) => {
  await homePage.goto();

  await expect(homePage.apiStatus).toHaveText('API status: ok');
});
