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
