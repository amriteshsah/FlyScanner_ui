# FlyScanner UI

A responsive flight discovery and fare-comparison application built with React, TypeScript and Vite.

## Technology

- React + TypeScript + Vite
- Lucide React icons
- Lightweight custom CSS
- Feature-based frontend structure

## Run locally

Requirements: Node.js 20.19+ (Node.js 22 LTS recommended).

npm install
npm run dev

Open the Vite URL printed in the terminal (normally http://localhost:5173). Vite loads the checked-in `.env.development` automatically, which points browser API calls to the separate Spring Boot Codespace. Restart Vite after changing this file.

## Validate and build

npm run typecheck
npm run build
npm run preview

## Local mock flight API

The UI reads sample inventory from JSON files served by Vite from public/mock-data/. The mock adapter is in:

src/features/flight-search/services/mockFlightApi.ts

| Dataset | Purpose |
| --- | --- |
| airports.json | Airport/city autocomplete and IATA-code resolution |
| airlines.json | Airline reference information |
| flight-offers.json | Sample flight inventory for several routes |
| destinations.json | Explore destination content |
| popular-routes.json | Route shortcuts and indicative mock fares |
| price-calendar.json | Illustrative daily fares for a future calendar |
| mock-config.json | Mock API settings and disclaimer |

The search form fetches these files through the typed mock API adapter, simulates a short network delay, resolves airport codes, and filters offers by route, departure date, passenger count and cabin class. UI filters support stops, airline, price and departure time.

IMPORTANT: This is fictional test data. It does not represent live airline inventory, guaranteed prices, bookable seats or genuine booking links. Never use it to make a real travel purchase.

When the Spring Boot backend is ready, replace the implementation in mockFlightApi.ts with HTTP calls to the backend while retaining the response contracts. Never expose supplier credentials in frontend environment variables.


## Responsive search, results and details

- Home search uses airport autocomplete and shareable URL query parameters.
- Search results are available at \`/flights/search\`.
- A sample offer detail is available at \`/flights/:offerId\`.
- Mobile layouts include collapsible filters, touch-sized controls, safe-area padding, and a sticky provider action on the detail page.
- The Playwright projects cover Desktop Chromium, Pixel 7 (Android Chrome emulation), and iPhone 13 (WebKit / iOS Safari emulation).

Run browser tests locally:

\`\`\`bash
npx playwright install chromium webkit
npm run test:e2e
\`\`\`

The iPhone project exercises Playwright's WebKit engine with an iPhone device profile. It is a useful compatibility check, but it is not a substitute for final testing on physical iOS Safari and Android Chrome devices.


## Explore destinations, popular routes and price calendar

Visit \`/explore\` to browse the local destination inspiration cards, popular route shortcuts, and the daily sample fare calendar.

The Explore page loads:
- \`public/mock-data/destinations.json\`
- \`public/mock-data/popular-routes.json\`
- \`public/mock-data/price-calendar.json\`

The page is responsive for phone, tablet and desktop widths. Selecting a destination, route or calendar date opens the existing shareable flight-results route with the corresponding origin, destination and departure date.

All displayed destination fares and calendar prices are fictional demo data.

## End-to-end test coverage

Playwright covers desktop Chromium, Pixel Android Chrome emulation and iPhone WebKit emulation. The browser suite includes the flight search-to-details journey, Explore datasets, popular route navigation, calendar date selection, and narrow-screen overflow checks.

\`\`\`bash
npx playwright install chromium webkit
npm run test:e2e
\`\`\`

The iPhone profile runs WebKit with an iPhone viewport. It provides compatibility coverage but does not replace testing on physical iOS Safari and Android Chrome devices.


## Account authentication and travel dashboard

Standard traveler accounts sign in with email + one-time password (OTP) only. Enter an email address, request the six-digit code and verify it to sign in. A previously unregistered email becomes a new account only after successful OTP verification; there is no separate standard-user registration form.

Routes:
- `/login` — email OTP request/resend/verification via `/api/v1/auth/otp/request`, `/api/v1/auth/otp/resend` and `/api/v1/auth/otp/verify`
- `/account` — travel dashboard with Overview, Saved flights, My trips, Price alerts and Profile

Login stores the opaque bearer token in tab-scoped `sessionStorage`, then retrieves the current profile from `GET /api/v1/auth/me`. New accounts with `profileCompleted: false` are shown a first-time profile dialog. Full name, mobile number and date of birth are optional; users can choose **Save & Continue** or **Skip for now**. Both actions persist through `PATCH /api/v1/auth/me`, and profile details remain editable later from the account dashboard.

Logout calls `POST /api/v1/auth/logout`. Saved flights and price alerts use authenticated backend APIs.

**Security boundary:** Password login, password registration and forgot-password pages are not available in the standard-user UI. The backend retains an Admin-only password verification method for a future Admin portal, where an additional email OTP factor must be implemented before issuing a session. Configure SMTP and a unique production OTP HMAC secret on the backend before enabling live email delivery.
