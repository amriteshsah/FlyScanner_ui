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

Open the Vite URL printed in the terminal (normally http://localhost:5173).

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
