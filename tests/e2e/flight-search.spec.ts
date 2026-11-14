import { expect, test } from '@playwright/test';

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

test('demo registration opens the account dashboard', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Full name').fill('FlyScanner Tester');
  await page.getByLabel('Email address').fill('tester@flyscanner.test');
  await page.getByLabel('Password', { exact: true }).fill('TestPass123!');
  await page.getByLabel('Confirm password').fill('TestPass123!');
  await page.getByRole('button', { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { name: 'Hello, FlyScanner.' })).toBeVisible();
  await expect(page.getByText('Demo account')).toBeVisible();
});

test('demo sign-in and account price alerts can be created and removed', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole('button', { name: 'Price alerts', exact: true }).click();
  await page.getByLabel('Target fare (INR)').fill('11500');
  await page.getByRole('button', { name: /Create alert/i }).click();
  await expect(page.getByText('₹11,500')).toBeVisible();
  await page.getByRole('button', { name: 'Delete price alert' }).click();
  await expect(page.getByText('No alerts created')).toBeVisible();
});

test('saved flight persists from results page into the account dashboard', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Saved Flight Tester');
  await page.getByLabel('Email address').fill('saved@flyscanner.test');
  await page.getByLabel('Password', { exact: true }).fill('TestPass123!');
  await page.getByLabel('Confirm password').fill('TestPass123!');
  await page.getByRole('button', { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto('/flights/search?from=BLR&to=DXB&departure=2026-12-12&adults=1&cabin=ECONOMY&trip=ONE_WAY');
  await expect(page.getByTestId('flight-result-card').first()).toBeVisible();
  await page.getByRole('button', { name: 'Save flight' }).first().click();
  await page.getByRole('link', { name: 'My account' }).click();
  await page.getByRole('button', { name: 'Saved flights', exact: true }).click();
  await expect(page.getByText('6E 1421')).toBeVisible();
});

test('profile name can be updated in the local demo account', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByLabel('Full name').fill('FlyScanner Profile QA');
  await page.getByRole('button', { name: /Save changes/i }).click();
  await expect(page.locator('.account-user-summary strong')).toHaveText('FlyScanner Profile QA');
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
  expect(capturedRequests.length).toBe(2);
});
