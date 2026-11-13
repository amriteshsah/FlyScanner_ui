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
