import { expect, test, type Page } from '@playwright/test';

async function mockAccountApi(page: Page, initialName = 'FlyScanner Tester', email = 'tester@flyscanner.test'): Promise<string[]> {
  const capturedRequestUrls: string[] = [];
  let savedFlights: Array<Record<string, unknown>> = [];
  let priceAlerts: Array<Record<string, unknown>> = [];

  await page.route('**/api/v1/saved-flights**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (url.pathname.endsWith('/saved-flights') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(savedFlights) });
      return;
    }
    if (url.pathname.endsWith('/saved-flights') && method === 'POST') {
      const body = request.postDataJSON() as { offerToken: string };
      const existing = savedFlights.find((item) => item.offerToken === body.offerToken);
      const item = existing ?? {
        id: 'saved-flight-' + body.offerToken,
        offerToken: body.offerToken,
        airline: 'Carrier FS',
        airlineCode: 'FS',
        code: 'FS100',
        from: 'BLR',
        to: 'DXB',
        depart: '07:00',
        arrive: '11:20',
        duration: '4h 20m',
        durationMinutes: 260,
        stops: 0,
        price: 12650,
        currency: 'INR',
        fareType: 'ONE_WAY',
        savedAt: new Date().toISOString(),
        checkedAt: new Date().toISOString(),
        offerExpiresAt: '2026-12-12T07:10:00Z',
      };
      if (!existing) savedFlights = [item, ...savedFlights];
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(item) });
      return;
    }
    if (method === 'DELETE') {
      const id = decodeURIComponent(url.pathname.split('/').pop() ?? '');
      savedFlights = savedFlights.filter((item) => item.id !== id);
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) });
  });

  await page.route('**/api/v1/alerts**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (url.pathname.endsWith('/alerts') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(priceAlerts) });
      return;
    }
    if (url.pathname.endsWith('/alerts') && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const item = {
        id: 'test-alert-' + String(priceAlerts.length + 1),
        ...body,
        active: true,
        createdAt: new Date().toISOString(),
        expiresAt: null,
      };
      priceAlerts = [item, ...priceAlerts];
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(item) });
      return;
    }
    if (url.pathname.endsWith('/deactivate') && method === 'PATCH') {
      const id = decodeURIComponent(url.pathname.split('/').slice(-2, -1)[0] ?? '');
      priceAlerts = priceAlerts.map((item) => item.id === id ? { ...item, active: false } : item);
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) });
  });

  let profile: {
    userId: string;
    email: string;
    fullName: string;
    role: 'USER';
    createdAt: string;
    phoneNumber: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    homeAirport: string | null;
    preferredCurrency: string | null;
  } = {
    userId: 'test-user-1',
    email,
    fullName: initialName,
    role: 'USER',
    createdAt: '2026-11-14T10:00:00Z',
    phoneNumber: null,
    dateOfBirth: null,
    nationality: null,
    homeAirport: null,
    preferredCurrency: 'INR',
  };

  await page.route('**/api/v1/auth/**', async (route) => {
    const request = route.request();
    capturedRequestUrls.push(request.url());
    const method = request.method();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/me') && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profile) });
      return;
    }
    if (url.pathname.endsWith('/me') && method === 'PATCH') {
      const body = request.postDataJSON() as {
        fullName: string;
        phoneNumber: string | null;
        dateOfBirth: string | null;
        nationality: string | null;
        homeAirport: string | null;
        preferredCurrency: string | null;
      };
      profile = { ...profile, ...body };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profile) });
      return;
    }
    if ((url.pathname.endsWith('/register') || url.pathname.endsWith('/login')) && method === 'POST') {
      const body = request.postDataJSON() as { fullName?: string; email?: string };
      profile = { ...profile, email: body.email ?? profile.email, fullName: body.fullName ?? profile.fullName };
      await route.fulfill({
        status: url.pathname.endsWith('/register') ? 201 : 200,
        contentType: 'application/json',
        body: JSON.stringify({ userId: profile.userId, email: profile.email, fullName: profile.fullName, accessToken: 'mock-test-access-token', expiresAt: '2026-11-15T10:00:00Z' }),
      });
      return;
    }
    if (url.pathname.endsWith('/otp/request') && method === 'POST') {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'If an account exists for this email, a sign-in code has been sent.',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 180000).toISOString(),
        }),
      });
      return;
    }
    if (url.pathname.endsWith('/otp/resend') && method === 'POST') {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'If an account exists for this email, a sign-in code has been sent.',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 180000).toISOString(),
        }),
      });
      return;
    }
    if (url.pathname.endsWith('/otp/verify') && method === 'POST') {
      const body = request.postDataJSON() as { email: string; code: string };
      if (body.code !== '123456') {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'The sign-in code is invalid or expired.' }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ userId: profile.userId, email: profile.email, fullName: profile.fullName, accessToken: 'mock-test-otp-access-token', expiresAt: '2026-11-16T10:00:00Z' }),
      });
      return;
    }
    if (url.pathname.endsWith('/logout') && method === 'POST') {
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) });
  });
  return capturedRequestUrls;
}
test('homepage opens with a prominent search action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Go further/i })).toBeVisible();
  const searchButton = page.getByRole('button', { name: /Search flights/i });
  await expect(searchButton).toBeVisible();
  await expect(searchButton).toBeEnabled();
});

test('airport suggestions support a complete route search and detail navigation', async ({ page }) => {
  await page.goto('/');

  const from = page.getByRole('combobox', { name: 'FROM' });
  const to = page.getByRole('combobox', { name: 'TO' });

  await from.fill('Beng');
  await page.getByRole('option', { name: /Bengaluru, India/i }).click();
  await to.fill('Dub');
  await page.getByRole('option', { name: /Dubai, United Arab Emirates/i }).click();

  await page.getByRole('button', { name: /Search flights/i }).click();
  await expect(page).toHaveURL(/\/flights\/search\?/);
  await expect(page.getByRole('heading', { name: 'Flight results' })).toBeVisible();
  await expect(page.getByTestId('flight-result-card').first()).toBeVisible();

  await page.getByRole('link', { name: /View flight details/i }).first().click();
  await expect(page).toHaveURL(/\/flights\/\d+\?/);
  await expect(page.getByRole('heading', { name: /Flight itinerary/i })).toBeVisible();
  await expect(page.getByText('PRICE SUMMARY')).toBeVisible();
});

test('mobile layout does not create horizontal page overflow', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await expect(page.getByRole('button', { name: /Search flights/i })).toBeVisible();
});

test('results filters can be opened on touch layouts', async ({ page }) => {
  await page.goto('/flights/search?from=BLR&to=DXB&departure=2026-12-12&returnDate=2026-12-18&adults=1&cabin=ECONOMY&trip=ROUND_TRIP');
  await expect(page.getByRole('heading', { name: 'Flight results' })).toBeVisible();
  const filterButton = page.getByRole('button', { name: /Filters/ });
  if (await filterButton.isVisible()) {
    await filterButton.click();
    await expect(page.getByRole('complementary', { name: 'Flight filters' })).toBeVisible();
  }
});

test('flight details expose a sticky provider action on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flights/1001?from=BLR&to=DXB&departure=2026-12-12&returnDate=2026-12-18&adults=1&cabin=ECONOMY&trip=ROUND_TRIP');
  await expect(page.getByRole('heading', { name: 'Flight itinerary' })).toBeVisible();
  await expect(page.locator('.mobile-provider-bar')).toBeVisible();
});


test('Explore page loads destinations, popular routes and the sample fare calendar', async ({ page }) => {
  await page.goto('/explore');
  await expect(page.getByRole('heading', { name: 'Places to take you places.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Explore Dubai/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Explore Singapore/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Bengaluru to Goa/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Price calendar.' })).toBeVisible();
  await expect(page.getByTestId('calendar-day')).toHaveCount(31);
});

test('popular route opens flight results for the selected route', async ({ page }) => {
  await page.goto('/explore');
  await page.getByRole('link', { name: /Bengaluru to Goa/i }).click();
  await expect(page).toHaveURL(new RegExp('flights/search.*from=BLR.*to=GOI'));
  await expect(page.getByRole('heading', { name: 'Flight results' })).toBeVisible();
  await expect(page.getByTestId('flight-result-card').first()).toBeVisible();
});

test('price calendar passes the selected day into flight search', async ({ page }) => {
  await page.goto('/explore');
  await page.getByRole('button', { name: /January 2027 15, sample fare/i }).click();
  await expect(page.getByText('15 January 2027')).toBeVisible();
  await page.getByRole('link', { name: /Search this date/i }).click();
  await expect(page).toHaveURL(new RegExp('flights/search.*from=BLR.*to=DXB.*departure=2027-01-15'));
  await expect(page.getByRole('heading', { name: 'Flight results' })).toBeVisible();
});

test('Explore layout does not create horizontal overflow on mobile', async ({ page }) => {
  await page.goto('/explore');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await expect(page.getByRole('heading', { name: 'Places to take you places.' })).toBeVisible();
});


test('price calendar changes month and renders the correct day count', async ({ page }) => {
  await page.goto('/explore');
  await page.getByRole('combobox', { name: 'Month' }).selectOption('2027-02');
  await expect(page.getByTestId('calendar-day')).toHaveCount(28);
  await expect(page.getByRole('button', { name: /February 2027 14, sample fare/i })).toBeVisible();
});


test('Explore tab opens the dedicated page from the homepage without a prior search', async ({ page }) => {
  await page.goto('/');
  const exploreLink = page.getByRole('link', { name: 'Explore', exact: true });
  if (!(await exploreLink.isVisible())) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
  }
  await exploreLink.click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole('heading', { name: 'Places to take you places.' })).toBeVisible();
  await expect(page.locator('.destination-card')).toHaveCount(6);
  await expect(page.locator('.popular-route-card')).toHaveCount(5);
  await expect(page.getByTestId('calendar-day')).toHaveCount(31);
});

test('Explore direct entry and refresh load all sections without flight search state', async ({ page }) => {
  await page.goto('/explore');
  await expect(page.locator('.destination-card')).toHaveCount(6);
  await page.reload();
  await expect(page.locator('.destination-card')).toHaveCount(6);
  await expect(page.locator('.popular-route-card')).toHaveCount(5);
  await expect(page.getByRole('heading', { name: 'Price calendar.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Retry loading Explore/i })).toHaveCount(0);
});

test('registration creates a backend account and opens the dashboard', async ({ page }) => {
  await mockAccountApi(page);
  await page.goto('/register');
  await page.getByLabel('Full name').fill('FlyScanner Tester');
  await page.getByLabel('Email address').fill('tester@flyscanner.test');
  await page.getByLabel('Password', { exact: true }).fill('TestPass123!');
  await page.getByLabel('Confirm password').fill('TestPass123!');
  await page.getByRole('button', { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { name: 'Hello, FlyScanner.' })).toBeVisible();
  await expect(page.getByText('USER account')).toBeVisible();
});

test('email OTP login verifies a six-digit code and establishes an account session', async ({ page }) => {
  const requestUrls = await mockAccountApi(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Email OTP', exact: true }).click();
  await page.getByLabel('Email address').fill('tester@flyscanner.test');
  await page.getByRole('button', { name: /Send sign-in code/i }).click();

  await expect(page.getByLabel('Six-digit email code')).toBeVisible();
  await expect(page.getByText(/Code expires in/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend code in/ })).toBeDisabled();
  await page.getByLabel('Six-digit email code').fill('123456');
  await page.getByRole('button', { name: /Verify code & sign in/i }).click();

  await expect(page).toHaveURL(/\\/account$/);
  await expect(page.getByRole('heading', { name: 'Hello, FlyScanner.' })).toBeVisible();
  expect(requestUrls.some((url) => url.endsWith('/api/v1/auth/otp/request'))).toBe(true);
  expect(requestUrls.some((url) => url.endsWith('/api/v1/auth/otp/verify'))).toBe(true);
});

test('sign-in and account price alerts can be created and removed', async ({ page }) => {
  await mockAccountApi(page);
  await page.goto('/login');
  await page.getByLabel('Email address').fill('tester@flyscanner.test');
  await page.locator('input[autocomplete="current-password"]').fill('TestPass123!');
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole('button', { name: 'Price alerts', exact: true }).click();
  await page.getByLabel('Target fare (INR)').fill('11500');
  await page.getByRole('button', { name: /Create alert/i }).click();
  await expect(page.getByText('₹11,500')).toBeVisible();
  await page.getByRole('button', { name: 'Deactivate price alert' }).click();
  await expect(page.getByText('No active alerts')).toBeVisible();
});

test('saved flight persists from results page into the account dashboard', async ({ page }) => {
  await mockAccountApi(page, 'Saved Flight Tester', 'saved@flyscanner.test');
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Saved Flight Tester');
  await page.getByLabel('Email address').fill('saved@flyscanner.test');
  await page.getByLabel('Password', { exact: true }).fill('TestPass123!');
  await page.getByLabel('Confirm password').fill('TestPass123!');
  await page.getByRole('button', { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.route('**/api/v1/searches', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        searchId: 'search-test-1',
        generatedAt: '2026-11-15T10:00:00Z',
        status: 'SUCCESS',
        providerStatuses: [{ providerCode: 'MOCK', status: 'SUCCESS', latencyMs: 10, message: 'Offers returned.' }],
        offers: [{
          offerToken: 'saved-offer-token-1',
          providerCode: 'MOCK',
          price: { amount: '12650.00', currency: 'INR' },
          itinerary: [{
            legNumber: 1,
            origin: 'BLR',
            destination: 'DXB',
            departureDate: '2026-12-12',
            segments: [{
              origin: 'BLR',
              destination: 'DXB',
              carrierCode: 'FS',
              flightNumber: 'FS100',
              departureAt: '2026-12-12T07:00:00Z',
              arrivalAt: '2026-12-12T11:20:00Z',
              durationMinutes: 260,
            }],
            durationMinutes: 260,
            stopCount: 0,
          }],
          stops: 0,
          totalDurationMinutes: 260,
          checkedAt: '2026-11-15T10:00:00Z',
          expiresAt: '2026-11-15T10:10:00Z',
          affiliateRedirectAvailable: false,
        }],
        disclaimer: 'Synthetic test offer.',
      }),
    });
  });
  await page.goto('/flights/search?from=BLR&to=DXB&departure=2026-12-12&adults=1&cabin=ECONOMY&trip=ONE_WAY&source=backend');
  await expect(page.getByTestId('flight-result-card').first()).toBeVisible();
  await page.getByRole('button', { name: 'Save flight' }).first().click();
  await page.getByRole('link', { name: 'My account' }).click();
  await page.getByRole('button', { name: 'Saved flights', exact: true }).click();
  await expect(page.getByText('FS100')).toBeVisible();
});

test('traveler profile details are saved through the authenticated backend API', async ({ page }) => {
  await mockAccountApi(page);
  await page.goto('/login');
  await page.getByLabel('Email address').fill('tester@flyscanner.test');
  await page.locator('input[autocomplete="current-password"]').fill('TestPass123!');
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole('button', { name: 'Profile' }).click();

  await page.getByLabel('Full name').fill('FlyScanner Profile QA');
  await page.getByLabel('Mobile number').fill('+91 98765 43210');
  await page.getByLabel('Date of birth').fill('1990-06-15');
  await page.getByLabel('Nationality (2-letter country code)').fill('IN');
  await page.getByLabel('Home airport (IATA code)').fill('BLR');
  await page.getByLabel('Preferred currency').fill('INR');

  await page.getByRole('button', { name: /Save changes/i }).click();
  await expect(page.locator('.account-user-summary strong')).toHaveText('FlyScanner Profile QA');
  await expect(page.getByLabel('Mobile number')).toHaveValue('+91 98765 43210');
  await expect(page.getByLabel('Date of birth')).toHaveValue('1990-06-15');
  await expect(page.getByLabel('Nationality (2-letter country code)')).toHaveValue('IN');
  await expect(page.getByLabel('Home airport (IATA code)')).toHaveValue('BLR');
  await expect(page.getByLabel('Preferred currency')).toHaveValue('INR');

  await page.reload();
  await page.getByRole('button', { name: 'Profile' }).click();
  await expect(page.getByLabel('Full name')).toHaveValue('FlyScanner Profile QA');
  await expect(page.getByLabel('Mobile number')).toHaveValue('+91 98765 43210');
  await expect(page.getByLabel('Date of birth')).toHaveValue('1990-06-15');
  await expect(page.getByLabel('Nationality (2-letter country code)')).toHaveValue('IN');
  await expect(page.getByLabel('Home airport (IATA code)')).toHaveValue('BLR');
  await expect(page.getByLabel('Preferred currency')).toHaveValue('INR');
});


test('backend flight search renders API offers, partial provider status and details', async ({ page }) => {
  const capturedRequests: Array<Record<string, unknown>> = [];
  const backendResponse = {
    searchId: 'f1d6acb5-4244-4fa8-9b13-1b44f7d56789',
    generatedAt: '2026-11-14T07:00:00Z',
    status: 'PARTIAL_SUCCESS',
    providerStatuses: [
      { providerCode: 'MOCK', status: 'SUCCESS', latencyMs: 12, message: 'Offers returned.' },
      { providerCode: 'SECONDARY', status: 'TIMEOUT', latencyMs: 3000, message: 'Provider response timed out.' },
    ],
    offers: [
      {
        offerToken: 'opaque-test-offer-token',
        providerCode: 'MOCK',
        price: { amount: '12650.00', currency: 'INR' },
        itinerary: [
          {
            legNumber: 1,
            origin: 'BLR',
            destination: 'DXB',
            departureDate: '2027-01-15',
            segments: [
              {
                origin: 'BLR',
                destination: 'DXB',
                carrierCode: 'FS',
                flightNumber: 'FS100',
                departureAt: '2027-01-15T07:00:00Z',
                arrivalAt: '2027-01-15T11:20:00Z',
                durationMinutes: 260,
              },
            ],
            durationMinutes: 260,
            stopCount: 0,
          },
        ],
        stops: 0,
        totalDurationMinutes: 260,
        checkedAt: '2026-11-14T07:00:00Z',
        expiresAt: '2026-11-14T07:10:00Z',
        affiliateRedirectAvailable: false,
      },
    ],
    disclaimer: 'Synthetic backend fixture used for an integration test.',
  };

  await page.route('**/api/v1/searches', async (route) => {
    capturedRequests.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(backendResponse),
    });
  });

  await page.goto('/flights/search?from=BLR&to=DXB&departure=2027-01-15&adults=2&cabin=ECONOMY&trip=ONE_WAY&source=backend');
  await expect(page.getByTestId('flight-result-card')).toHaveCount(1);
  await expect(page.getByTestId('provider-search-notice')).toContainText('Some flight sources did not respond');
  await expect(page.getByText('₹12,650')).toBeVisible();
  await expect(page.locator('.results-trust')).toContainText('Backend search');

  expect(capturedRequests[0]).toMatchObject({
    tripType: 'ONE_WAY',
    legs: [{ origin: 'BLR', destination: 'DXB', departureDate: '2027-01-15' }],
    passengers: { adults: 2, childrenAges: [], infants: 0 },
    cabinClass: 'ECONOMY',
    currency: 'INR',
    market: 'IN',
    locale: 'en-IN',
  });

  await page.getByRole('link', { name: /View flight details/i }).click();
  await expect(page.getByRole('heading', { name: 'Flight itinerary' })).toBeVisible();
  await expect(page.getByText('FS100')).toBeVisible();
  await expect(page.getByText('No booking is made in this demo.')).toBeVisible();
  await expect(page.getByText('Not supplied by search response')).toBeVisible();
  // React.StrictMode deliberately replays effects in the Vite development server.
  // The results and details routes each issue a search; allow the development replay.
  expect(capturedRequests.length).toBeGreaterThanOrEqual(2);
  expect(capturedRequests.every((request) => request.tripType === 'ONE_WAY')).toBe(true);
});



test('login, profile and logout requests use the configured Codespaces backend URL', async ({ page }) => {
  const requestUrls = await mockAccountApi(page);
  const backendOrigin = 'https://probable-couscous-q4vv44qgjw424pqw-8080.app.github.dev';

  await page.goto('/login');
  await page.getByLabel('Email address').fill('tester@flyscanner.test');
  await page.locator('input[autocomplete="current-password"]').fill('TestPass123!');
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('button', { name: /Sign out/i })).toBeVisible();

  await page.getByRole('button', { name: /Sign out/i }).click();
  await expect(page).toHaveURL('/');

  const requestedUrls = requestUrls.map((url) => new URL(url));
  expect(requestedUrls.length).toBeGreaterThanOrEqual(3);
  expect(requestedUrls.every((url) => url.origin === backendOrigin)).toBe(true);
  expect(requestedUrls.some((url) => url.pathname === '/api/v1/auth/login')).toBe(true);
  expect(requestedUrls.some((url) => url.pathname === '/api/v1/auth/me')).toBe(true);
  expect(requestedUrls.some((url) => url.pathname === '/api/v1/auth/logout')).toBe(true);
});

test('logout revokes the bearer session and clears the browser session on every device profile', async ({ page }) => {
  await mockAccountApi(page);
  let logoutAuthorization = '';

  page.on('request', (request) => {
    if (request.url().includes('/api/v1/auth/logout')) {
      logoutAuthorization = request.headers()['authorization'] ?? '';
    }
  });

  await page.goto('/login');
  await page.getByLabel('Email address').fill('tester@flyscanner.test');
  await page.locator('input[autocomplete="current-password"]').fill('TestPass123!');
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('button', { name: /Sign out/i })).toBeVisible();

  await page.getByRole('button', { name: /Sign out/i }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await expect.poll(() => logoutAuthorization).toBe('Bearer mock-test-access-token');
  const sessionToken = await page.evaluate(() => sessionStorage.getItem('flyscanner.auth.access-token'));
  expect(sessionToken).toBeNull();
});
