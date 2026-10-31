import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly apiStatus: Locator;
  readonly appBarStatus: Locator;
  readonly usersTable: Locator;

  constructor(private readonly page: Page) {
    this.apiStatus = page.getByRole('main').getByRole('status');
    this.appBarStatus = page.getByRole('banner').getByRole('status');
    this.usersTable = page
      .getByRole('main')
      .getByRole('table', { name: 'Users' });
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  userRow(userId: string) {
    return this.usersTable.getByRole('row', { name: new RegExp(userId) });
  }

  tab(name: 'Dashboard' | 'Cookie Clicker') {
    return this.page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name });
  }
}
