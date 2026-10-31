import type { Locator, Page } from '@playwright/test';

export class PlayPage {
  readonly heading: Locator;
  readonly crumb: Locator;
  readonly crumbButton: Locator;
  readonly requestsLeft: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', {
      level: 1,
      name: 'Cookie Clicker',
    });
    this.crumb = page.getByRole('main').getByRole('img', { name: /^Crumb/ });
    this.crumbButton = page
      .getByRole('main')
      .getByRole('button', { name: /^Crumb/ });
    this.requestsLeft = page
      .getByRole('main')
      .getByRole('status')
      .filter({ hasText: /left this hour/ });
  }

  async goto() {
    await this.page.goto('/play');
  }

  /** The requests left the last click reported. */
  async requestsLeftCount() {
    return Number((await this.requestsLeft.textContent())?.match(/^\d+/)?.[0]);
  }

  /** How many CSS animations are running on Crumb. */
  crumbAnimations() {
    return this.crumb.evaluate((el) => el.getAnimations().length);
  }
}
