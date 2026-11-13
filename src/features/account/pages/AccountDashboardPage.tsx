import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Bell, CalendarDays, Check, ChevronRight, Heart, LogOut,
  Plane, Plus, ShieldCheck, Trash2, UserRound, Wallet,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import SiteHeader from '../../../components/layout/SiteHeader';
import {
  type AccountUser,
  type PriceAlert,
  type SavedFlight,
  createPriceAlert,
  getCurrentUser,
  getPriceAlerts,
  getSavedFlights,
  removePriceAlert,
  signOutDemo,
  updateDemoProfile,
} from '../services/mockAccountStore';

type Tab = 'overview' | 'saved' | 'trips' | 'alerts' | 'profile';
const TABS: { id: Tab; label: string; icon: typeof UserRound }[] = [
  { id: 'overview', label: 'Overview', icon: Wallet },
  { id: 'saved', label: 'Saved flights', icon: Heart },
  { id: 'trips', label: 'My trips', icon: Plane },
  { id: 'alerts', label: 'Price alerts', icon: Bell },
  { id: 'profile', label: 'Profile', icon: UserRound },
];
const AIRPORT_OPTIONS = [
  { code: 'BLR', city: 'Bengaluru' }, { code: 'DEL', city: 'New Delhi' },
  { code: 'BOM', city: 'Mumbai' }, { code: 'HYD', city: 'Hyderabad' },
  { code: 'MAA', city: 'Chennai' }, { code: 'PAT', city: 'Patna' },
  { code: 'DXB', city: 'Dubai' }, { code: 'SIN', city: 'Singapore' },
  { code: 'LHR', city: 'London' }, { code: 'GOI', city: 'Goa' },
];

const money = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(value);

function dateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function routeName(code: string) {
  return AIRPORT_OPTIONS.find((airport) => airport.code === code)?.city ?? code;
}

function searchUrl(from: string, to: string) {
  const query = new URLSearchParams({
    from,
    to,
    departure: dateAfter(14),
    adults: '1',
    cabin: 'ECONOMY',
    trip: 'ONE_WAY',
  });
  return '/flights/search?' + query.toString();
}

export default function AccountDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = TABS.some((tab) => tab.id === requestedTab) ? requestedTab! : 'overview';
  const [user, setUser] = useState<AccountUser | null>(() => getCurrentUser());
  const [savedFlights, setSavedFlights] = useState<SavedFlight[]>(() => getSavedFlights());
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => getPriceAlerts());
  const [name, setName] = useState(user?.name ?? '');
  const [origin, setOrigin] = useState('BLR');
  const [destination, setDestination] = useState('DXB');
  const [targetPrice, setTargetPrice] = useState('12000');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login?next=%2Faccount', { replace: true });
  }, [user, navigate]);

  const greetingName = useMemo(() => user?.name.split(' ')[0] ?? 'traveller', [user]);

  function selectTab(tab: Tab) {
    setSearchParams(tab === 'overview' ? {} : { tab });
  }

  function signOut() {
    signOutDemo();
    setUser(null);
    navigate('/', { replace: true });
  }

  function submitAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (origin === destination) {
      setError('Choose two different airports for your alert.');
      return;
    }
    const price = Number(targetPrice);
    if (!Number.isFinite(price) || price < 1000) {
      setError('Enter a target fare of at least ₹1,000.');
      return;
    }
    setAlerts(createPriceAlert(origin, destination, price));
    setNotice('Your demo price alert has been created in this browser.');
    selectTab('alerts');
  }

  function deleteAlert(id: string) {
    setAlerts(removePriceAlert(id));
    setNotice('Price alert removed.');
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Please enter a name with at least two characters.');
      return;
    }
    const updated = updateDemoProfile(name);
    setUser(updated);
    setNotice('Your demo profile has been updated.');
  }

  function removeSavedFlight(id: number) {
    try {
      const next = savedFlights.filter((flight) => flight.id !== id);
      localStorage.setItem('flyscanner.demo.saved-flights.v1', JSON.stringify(next));
      setSavedFlights(next);
      setNotice('Flight removed from saved items.');
    } catch {
      setNotice('Browser storage is unavailable. The saved list could not be updated.');
    }
  }

  if (!user) {
    return <main className="account-redirect"><span className="loading-spinner" /> Opening sign in…</main>;
  }

  return (
    <div className="page-shell account-page">
      <SiteHeader onAction={setNotice} />
      <main className="account-main">
        <section className="account-welcome">
          <div>
            <span className="eyebrow">YOUR FLYSCANNER SPACE</span>
            <h1>Hello, {greetingName}.</h1>
            <p>Keep your flight ideas, trip plans and fare alerts close at hand.</p>
          </div>
          <button className="account-signout" type="button" onClick={signOut}><LogOut size={16} /> Sign out</button>
        </section>

        <div className="account-shell">
          <aside className="account-sidebar">
            <div className="account-user-summary">
              <div className="account-avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
              <span className="account-demo-pill"><ShieldCheck size={12} /> Demo account</span>
            </div>
            <nav className="account-tabs" aria-label="Account navigation">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button type="button" className={activeTab === id ? 'active' : ''} key={id} onClick={() => selectTab(id)}>
                  <Icon size={17} /><span>{label}</span><ChevronRight size={15} />
                </button>
              ))}
            </nav>
          </aside>

          <section className="account-content">
            {activeTab === 'overview' && (
              <>
                <div className="account-content-heading">
                  <div><span className="eyebrow">AT A GLANCE</span><h2>Your travel dashboard</h2><p>A quick view of the things you have saved.</p></div>
                  <Link to="/explore" className="account-explore-link">Explore destinations <ArrowRight size={15} /></Link>
                </div>
                <div className="account-stat-grid">
                  <button type="button" onClick={() => selectTab('saved')} className="account-stat-card"><span><Heart size={18} /></span><strong>{savedFlights.length}</strong><small>Saved flights</small></button>
                  <button type="button" onClick={() => selectTab('trips')} className="account-stat-card"><span><Plane size={18} /></span><strong>0</strong><small>Booked trips</small></button>
                  <button type="button" onClick={() => selectTab('alerts')} className="account-stat-card"><span><Bell size={18} /></span><strong>{alerts.length}</strong><small>Price alerts</small></button>
                </div>
                <div className="account-panel">
                  <div className="account-panel-heading"><div><h3>Recently saved flights</h3><p>Your shortlist, ready when you are.</p></div><button type="button" onClick={() => selectTab('saved')}>View all <ArrowRight size={14} /></button></div>
                  {savedFlights.length === 0 ? (
                    <div className="account-empty"><Heart size={22} /><strong>No saved flights yet</strong><p>Save a flight from the results page and it will appear here.</p><Link to="/">Search flights</Link></div>
                  ) : savedFlights.slice(0, 3).map((flight) => <SavedFlightRow key={flight.id} flight={flight} onRemove={removeSavedFlight} />)}
                </div>
                <div className="account-tip"><SparklesIcon /> <span><strong>A little planning goes a long way.</strong><small>Explore destinations and use sample price calendars to find dates worth comparing.</small></span><Link to="/explore">Open Explore</Link></div>
              </>
            )}

            {activeTab === 'saved' && (
              <>
                <div className="account-content-heading"><div><span className="eyebrow">YOUR SHORTLIST</span><h2>Saved flights</h2><p>Flights you bookmarked while comparing options.</p></div></div>
                <div className="account-panel">
                  {savedFlights.length === 0 ? <div className="account-empty"><Heart size={24} /><strong>Your saved list is empty</strong><p>Browse flights and tap the heart to keep an option here.</p><Link to="/">Find flights</Link></div> : savedFlights.map((flight) => <SavedFlightRow key={flight.id} flight={flight} onRemove={removeSavedFlight} />)}
                </div>
              </>
            )}

            {activeTab === 'trips' && (
              <>
                <div className="account-content-heading"><div><span className="eyebrow">YOUR JOURNEYS</span><h2>My trips</h2><p>Booking history and upcoming journeys will live here.</p></div></div>
                <div className="account-panel">
                  <div className="account-empty trip-empty"><CalendarDays size={25} /><strong>No booked trips yet</strong><p>FlyScanner currently provides sample flight search and comparison. Bookings are not connected in this demo, so no tickets or confirmed reservations appear here.</p><Link to="/">Compare flights <ArrowRight size={15} /></Link></div>
                </div>
              </>
            )}

            {activeTab === 'alerts' && (
              <>
                <div className="account-content-heading"><div><span className="eyebrow">KEEP AN EYE ON FARES</span><h2>Price alerts</h2><p>Create a local demo alert for a route and target price.</p></div></div>
                <div className="account-panel alert-create-panel">
                  <h3><Plus size={17} /> Create a price alert</h3>
                  <form className="alert-form" onSubmit={submitAlert}>
                    <label>From<select value={origin} onChange={(event) => setOrigin(event.target.value)}>{AIRPORT_OPTIONS.map((airport) => <option key={airport.code} value={airport.code}>{airport.city} ({airport.code})</option>)}</select></label>
                    <label>To<select value={destination} onChange={(event) => setDestination(event.target.value)}>{AIRPORT_OPTIONS.map((airport) => <option key={airport.code} value={airport.code}>{airport.city} ({airport.code})</option>)}</select></label>
                    <label>Target fare (INR)<input type="number" min="1000" step="500" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} /></label>
                    <button className="account-primary-button" type="submit">Create alert <ArrowRight size={15} /></button>
                  </form>
                  {error && <p className="account-form-error" role="alert">{error}</p>}
                </div>
                <div className="account-panel">
                  <div className="account-panel-heading"><div><h3>Your active alerts</h3><p>Stored in this browser for the demo.</p></div><span className="account-count">{alerts.length}</span></div>
                  {alerts.length === 0 ? <div className="account-empty compact"><Bell size={22} /><strong>No alerts created</strong><p>Create an alert above to keep a target fare in your list.</p></div> : alerts.map((alert) => <PriceAlertRow key={alert.id} alert={alert} onDelete={deleteAlert} />)}
                </div>
              </>
            )}

            {activeTab === 'profile' && (
              <>
                <div className="account-content-heading"><div><span className="eyebrow">ACCOUNT DETAILS</span><h2>Profile</h2><p>Manage the details displayed in this browser demo.</p></div></div>
                <div className="account-panel profile-panel">
                  <form className="profile-form" onSubmit={saveProfile}>
                    <label>Full name<input type="text" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} /></label>
                    <label>Email address<input type="email" value={user.email} disabled /></label>
                    <div className="profile-meta"><span>Account created</span><strong>{dateLabel(user.createdAt.slice(0, 10))}</strong></div>
                    <button className="account-primary-button" type="submit">Save changes <Check size={15} /></button>
                  </form>
                  {error && <p className="account-form-error" role="alert">{error}</p>}
                </div>
                <div className="account-privacy-note"><ShieldCheck size={17} /><span><strong>Local demo profile</strong><small>This profile is stored in browser local storage only. Secure authentication and server-side account storage are not connected yet.</small></span></div>
              </>
            )}
          </section>
        </div>
      </main>
      <footer className="explore-footer"><span>© 2026 FlyScanner</span><span>Your travel space</span><Link to="/">Back to flight search</Link></footer>
      <div className={notice ? 'toast visible' : 'toast'} role="status" aria-live="polite"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>
    </div>
  );
}

function SavedFlightRow({ flight, onRemove }: { flight: SavedFlight; onRemove: (id: number) => void }) {
  return (
    <div className="saved-flight-row">
      <div className="saved-flight-airline"><span className="airline-logo">{flight.airlineCode}</span><span><strong>{flight.airline}</strong><small>{flight.code}</small></span></div>
      <div className="saved-flight-route"><strong>{flight.from} <span>→</span> {flight.to}</strong><small>{flight.depart} – {flight.arrive} · {flight.duration} · {flight.stops === 0 ? 'Non-stop' : flight.stops + ' stop'}</small></div>
      <div className="saved-flight-price"><strong>{money(flight.price)}</strong><small>sample fare</small></div>
      <button type="button" className="saved-flight-remove" onClick={() => onRemove(flight.id)} aria-label={'Remove ' + flight.code + ' from saved flights'}><Trash2 size={16} /></button>
    </div>
  );
}

function PriceAlertRow({ alert, onDelete }: { alert: PriceAlert; onDelete: (id: string) => void }) {
  return (
    <div className="price-alert-row">
      <div className="price-alert-route"><span className="popular-route-icon"><Bell size={16} /></span><span><strong>{routeName(alert.origin)} → {routeName(alert.destination)}</strong><small>Created {dateLabel(alert.createdAt.slice(0, 10))} · Local demo alert</small></span></div>
      <div className="price-alert-target"><small>Target fare</small><strong>{money(alert.targetPrice)}</strong></div>
      <button type="button" className="saved-flight-remove" onClick={() => onDelete(alert.id)} aria-label="Delete price alert"><Trash2 size={16} /></button>
    </div>
  );
}

function SparklesIcon() {
  return <span className="account-tip-icon"><Check size={17} /></span>;
}
