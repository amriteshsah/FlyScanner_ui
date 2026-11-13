import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import App from './App';
import FlightResultsPage from './features/flight-results/pages/FlightResultsPage';
import FlightDetailsPage from './features/flight-details/pages/FlightDetailsPage';
import ExplorePage from './features/explore/pages/ExplorePage';
import './styles.css';

function NotFoundPage() {
  return (
    <main className="route-not-found">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/">Return to FlyScanner</a>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/flights/search" element={<FlightResultsPage />} />
        <Route path="/flights/:offerId" element={<FlightDetailsPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
