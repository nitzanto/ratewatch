import type { Locator, Page } from '@playwright/test';

export class PlayPage {
  readonly heading: Locator;
  readonly crumb: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', {
      level: 1,
      name: 'Cookie Clicker',
    });
    this.crumb = page.getByRole('main').getByRole('img', { name: /^Crumb/ });
  }

  async goto() {
    await this.page.goto('/play');
  }

  /** How many CSS animations are running on Crumb. */
  crumbAnimations() {
    return this.crumb.evaluate((el) => el.getAnimations().length);
  }
}
