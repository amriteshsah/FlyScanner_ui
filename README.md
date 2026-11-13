# FlyScanner UI

A responsive flight-search and fare-comparison interface built with **React 19 + TypeScript + Vite**.

## Design principles

- Clean, travel-focused visual design with a calm neutral canvas, navy typography and focused blue actions.
- Search-first layout that remains usable on mobile, tablet and desktop.
- Lightweight custom CSS instead of a heavyweight component framework.
- SVG icons from Lucide React; no icon font or large image dependency.
- Accessible control labels, keyboard-operable buttons and reduced-motion support.

## Technology

| Area | Choice |
| --- | --- |
| UI framework | React 19.3.1 |
| Language | TypeScript 7.0.2 |
| Build tool | Vite 8.3.8 |
| Icons | Lucide React 1.72.0 |
| Styling | Custom CSS |

## Requirements

- Node.js 20.19+ (or a compatible newer LTS)
- npm 10+

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

## Validate and build

\`\`\`bash
npm run typecheck
npm run build
npm run preview
\`\`\`

## Current implementation

The current screen is a front-end prototype. Search form controls, sorting, stop/airline/time filters, price ceiling and saved-flight controls are interactive. The flight cards use illustrative sample data. Live supplier fares, account authentication, price alerts and booking redirects are not yet connected.

Set the backend API base URL in a local \`.env\` file when API integration begins:

\`\`\`env
VITE_API_BASE_URL=http://localhost:8080/api/v1
\`\`\`

Never put supplier API secrets in Vite environment variables. Anything prefixed with \`VITE_\` is exposed to the browser.
