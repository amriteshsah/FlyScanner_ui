import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Compass, PlaneTakeoff, TrendingDown } from 'lucide-react';
import { Link } from 'react-router';
import SiteHeader from '../../../components/layout/SiteHeader';
import {
  type Destination,
  type PopularRoute,
  type PriceCalendarMonth,
  getDestinationCatalog,
  getPopularRoutes,
  getPriceCalendarCatalog,
} from '../../flight-search/services/mockFlightApi';
import { createFlightSearchQuery } from '../../flight-search/utils/searchQuery';

const money = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(value);

const MONTHS = [
  { value: '2027-01', label: 'January 2027' },
  { value: '2027-02', label: 'February 2027' },
  { value: '2027-03', label: 'March 2027' },
];

function dateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function makeSearchUrl(from: string, to: string, departure: string) {
  return '/flights/search?' + createFlightSearchQuery({
    originCode: from, destinationCode: to, departureDate: departure,
    adults: 1, cabinClass: 'ECONOMY',
  });
}

function getMonthParts(value: string) {
  const parts = value.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  return { year, month, days: new Date(year, month, 0).getDate(), offset: new Date(year, month - 1, 1).getDay() };
}

function compactFare(value: number) {
  return value >= 10000 ? '₹' + (value / 1000).toFixed(1) + 'k' : '₹' + value.toLocaleString('en-IN');
}

export default function ExplorePage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [routes, setRoutes] = useState<PopularRoute[]>([]);
  const [calendarData, setCalendarData] = useState<PriceCalendarMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('BLR-DXB');
  const [selectedMonth, setSelectedMonth] = useState('2027-01');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getDestinationCatalog(controller.signal),
      getPopularRoutes(controller.signal),
      getPriceCalendarCatalog(controller.signal),
    ]).then(([destinationData, routeData, calendar]) => {
      setDestinations(destinationData);
      setRoutes(routeData);
      setCalendarData(calendar);
    }).catch((reason: unknown) => {
      if (!(reason instanceof Error && reason.name === 'AbortError')) {
        setError('We could not load the Explore demo datasets. Please refresh and try again.');
      }
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const currentCalendar = useMemo(
    () => calendarData.find((item) => item.route === selectedRoute && item.month === selectedMonth),
    [calendarData, selectedRoute, selectedMonth],
  );

  const monthParts = getMonthParts(selectedMonth);
  const cheapestDay = useMemo(() => {
    if (!currentCalendar) return null;
    const validFares = currentCalendar.dailyFrom.filter((fare) => fare > 0);
    if (validFares.length === 0) return null;
    const lowest = Math.min(...validFares);
    return currentCalendar.dailyFrom.findIndex((fare) => fare === lowest) + 1;
  }, [currentCalendar]);

  useEffect(() => {
    setSelectedDay(cheapestDay);
  }, [cheapestDay, selectedRoute, selectedMonth]);

  const selectedFare = selectedDay && currentCalendar ? currentCalendar.dailyFrom[selectedDay - 1] : null;
  const routeOptions = useMemo(
    () => [...new Set(calendarData.map((item) => item.route))],
    [calendarData],
  );
  const routeCodes = selectedRoute.split('-');
  const calendarSearchUrl = selectedDay
    ? makeSearchUrl(routeCodes[0], routeCodes[1], selectedMonth + '-' + String(selectedDay).padStart(2, '0'))
    : '#calendar';

  return (
    <div className="page-shell explore-page">
      <SiteHeader onAction={setNotice} />
      <main className="explore-main">
        <section className="explore-hero">
          <div className="explore-hero-copy">
            <span className="eyebrow"><Compass size={14} /> THE WORLD IS OPEN</span>
            <h1>Find somewhere<br /><span>worth going.</span></h1>
            <p>Fresh ideas for your next trip, popular routes worth comparing, and sample fares to help you plan a little smarter.</p>
            <a className="explore-hero-cta" href="#destinations">Explore destinations <ArrowRight size={17} /></a>
          </div>
          <div className="explore-hero-art" aria-label="Illustration of a plane travelling around the world" role="img">
            <div className="explore-globe" />
            <div className="explore-orbit orbit-one" />
            <div className="explore-orbit orbit-two" />
            <div className="explore-plane"><PlaneTakeoff size={58} strokeWidth={1.35} /></div>
            <span className="explore-stamp">GO SEE<br />WHAT'S OUT THERE</span>
            <span className="explore-coordinate">12° 58' N · 77° 35' E</span>
          </div>
        </section>

        {error && <div className="empty-state" role="alert">{error}</div>}

        <section className="explore-section" id="destinations">
          <div className="explore-section-heading">
            <div><span className="eyebrow">A LITTLE INSPIRATION</span><h2>Places to take you places.</h2><p>Thoughtful ideas for your next escape.</p></div>
            <span className="section-count"><Compass size={15} /> {destinations.length} destinations</span>
          </div>
          {loading ? <div className="explore-loading">Loading destination ideas…</div> : (
            <div className="destination-grid">
              {destinations.map((destination, index) => (
                <Link className={'destination-card destination-' + destination.imageKey}
                  to={makeSearchUrl(destination.fromAirport, destination.airportCode, dateAfter(14))}
                  key={destination.id} aria-label={'Explore ' + destination.city}>
                  <div className="destination-card-top"><span>{destination.category}</span><span>{String(index + 1).padStart(2, '0')}</span></div>
                  <div className="destination-card-bottom">
                    <span className="destination-country">{destination.country}</span>
                    <strong>{destination.city}</strong>
                    <span className="destination-tagline">{destination.tagline}</span>
                    <span className="destination-fare">Flights from <b>{money(destination.indicativeFare)}</b></span>
                  </div>
                  <span className="destination-arrow"><ArrowRight size={18} /></span>
                </Link>
              ))}
            </div>
          )}
          <p className="mock-disclaimer">Destination suggestions and starting fares are illustrative local demo data.</p>
        </section>

        <section className="explore-section popular-routes-section" id="popular-routes">
          <div className="explore-section-heading">
            <div><span className="eyebrow">ROUTES PEOPLE LOVE</span><h2>Popular routes.</h2><p>Start with a route and compare the sample offers.</p></div>
            <span className="section-count"><TrendingDown size={15} /> Sample starting fares</span>
          </div>
          {loading ? <div className="explore-loading">Loading popular routes…</div> : (
            <div className="popular-route-grid">
              {routes.map((route) => (
                <Link className="popular-route-card" to={makeSearchUrl(route.origin, route.destination, dateAfter(14))} key={route.id}>
                  <div className="popular-route-icon"><PlaneTakeoff size={18} /></div>
                  <div className="popular-route-copy"><strong>{route.label}</strong><span>{route.searchCountLabel}</span></div>
                  <div className="popular-route-fare"><small>from</small><b>{money(route.fromFare)}</b></div>
                  <ArrowRight className="popular-route-arrow" size={17} />
                </Link>
              ))}
            </div>
          )}
          <p className="mock-disclaimer">Popular route labels and fares are local test fixtures, not live fare rankings.</p>
        </section>

        <section className="explore-section calendar-section" id="price-calendar">
          <div className="explore-section-heading">
            <div><span className="eyebrow">PICK A DATE, FIND A FARE</span><h2>Price calendar.</h2><p>Compare sample daily fares and choose a date to search.</p></div>
            <span className="section-count"><CalendarDays size={15} /> Flexible date planning</span>
          </div>

          <div className="calendar-panel">
            <div className="calendar-controls">
              <label>Route
                <select value={selectedRoute} onChange={(event) => setSelectedRoute(event.target.value)}>
                  {routeOptions.map((route) => <option value={route} key={route}>{route.replace('-', ' → ')}</option>)}
                </select>
              </label>
              <label>Month
                <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                  {MONTHS.filter((month) => calendarData.some((item) => item.route === selectedRoute && item.month === month.value))
                    .map((month) => <option value={month.value} key={month.value}>{month.label}</option>)}
                </select>
              </label>
            </div>

            {!currentCalendar ? (
              <div className="calendar-empty">No sample calendar is available for this route yet.</div>
            ) : (
              <>
                <div className="calendar-grid" role="group" aria-label={MONTHS.find((month) => month.value === selectedMonth)?.label + ' sample fare calendar'}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
                  {Array.from({ length: monthParts.offset }, (_, index) => <span className="calendar-blank" key={'blank-' + index} />)}
                  {currentCalendar.dailyFrom.map((fare, index) => {
                    const day = index + 1;
                    const isCheapest = day === cheapestDay;
                    const selected = day === selectedDay;
                    const disabled = fare <= 0;
                    return (
                      <button type="button" className={'calendar-day' + (isCheapest ? ' cheapest' : '') + (selected ? ' selected' : '')}
                        key={day} disabled={disabled} aria-pressed={selected} data-testid="calendar-day"
                        aria-label={MONTHS.find((month) => month.value === selectedMonth)?.label + ' ' + day + ', sample fare ' + money(fare)}
                        onClick={() => setSelectedDay(day)}>
                        <span>{day}</span><strong>{compactFare(fare)}</strong>{isCheapest && <i>Best</i>}
                      </button>
                    );
                  })}
                </div>
                <div className="calendar-legend"><span><i className="legend-best" /> Lowest sample fare</span><span><i className="legend-selected" /> Selected date</span></div>
                <div className="calendar-selection">
                  <div>
                    <span className="eyebrow">YOUR SELECTED DATE</span>
                    <strong>{selectedDay ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(selectedMonth + '-' + String(selectedDay).padStart(2, '0') + 'T12:00:00')) : 'Choose a date'}</strong>
                    <small>{selectedFare ? 'Illustrative starting fare · ' + money(selectedFare) : 'Select a date from the calendar'}</small>
                  </div>
                  <Link className="calendar-search-button" to={calendarSearchUrl} aria-disabled={!selectedDay} onClick={(event) => { if (!selectedDay) event.preventDefault(); }}>
                    Search this date <ArrowRight size={17} />
                  </Link>
                </div>
              </>
            )}
          </div>
          <p className="mock-disclaimer">Calendar prices are fictional sample data for interface testing. Actual fares change and must be checked with a travel provider.</p>
        </section>

        <section className="explore-bottom-cta">
          <div><span className="eyebrow">READY WHEN YOU ARE</span><h2>Your next story starts with a search.</h2><p>Choose a destination, compare your options, and take it from there.</p></div>
          <Link to="/" className="explore-hero-cta">Search flights <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="explore-footer">
        <span>© 2026 FlyScanner</span><span>Explore more. Compare smarter.</span><Link to="/">Back to flight search</Link>
      </footer>
      <div className={notice ? 'toast visible' : 'toast'} role="status" aria-live="polite">
        <span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button>
      </div>
    </div>
  );
}
