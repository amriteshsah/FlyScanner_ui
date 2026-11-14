import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Filter, Heart, SlidersHorizontal, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import SiteHeader from '../../../components/layout/SiteHeader';
import { type Airport, type FlightResult, getAirportCatalog } from '../../flight-search/services/mockFlightApi';
import { getFlightSearchSource, searchFlightResults } from '../../flight-search/services/flightSearchApi';
import { cabinLabel, createFlightSearchQuery, formatTravelDate, parseFlightSearchParams } from '../../flight-search/utils/searchQuery';
import { getSavedFlights, toggleSavedFlight } from '../../account/services/mockAccountStore';

type SortMode = 'Recommended' | 'Cheapest' | 'Fastest';
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function FlightResultsPage() {
  const [searchParams] = useSearchParams();
  const queryKey = searchParams.toString();
  const criteria = useMemo(() => parseFlightSearchParams(new URLSearchParams(queryKey)), [queryKey]);
  const searchSource = getFlightSearchSource(searchParams);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [providerNotice, setProviderNotice] = useState('');
  const [resultDisclaimer, setResultDisclaimer] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [sort, setSort] = useState<SortMode>('Recommended');
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [maxFare, setMaxFare] = useState(60000);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [saved, setSaved] = useState<number[]>(() => getSavedFlights().map((flight) => flight.id));
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    if (!criteria) {
      setLoading(false);
      setError('The search link is missing valid flight details. Please start a new search.');
      return () => controller.abort();
    }

    setLoading(true);
    setError('');
    setProviderNotice('');
    Promise.all([
      getAirportCatalog(controller.signal),
      searchFlightResults(criteria, controller.signal, searchSource),
    ])
      .then(([airportData, searchResult]) => {
        setAirports(airportData);
        setFlights(searchResult.offers);
        setResultDisclaimer(searchResult.disclaimer);
        if (searchResult.status === 'PARTIAL_SUCCESS') {
          setProviderNotice('Some flight sources did not respond. Showing the offers that were available.');
        } else if (searchResult.status === 'UNAVAILABLE') {
          setProviderNotice('Flight sources are temporarily unavailable. Please retry your search.');
        } else if (searchResult.status === 'NO_RESULTS') {
          setProviderNotice('No offers were returned for this route and date.');
        }
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== 'AbortError') {
          setError(reason.message || 'We could not load flight results. Please retry your search.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [queryKey, retryKey, searchSource]);

  const origin = airports.find((airport) => airport.code === criteria?.originCode);
  const destination = airports.find((airport) => airport.code === criteria?.destinationCode);
  const airlineNames = useMemo(() => [...new Set(flights.map((flight) => flight.airline))].sort(), [flights]);

  const visibleFlights = useMemo(() => {
    const filtered = flights.filter((flight) =>
      (!nonstopOnly || flight.stops === 0)
      && (selectedAirlines.length === 0 || selectedAirlines.includes(flight.airline))
      && flight.price <= maxFare
    );
    if (sort === 'Cheapest') filtered.sort((a, b) => a.price - b.price);
    if (sort === 'Fastest') filtered.sort((a, b) => a.durationMinutes - b.durationMinutes);
    return filtered;
  }, [flights, nonstopOnly, selectedAirlines, maxFare, sort]);

  function resetFilters() {
    setNonstopOnly(false);
    setSelectedAirlines([]);
    setMaxFare(60000);
    setSort('Recommended');
  }

  function toggleAirline(name: string) {
    setSelectedAirlines((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  function toggleSaved(id: number) {
    const flight = flights.find((item) => item.id === id);
    if (!flight) return;
    const updated = toggleSavedFlight(flight);
    setSaved(updated.map((item) => item.id));
    setNotice(updated.some((item) => item.id === id) ? 'Flight saved to your account.' : 'Flight removed from saved flights.');
  }

  const sourceParam = searchParams.get('source');
  const query = criteria
    ? createFlightSearchQuery(criteria) + (sourceParam ? '&source=' + encodeURIComponent(sourceParam) : '')
    : '';

  return (
    <div className="page-shell">
      <SiteHeader onAction={setNotice} />
      <main className="results-page-main">
        <Link className="back-link" to="/"><ArrowLeft size={16} /> Back to search</Link>
        {criteria && (
          <section className="results-search-summary" aria-label="Current flight search">
            <div className="results-route">
              <div className="eyebrow">FLIGHT SEARCH</div>
              <h1>{origin?.city ?? criteria.originCode} <span>→</span> {destination?.city ?? criteria.destinationCode}</h1>
              <p>{formatTravelDate(criteria.departureDate)}{criteria.returnDate ? ' – ' + formatTravelDate(criteria.returnDate) : ' · One way'} · {criteria.adults} {criteria.adults === 1 ? 'traveller' : 'travellers'} · {cabinLabel(criteria.cabinClass)}</p>
            </div>
            <Link className="edit-search-button" to="/"><CalendarDays size={16} /> Edit search</Link>
          </section>
        )}

        <section className="results-content">
          <div className="results-title-row">
            <div>
              <div className="eyebrow">COMPARE YOUR OPTIONS</div>
              <h2>Flight results</h2>
              <p>{loading ? 'Searching flight options…' : error || (visibleFlights.length + ' flight options for your journey')}</p>
            </div>
            <div className="results-trust"><Check size={15} /> {searchSource === 'mock' ? 'Demo inventory · prices are illustrative' : 'Backend search · verify final fare with provider'}</div>
          </div>

          <div className="results-toolbar-mobile">
            <button type="button" className="mobile-filter-button" onClick={() => setMobileFiltersOpen((value) => !value)} aria-expanded={mobileFiltersOpen}>
              {mobileFiltersOpen ? <X size={17} /> : <Filter size={17} />} Filters
              {(nonstopOnly || selectedAirlines.length > 0 || maxFare < 60000) && <span className="filter-count">Active</span>}
            </button>
            <label className="mobile-sort-label">Sort
              <select aria-label="Sort flights" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                <option>Recommended</option><option>Cheapest</option><option>Fastest</option>
              </select>
            </label>
          </div>

          <div className="results-layout-page">
            <aside className={mobileFiltersOpen ? 'filters results-filters is-open' : 'filters results-filters'} aria-label="Flight filters">
              <div className="filter-heading"><SlidersHorizontal size={17} /><strong>Filters</strong><button type="button" onClick={resetFilters}>Reset</button></div>
              <div className="filter-group">
                <h3>Stops</h3>
                <label className="check-option"><input type="checkbox" checked={nonstopOnly} onChange={(event) => setNonstopOnly(event.target.checked)} /><span>Non-stop only</span><b>{flights.filter((flight) => flight.stops === 0).length}</b></label>
              </div>
              <div className="filter-group">
                <h3>Maximum price</h3>
                <input className="price-slider" type="range" min="3000" max="60000" step="500" value={maxFare} onChange={(event) => setMaxFare(Number(event.target.value))} aria-label="Maximum price" />
                <div className="range-labels"><span>₹3,000</span><strong>{money(maxFare)}</strong></div>
              </div>
              <div className="filter-group">
                <h3>Airlines</h3>
                {airlineNames.map((airline) => (
                  <label className="check-option" key={airline}>
                    <input type="checkbox" checked={selectedAirlines.includes(airline)} onChange={() => toggleAirline(airline)} />
                    <span>{airline}</span>
                  </label>
                ))}
              </div>
            </aside>

            <div className="flight-results-page">
              <div className="results-toolbar-desktop">
                <span><strong>{visibleFlights.length} flights</strong> found <span className="muted">· {searchSource === 'mock' ? 'Local mock API' : 'FlyScanner backend API'}</span></span>
                <label className="sort-control">Sort by
                  <select aria-label="Sort flights" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                    <option>Recommended</option><option>Cheapest</option><option>Fastest</option>
                  </select>
                </label>
              </div>

              {loading && <div className="loading-state" role="status"><span className="loading-spinner" /> Searching flight options…</div>}
              {!loading && providerNotice && visibleFlights.length > 0 && <div className="empty-state" role="status" data-testid="provider-search-notice">{providerNotice}</div>}
              {!loading && error && <div className="empty-state" role="alert">{error}<button type="button" className="edit-search-button" onClick={() => setRetryKey((value) => value + 1)}>Retry search</button><Link to="/">Start a new search</Link></div>}
              {!loading && !error && visibleFlights.map((flight) => (
                <article className="result-card" data-testid="flight-result-card" key={flight.id}>
                  <div className="result-card-main">
                    <div className="result-airline">
                      <div className="airline-logo">{flight.airlineCode}</div>
                      <div><strong>{flight.airline}</strong><small>{flight.code}</small></div>
                    </div>
                    <div className="result-journey">
                      <div className="result-time"><strong>{flight.depart}</strong><span>{flight.from}</span></div>
                      <div className="result-duration"><small>{flight.duration}</small><div className="journey-track"><i /><span /><i /></div><small>{flight.stops === 0 ? 'Non-stop' : flight.stops + ' stop'}</small>{flight.stopDetail && <em>{flight.stopDetail}</em>}</div>
                      <div className="result-time result-time-end"><strong>{flight.arrive}</strong><span>{flight.to}</span></div>
                    </div>
                    <div className="result-fare"><span className="fare-caption">{flight.fareType === 'ROUND_TRIP' ? 'ROUND TRIP' : 'ONE WAY'}</span><strong>{money(flight.price)}</strong><small>total for selected travellers</small></div>
                  </div>
                  <div className="result-card-footer">
                    <div className="result-tags">
                      {flight.label && <span className={flight.label === 'Best price' ? 'best-tag' : 'meta-tag'}>{flight.label}</span>}
                      <span className="result-baggage">{flight.seatsRemaining > 0 ? flight.baggage + ' checked baggage · ' + flight.seatsRemaining + ' sample seats' : flight.baggage}</span>
                    </div>
                    <div className="result-actions">
                      <button className={saved.includes(flight.id) ? 'result-save saved' : 'result-save'} type="button" onClick={() => toggleSaved(flight.id)} aria-label={saved.includes(flight.id) ? 'Remove saved flight' : 'Save flight'} aria-pressed={saved.includes(flight.id)}><Heart size={17} fill={saved.includes(flight.id) ? 'currentColor' : 'none'} /></button>
                      <Link className="details-button" to={'/flights/' + flight.id + '?' + query}>View flight details <ArrowUpRight size={16} /></Link>
                    </div>
                  </div>
                </article>
              ))}
              {!loading && !error && visibleFlights.length === 0 && <div className="empty-state" role="status">{providerNotice || 'No flights match these filters. Adjust your filters or search another route.'}</div>}
              <p className="results-disclaimer">{resultDisclaimer || 'Always verify the final fare, availability and fare rules with the travel provider.'}</p>
            </div>
          </div>
        </section>
      </main>
      <div className={notice ? 'toast visible' : 'toast'} role="status" aria-live="polite">
        <span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button>
      </div>
    </div>
  );
}
