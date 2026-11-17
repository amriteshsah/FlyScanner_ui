import { expect, test, type Page } from '@playwright/test';

async function mockOtpBackend(page: Page, profileCompleted: boolean) {
  const calls: Array<{ path: string; method: string; body?: unknown }> = [];
  let profile = {
    userId: 'otp-test-user',
    email: 'traveler@example.test',
    fullName: 'Traveler',
    role: 'USER',
    createdAt: '2026-11-14T10:00:00Z',
    profileCompleted,
    phoneNumber: null,
    dateOfBirth: null,
    nationality: null,
    homeAirport: null,
    preferredCurrency: 'INR',
  };

  await page.route('**/api/v1/auth/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postDataJSON?.();
    calls.push({ path: url.pathname, method: request.method(), body });

    if (url.pathname.endsWith('/otp/request') && request.method() === 'POST') {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'If this email address is eligible, a sign-in code has been sent.',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 180000).toISOString(),
        }),
      });
      return;
    }
    if (url.pathname.endsWith('/otp/verify') && request.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: profile.userId,
          email: profile.email,
          fullName: profile.fullName,
          accessToken: 'otp-test-access-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          isNewUser: !profileCompleted,
          profileCompleted,
        }),
      });
      return;
    }
    if (url.pathname.endsWith('/me') && request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profile) });
      return;
    }
    if (url.pathname.endsWith('/me') && request.method() === 'PATCH') {
      profile = { ...profile, ...(body as object), profileCompleted: true };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profile) });
      return;
    }
    if (url.pathname.endsWith('/logout') && request.method() === 'POST') {
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) });
  });

  await page.route('**/api/v1/saved-flights**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.route('**/api/v1/alerts**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  return calls;
}

async function completeEmailOtpLogin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('traveler@example.test');
  await page.getByRole('button', { name: /Send sign-in code/i }).click();
  await expect(page.getByLabel('Six-digit email code')).toBeVisible();
  await page.getByLabel('Six-digit email code').fill('123456');
  await page.getByRole('button', { name: /Verify code/i }).click();
}

test('standard-user sign in offers email OTP only and has no signup or password-reset links', async ({ page }) => {
  await mockOtpBackend(page, true);
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Sign in to FlyScanner' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Send sign-in code/i })).toBeVisible();
  await expect(page.getByLabel('Password')).toHaveCount(0);
  await expect(page.getByText(/Email & password/i)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Create an account/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Forgot password/i })).toHaveCount(0);
});

test('first-time OTP user is sent to optional profile completion and can skip it', async ({ page }) => {
  const calls = await mockOtpBackend(page, false);
  await completeEmailOtpLogin(page);

  await expect(page).toHaveURL(/\/account(?:\?.*)?$/);
  await expect(page.getByRole('dialog', { name: /Complete your profile/i })).toBeVisible();
  await expect(page.getByText(/You can add or change these later/i)).toBeVisible();

  await page.getByRole('button', { name: /Skip for now/i }).click();
  await expect(page.getByRole('dialog', { name: /Complete your profile/i })).toHaveCount(0);
  expect(calls.some((call) => call.path.endsWith('/me') && call.method === 'PATCH' && JSON.stringify(call.body) === '{}')).toBe(true);
  await expect(page.getByRole('heading', { name: 'Hello, Traveler.' })).toBeVisible();
});

test('first-time OTP user can save optional profile fields and continue', async ({ page }) => {
  const calls = await mockOtpBackend(page, false);
  await completeEmailOtpLogin(page);

  await expect(page.getByRole('dialog', { name: /Complete your profile/i })).toBeVisible();
  await page.getByLabel('Full name').fill('Aarav Traveler');
  await page.getByLabel('Mobile number').fill('+919876543210');
  await page.getByRole('button', { name: /Save & Continue/i }).click();

  await expect(page.getByRole('dialog', { name: /Complete your profile/i })).toHaveCount(0);
  const profilePatch = calls.find((call) => call.path.endsWith('/me') && call.method === 'PATCH');
  expect(profilePatch?.body).toMatchObject({
    fullName: 'Aarav Traveler',
    phoneNumber: '+919876543210',
  });
});

test('returning OTP user signs in without showing first-time onboarding', async ({ page }) => {
  await mockOtpBackend(page, true);
  await completeEmailOtpLogin(page);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('dialog', { name: /Complete your profile/i })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Hello, Traveler.' })).toBeVisible();
});
