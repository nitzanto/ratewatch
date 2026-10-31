import type { Locator, Page } from '@playwright/test';

export class SignInPage {
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Sign in' });
  }

  async goto() {
    await this.page.goto('/sign-in');
  }

  async signInAs(role: 'User' | 'Admin') {
    await this.page.getByRole('button', { name: `Sign in as ${role}` }).click();
  }

  /** Signs in as a new User from a fresh page, as a person would, for tests about signed-in pages. */
  async signInAsUser() {
    await this.goto();
    await this.signInAs('User');
    await this.page.waitForURL('/play');
  }
}
