import { renderApp } from '@/libs/test-utils/render-app';
import { server } from '@/mocks/node';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

const appBar = () => within(screen.getByRole('banner'));
const signInAs = async (name: 'Sign in as User' | 'Sign in as Admin') =>
  fireEvent.click(await screen.findByRole('button', { name }));

describe('Sign-in', () => {
  it('sends a signed-out visitor to the sign-in page', async () => {
    await renderApp('/play', { signedInAs: null });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('img', { name: 'Crumb waving hello' }),
    ).toBeTruthy();
    expect(screen.queryByRole('banner')).toBeNull();
  });

  it('returns a signed-out visitor to the page they opened once they sign in', async () => {
    await renderApp('/play', { signedInAs: null });

    // An Admin would otherwise land on the dashboard.
    await signInAs('Sign in as Admin');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cookie Clicker' }),
    ).toBeTruthy();
  });

  it.each([
    ['Sign in as User', 'Cookie Clicker'],
    ['Sign in as Admin', 'Dashboard'],
  ] as const)('%s lands on the %s', async (button, title) => {
    await renderApp('/sign-in', { signedInAs: null });

    await signInAs(button);

    expect(
      await screen.findByRole('heading', { level: 1, name: title }),
    ).toBeTruthy();
  });

  it('signs in as a User and shows the user ID in the app bar', async () => {
    await renderApp('/', { signedInAs: null });

    await signInAs('Sign in as User');

    expect(
      await within(await screen.findByRole('banner')).findByText(
        'user-7f3a9c2e',
      ),
    ).toBeTruthy();
    expect(appBar().getByRole('button', { name: 'Sign out' })).toBeTruthy();
  });

  it('signs in as the Admin', async () => {
    await renderApp('/', { signedInAs: null });

    await signInAs('Sign in as Admin');

    expect(
      await within(await screen.findByRole('banner')).findByText('Admin'),
    ).toBeTruthy();
  });

  it('restores the session on load', async () => {
    await renderApp('/play');

    expect(await appBar().findByText('user-7f3a9c2e')).toBeTruthy();
  });

  it('signs out back to the sign-in page', async () => {
    await renderApp('/play');

    fireEvent.click(await appBar().findByRole('button', { name: 'Sign out' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in' }),
    ).toBeTruthy();
  });

  it("doesn't send the next person to the page the last one signed out from", async () => {
    await renderApp('/play');

    fireEvent.click(await appBar().findByRole('button', { name: 'Sign out' }));
    await signInAs('Sign in as Admin');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeTruthy();
  });

  it("doesn't carry the last person's limit over to the next sign-in", async () => {
    server.use(
      http.post('/api/clicks', () =>
        HttpResponse.json(
          {
            message: 'Too many requests.',
            retryAt: new Date(Date.now() + 60_000).toISOString(),
            reason: 'hourly',
          },
          { status: 429 },
        ),
      ),
    );
    await renderApp('/play');
    fireEvent.click(await screen.findByRole('button', { name: /^Crumb/ }));
    expect(await screen.findByRole('timer')).toBeTruthy();

    fireEvent.click(appBar().getByRole('button', { name: 'Sign out' }));
    await signInAs('Sign in as User');

    expect(
      await screen.findByText('Click Crumb to see your requests left.'),
    ).toBeTruthy();
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('sends someone whose session ends mid-use to sign-in, then back', async () => {
    server.use(
      http.post('/api/clicks', () =>
        HttpResponse.json(
          { statusCode: 401, message: 'Unauthorized' },
          { status: 401 },
        ),
      ),
    );
    await renderApp('/play');

    fireEvent.click(await screen.findByRole('button', { name: /^Crumb/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in' }),
    ).toBeTruthy();

    server.resetHandlers();
    await signInAs('Sign in as User');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cookie Clicker' }),
    ).toBeTruthy();
  });

  it('says so when signing in fails', async () => {
    server.use(
      http.post(
        '/api/auth/sign-in',
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await renderApp('/', { signedInAs: null });

    await signInAs('Sign in as User');

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      "Couldn't sign in. Try again.",
    );
  });
});
