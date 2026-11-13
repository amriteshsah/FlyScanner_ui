import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowDownUp, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown,
  Globe2, Heart, Plane, Search, ShieldCheck, SlidersHorizontal,
  Sparkles, Users, X,
} from 'lucide-react';
import {
  type Airport,
  type FlightResult,
  getAirportCatalog,
  getFeaturedFlights,
  resolveAirportCode,
} from './features/flight-search/services/mockFlightApi';
import AirportAutocomplete from './features/flight-search/components/AirportAutocomplete';
import { createFlightSearchQuery } from './features/flight-search/utils/searchQuery';
import SiteHeader from './components/layout/SiteHeader';
import { getSavedFlights, toggleSavedFlight } from './features/account/services/mockAccountStore';

type TripType = 'Round trip' | 'One way';
type SortMode = 'Recommended' | 'Cheapest' | 'Fastest';
const PERIODS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;
const CABIN_OPTIONS = [
  { label: 'Economy', value: 'ECONOMY' },
  { label: 'Premium economy', value: 'PREMIUM_ECONOMY' },
  { label: 'Business', value: 'BUSINESS' },
  { label: 'First class', value: 'FIRST' },
] as const;
type CabinClass = typeof CABIN_OPTIONS[number]['value'];

const money = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(value);

function dateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function App() {
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripType>('Round trip');
  const [origin, setOrigin] = useState('Bengaluru (BLR)');
  const [destination, setDestination] = useState('Dubai (DXB)');
  const [departureDate, setDepartureDate] = useState(dateAfter(14));
  const [returnDate, setReturnDate] = useState(dateAfter(20));
  const [travellers, setTravellers] = useState(1);
  const [cabin, setCabin] = useState<CabinClass>('ECONOMY');
  const [travellerMenuOpen, setTravellerMenuOpen] = useState(false);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [searchResults, setSearchResults] = useState<FlightResult[]>([]);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [sort, setSort] = useState<SortMode>('Recommended');
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [maxFare, setMaxFare] = useState(50000);
  const [savedFlights, setSavedFlights] = useState<number[]>(() => getSavedFlights().map((flight) => flight.id));

  useEffect(() => {
    let active = true;
    Promise.all([getAirportCatalog(), getFeaturedFlights()])
      .then(([airportData, featuredFlights]) => {
        if (!active) return;
        setAirports(airportData);
        setSearchResults(featuredFlights);
      })
      .catch(() => {
        if (active) setNotice('Could not load the local demo data. Please refresh the page.');
      });
    return () => { active = false; };
  }, []);

  const airlineNames = useMemo(
    () => [...new Set(searchResults.map((flight) => flight.airline))].sort(),
    [searchResults],
  );

  const results = useMemo(() => {
    const filtered = searchResults.filter((flight) => {
      const hour = Number(flight.depart.slice(0, 2));
      const periodMatch = selectedPeriods.length === 0 || selectedPeriods.some((period) => {
        if (period === 'Morning') return hour >= 5 && hour < 12;
        if (period === 'Afternoon') return hour >= 12 && hour < 17;
        if (period === 'Evening') return hour >= 17 && hour < 21;
        return hour >= 21 || hour < 5;
      });
      return (!nonstopOnly || flight.stops === 0)
        && (selectedAirlines.length === 0 || selectedAirlines.includes(flight.airline))
        && flight.price <= maxFare
        && periodMatch;
    });
    if (sort === 'Cheapest') filtered.sort((a, b) => a.price - b.price);
    if (sort === 'Fastest') filtered.sort((a, b) => a.durationMinutes - b.durationMinutes);
    return filtered;
  }, [searchResults, nonstopOnly, selectedAirlines, selectedPeriods, maxFare, sort]);

  function resetFilters() {
    setNonstopOnly(false);
    setSelectedAirlines([]);
    setSelectedPeriods([]);
    setMaxFare(50000);
    setSort('Recommended');
  }

  function swapAirports() {
    setOrigin(destination);
    setDestination(origin);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const originCode = resolveAirportCode(origin, airports);
    const destinationCode = resolveAirportCode(destination, airports);

    if (!originCode || !destinationCode) {
      setFormError('Choose a valid city or airport from the suggestions.');
      return;
    }
    if (originCode === destinationCode) {
      setFormError('Choose two different airports for your journey.');
      return;
    }
    if (!departureDate || departureDate < dateAfter(0)) {
      setFormError('Choose a valid departure date.');
      return;
    }
    if (trip === 'Round trip' && (!returnDate || returnDate < departureDate)) {
      setFormError('Return date must be on or after your departure date.');
      return;
    }

    setFormError('');
    const query = createFlightSearchQuery({
      originCode,
      destinationCode,
      departureDate,
      returnDate: trip === 'Round trip' ? returnDate : undefined,
      adults: travellers,
      cabinClass: cabin,
    });
    navigate('/flights/search?' + query);
  }

  function toggleAirline(airline: string) {
    setSelectedAirlines((current) => current.includes(airline)
      ? current.filter((item) => item !== airline)
      : [...current, airline]);
  }

  function togglePeriod(period: string) {
    setSelectedPeriods((current) => current.includes(period)
      ? current.filter((item) => item !== period)
      : [...current, period]);
  }

  function toggleSaved(id: number) {
    const flight = searchResults.find((item) => item.id === id);
    if (!flight) return;
    const updated = toggleSavedFlight(flight);
    setSavedFlights(updated.map((item) => item.id));
    showNotice(updated.some((item) => item.id === id) ? 'Flight saved to your account.' : 'Flight removed from saved flights.');
  }

  function showNotice(message: string) {
    setNotice(message);
  }

  return (
    <div className="app-shell">
      <SiteHeader onAction={showNotice} />

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> YOUR NEXT JOURNEY STARTS HERE</div>
            <h1>Go further.<br /><span>Spend smarter.</span></h1>
            <p>Compare flights from across the sky. Find a fare that feels right, and make more of every journey.</p>
            <div className="trust-row">
              <span><ShieldCheck size={15} /> Compare with confidence</span>
              <span><Globe2 size={15} /> Destinations worldwide</span>
            </div>
          </div>
          <div className="hero-art" aria-label="Decorative illustration of a plane travelling through the sky" role="img">
            <div className="sun-glow" /><div className="route route-one" /><div className="route route-two" />
            <div className="cloud cloud-one" /><div className="cloud cloud-two" />
            <div className="flight-stamp"><span>YOUR WORLD</span><strong>IS WAITING</strong><small>✦ DISCOVER MORE</small></div>
            <div className="plane-illustration"><Plane size={72} strokeWidth={1.2} /></div>
            <div className="art-caption"><span>01 — THE JOURNEY</span><span>MADE FOR YOU</span></div>
          </div>
        </section>

        <section className="search-panel" aria-label="Flight search">
          <div className="search-top">
            <div className="trip-tabs" role="group" aria-label="Trip type">
              {(['Round trip', 'One way'] as TripType[]).map((item) => (
                <button key={item} type="button" onClick={() => setTrip(item)} className={trip === item ? 'selected' : ''} aria-pressed={trip === item}>{item}</button>
              ))}
            </div>
            <div className="search-note"><span className="live-dot" /> Local demo API · simulated flight data</div>
          </div>

          <form className="search-grid" onSubmit={submitSearch}>
            <AirportAutocomplete
              label="FROM"
              value={origin}
              placeholder="Choose origin city or airport"
              airports={airports}
              onChange={setOrigin}
              onSelect={(airport) => setOrigin(airport.city + ' (' + airport.code + ')')}
            />
            <button type="button" className="swap-button" onClick={swapAirports} aria-label="Swap departure and destination"><ArrowDownUp size={17} /></button>
            <AirportAutocomplete
              label="TO"
              value={destination}
              placeholder="Choose destination city or airport"
              airports={airports}
              onChange={setDestination}
              onSelect={(airport) => setDestination(airport.city + ' (' + airport.code + ')')}
            />
            <label className="field date-field">
              <span>DEPARTURE</span>
              <div><CalendarDays size={17} /><input aria-label="Departure date" type="date" min={dateAfter(0)} value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} /></div>
              <small>Choose your date</small>
            </label>
            {trip === 'Round trip' && (
              <label className="field date-field return-field">
                <span>RETURN</span>
                <div><CalendarDays size={17} /><input aria-label="Return date" type="date" min={departureDate} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} /></div>
                <small>When are you back?</small>
              </label>
            )}
            <div className="traveller-wrap">
              <button type="button" className="field traveller-field" onClick={() => setTravellerMenuOpen((value) => !value)} aria-expanded={travellerMenuOpen}>
                <span>TRAVELLERS & CLASS</span>
                <div><Users size={17} /><strong>{travellers} {travellers === 1 ? 'traveller' : 'travellers'}</strong><ChevronDown size={15} /></div>
                <small>{CABIN_OPTIONS.find((option) => option.value === cabin)?.label}</small>
              </button>
              {travellerMenuOpen && (
                <div className="traveller-popover">
                  <div>
                    <div><b>Adults</b><small>Age 12+</small></div>
                    <div className="counter">
                      <button type="button" aria-label="Remove one adult" onClick={() => setTravellers(Math.max(1, travellers - 1))}>−</button>
                      <b>{travellers}</b>
                      <button type="button" aria-label="Add one adult" onClick={() => setTravellers(Math.min(9, travellers + 1))}>+</button>
                    </div>
                  </div>
                  <label>Cabin class
                    <select value={cabin} onChange={(event) => setCabin(event.target.value as CabinClass)}>
                      {CABIN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <button type="button" className="done-button" onClick={() => setTravellerMenuOpen(false)}>Done</button>
                </div>
              )}
            </div>
            <button className="search-button" type="submit" disabled={airports.length === 0}>
              <Search size={21} strokeWidth={2.7} />
              <span>Search flights</span>
              <ArrowRight size={20} strokeWidth={2.7} />
            </button>
          </form>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="panel-foot"><span><Check size={14} /> Compare fares at no cost</span><span>Demo data · INR (₹)</span></div>
        </section>

        <section className="results-section" id="flights">
          <div className="section-heading">
            <div>
              <div className="eyebrow dark-eyebrow">A GOOD PLACE TO START</div>
              <h2>Popular flight options</h2>
              <p>Featured sample fares to explore. Start a search to compare a specific route.</p>
            </div>
            <div className="results-heading-meta">{results.length} sample options</div>
          </div>

          <div className="results-layout">
            <aside className="filters" aria-label="Flight filters">
              <div className="filter-heading"><SlidersHorizontal size={17} /><strong>Filters</strong><button onClick={resetFilters}>Reset</button></div>
              <div className="filter-group">
                <h3>Stops</h3>
                <label className="check-option"><input type="checkbox" checked={nonstopOnly} onChange={(event) => setNonstopOnly(event.target.checked)} /><span>Non-stop only</span><b>{searchResults.filter((flight) => flight.stops === 0).length}</b></label>
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
              <div className="filter-group">
                <h3>Departure time</h3>
                <div className="time-options">
                  {PERIODS.map((period) => <button type="button" key={period} className={selectedPeriods.includes(period) ? 'active' : ''} onClick={() => togglePeriod(period)} aria-pressed={selectedPeriods.includes(period)}>{period}</button>)}
                </div>
              </div>
            </aside>

            <div className="flight-results">
              <div className="results-toolbar">
                <span><b>{results.length} flights</b> found <span className="muted">· Local mock API</span></span>
                <div className="sort-control"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Sort flights"><option>Recommended</option><option>Cheapest</option><option>Fastest</option></select></div>
              </div>
              {results.map((flight) => (
                <article className="flight-card" key={flight.id}>
                  <div className="flight-main">
                    <div className="airline">
                      <div className={'airline-logo logo-' + (flight.id % 4 + 1)}>{flight.airlineCode}</div>
                      <div><strong>{flight.airline}</strong><small>{flight.code}</small></div>
                    </div>
                    <div className="journey">
                      <div className="time-place"><strong>{flight.depart}</strong><span>{flight.from}</span></div>
                      <div className="journey-line">
                        <small>{flight.duration}</small><div><i /><span /><i /></div>
                        <small>{flight.stops === 0 ? 'Non-stop' : flight.stops + ' stop'}</small>
                        {flight.stopDetail && <em>{flight.stopDetail}</em>}
                      </div>
                      <div className="time-place right"><strong>{flight.arrive}</strong><span>{flight.to}</span></div>
                    </div>
                    <div className="fare">
                      <strong>{money(flight.price)}</strong><small>per person · {flight.fareType === 'ROUND_TRIP' ? 'round trip' : 'one way'}</small>
                      <Link className="home-view-deal" to={'/flights/' + flight.id + '?' + createFlightSearchQuery({
                        originCode: resolveAirportCode(origin, airports) ?? 'BLR',
                        destinationCode: resolveAirportCode(destination, airports) ?? 'DXB',
                        departureDate,
                        returnDate: trip === 'Round trip' ? returnDate : undefined,
                        adults: travellers,
                        cabinClass: cabin,
                      })}>View details <ArrowUpRight size={15} /></Link>
                    </div>
                  </div>
                  {(flight.label || flight.carbonIndex === 'low') && (
                    <div className="flight-meta">
                      {flight.label && <span className={flight.label === 'Best price' ? 'best-tag' : 'meta-tag'}>{flight.label === 'Best price' && <Sparkles size={12} />} {flight.label}</span>}
                      {flight.carbonIndex === 'low' && <span className="carbon-tag"><Check size={12} /> Lower emissions · demo estimate</span>}
                    </div>
                  )}
                  <button className={savedFlights.includes(flight.id) ? 'save-flight saved' : 'save-flight'} onClick={() => toggleSaved(flight.id)} aria-label={savedFlights.includes(flight.id) ? 'Remove saved flight' : 'Save flight'} aria-pressed={savedFlights.includes(flight.id)}><Heart size={17} fill={savedFlights.includes(flight.id) ? 'currentColor' : 'none'} /></button>
                </article>
              ))}
              {results.length === 0 && (
                <div className="empty-state">No featured sample flights are available for this route. Search for a route to see its matching demo offers.</div>
              )}
              <div className="results-disclaimer"><ShieldCheck size={15} /> Featured fares are simulated JSON data. Search for a route to view matching sample offers.</div>
            </div>
          </div>
        </section>

        <section className="inspiration" id="inspiration">
          <div className="inspiration-copy">
            <span className="eyebrow">A WORLD OF POSSIBILITIES</span>
            <h2>Somewhere new<br />is closer than you think.</h2>
            <p>Big adventures don't need big budgets. Start with a destination and see where the journey takes you.</p>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Find your next flight <ArrowRight size={16} /></button>
          </div>
          <div className="destination-collage">
            <div className="destination-photo photo-one"><span>01 / COASTLINES</span><strong>Bali, Indonesia</strong></div>
            <div className="destination-photo photo-two"><span>02 / CITY LIGHTS</span><strong>Tokyo, Japan</strong></div>
            <div className="destination-photo photo-three"><span>03 / OPEN ROADS</span><strong>Swiss Alps</strong></div>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#"><span className="brand-mark"><Plane size={17} fill="currentColor" /></span><span>fly<span>scanner</span></span></a>
        <span>Thoughtful travel starts with a better search.</span><span>© 2026 FlyScanner</span>
      </footer>
      <div className={notice ? 'toast visible' : 'toast'} role="status" aria-live="polite">
        <span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={14} /></button>
      </div>
    </div>
  );
}

export default App;
