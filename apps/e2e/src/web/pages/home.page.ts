import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly apiStatus: Locator;
  readonly appBarStatus: Locator;

  constructor(private readonly page: Page) {
    this.apiStatus = page.getByRole('main').getByRole('status');
    this.appBarStatus = page.getByRole('banner').getByRole('status');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  tab(name: 'Dashboard' | 'Cookie Clicker') {
    return this.page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name });
  }
}
