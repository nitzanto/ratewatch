import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly apiStatus: Locator;

  constructor(private readonly page: Page) {
    this.apiStatus = page.getByRole('status');
  }

  async goto() {
    await this.page.goto('/');
  }
}
