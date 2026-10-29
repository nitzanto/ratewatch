import { test as base } from '@playwright/test';
import { HomePage } from './pages/home.page';

/** Web tests import `test` from here to get page objects as fixtures. */
export const test = base.extend<{ homePage: HomePage }>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
});
export { expect } from '@playwright/test';
