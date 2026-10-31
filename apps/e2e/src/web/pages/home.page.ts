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

  /** Opens the user's drawer from their ID in the table. */
  async openUser(userId: string) {
    await this.usersTable.getByRole('button', { name: userId }).click();
    return this.userDrawer(userId);
  }

  userDrawer(userId: string) {
    return this.page.getByRole('dialog', { name: userId });
  }

  /** The open drawer's recent requests, newest first. */
  recentRequests(userId: string) {
    return this.userDrawer(userId)
      .getByRole('list', { name: 'Recent requests' })
      .getByRole('listitem');
  }

  tab(name: 'Dashboard' | 'Cookie Clicker') {
    return this.page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name });
  }
}
