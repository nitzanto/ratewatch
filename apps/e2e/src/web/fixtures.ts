import { test as base } from '@playwright/test';
import { HomePage } from './pages/home.page';
import { PlayPage } from './pages/play.page';
import { SignInPage } from './pages/sign-in.page';

/** Web tests import `test` from here to get page objects as fixtures. */
export const test = base.extend<{
  homePage: HomePage;
  playPage: PlayPage;
  signInPage: SignInPage;
}>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  playPage: async ({ page }, use) => {
    await use(new PlayPage(page));
  },
  signInPage: async ({ page }, use) => {
    await use(new SignInPage(page));
  },
});
export { expect } from '@playwright/test';
