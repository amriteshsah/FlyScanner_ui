import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Bell, CalendarDays, Check, ChevronRight, Heart, LogOut,
  Plane, Plus, ShieldCheck, Trash2, UserRound, Wallet,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import SiteHeader from '../../../components/layout/SiteHeader';
import {
  type UserProfile,
  type UpdateProfilePayload,
  type SavedFlightRecord,
  type PriceAlertRecord,
  getCachedProfile,
  getProfile,
  getSavedFlightsFromApi,
  removeSavedFlightFromApi,
  getPriceAlertsFromApi,
  createPriceAlertInApi,
  deactivatePriceAlertInApi,
  logout,
  updateProfile,
} from '../services/authApi';

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

export default function AccountDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = TABS.some((tab) => tab.id === requestedTab) ? requestedTab! : 'overview';
  const [user, setUser] = useState<UserProfile | null>(() => getCachedProfile());
  const [savedFlights, setSavedFlights] = useState<SavedFlightRecord[]>([]);
  const [alerts, setAlerts] = useState<PriceAlertRecord[]>([]);
  const [name, setName] = useState(user?.fullName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ?? '');
  const [nationality, setNationality] = useState(user?.nationality ?? '');
  const [homeAirport, setHomeAirport] = useState(user?.homeAirport ?? '');
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferredCurrency ?? 'INR');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [origin, setOrigin] = useState('BLR');
  const [destination, setDestination] = useState('DXB');
  const [targetPrice, setTargetPrice] = useState('12000');
  const [tripType, setTripType] = useState<'ONE_WAY' | 'ROUND_TRIP'>('ONE_WAY');
  const [departureDate, setDepartureDate] = useState(() => dateAfter(14));
  const [returnDate, setReturnDate] = useState(() => dateAfter(20));
  const [savingAlert, setSavingAlert] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getSavedFlightsFromApi()
      .then((items) => { if (active) setSavedFlights(items); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load saved flights.'); });
    getPriceAlertsFromApi()
      .then((items) => { if (active) setAlerts(items); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load price alerts.'); });

    getProfile()
      .then((profile) => {
        if (!active) return;
        setUser(profile);
        setShowOnboarding(!profile.profileCompleted);
        setName(profile.fullName);
        setPhoneNumber(profile.phoneNumber ?? '');
        setDateOfBirth(profile.dateOfBirth ?? '');
        setNationality(profile.nationality ?? '');
        setHomeAirport(profile.homeAirport ?? '');
        setPreferredCurrency(profile.preferredCurrency ?? 'INR');
      })
      .catch(() => {
        if (active) navigate('/login?next=%2Faccount', { replace: true });
      });
    return () => { active = false; };
  }, [navigate]);

  const greetingName = useMemo(() => user?.fullName.split(' ')[0] ?? 'traveller', [user]);

  function selectTab(tab: Tab) {
    setSearchParams(tab === 'overview' ? {} : { tab });
  }

  async function signOut() {
    try {
      await logout();
    } catch {
      setNotice('Your browser session has been cleared. The server session will expire automatically.');
    } finally {
      setUser(null);
      navigate('/', { replace: true });
    }
  }

  async function submitAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (origin === destination) {
      setError('Choose two different airports for your alert.');
      return;
    }
    if (!departureDate || departureDate < dateAfter(0)) {
      setError('Choose a departure date today or later.');
      return;
    }
    if (tripType === 'ROUND_TRIP' && (!returnDate || returnDate < departureDate)) {
      setError('Return date must be on or after departure.');
      return;
    }
    const price = Number(targetPrice);
    if (!Number.isFinite(price) || price < 1000) {
      setError('Enter a target fare of at least ₹1,000.');
      return;
    }

    setSavingAlert(true);
    try {
      const created = await createPriceAlertInApi({
        origin,
        destination,
        tripType,
        departureDate,
        returnDate: tripType === 'ROUND_TRIP' ? returnDate : null,
        targetPrice: price,
        currency: 'INR',
        market: 'IN',
      });
      setAlerts((current) => [created, ...current]);
      setNotice('Price alert saved to your FlyScanner account.');
      selectTab('alerts');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create the price alert.');
    } finally {
      setSavingAlert(false);
    }
  }

  async function deleteAlert(id: string) {
    try {
      await deactivatePriceAlertInApi(id);
      setAlerts((current) => current.map((alert) => alert.id === id ? { ...alert, active: false } : alert));
      setNotice('Price alert deactivated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to deactivate this price alert.');
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (name.trim().length === 1) {
      setError('Enter at least two characters for your name, or leave it blank.');
      return;
    }

    const payload: UpdateProfilePayload = {
      fullName: name.trim() || null,
      phoneNumber: phoneNumber.trim() || null,
      dateOfBirth: dateOfBirth || null,
      nationality: nationality.trim().toUpperCase() || null,
      homeAirport: homeAirport.trim().toUpperCase() || null,
      preferredCurrency: preferredCurrency.trim().toUpperCase() || null,
    };

    setSavingProfile(true);
    try {
      const updated = await updateProfile(payload);
      setUser(updated);
      setShowOnboarding(false);
      setName(updated.fullName);
      setPhoneNumber(updated.phoneNumber ?? '');
      setDateOfBirth(updated.dateOfBirth ?? '');
      setNationality(updated.nationality ?? '');
      setHomeAirport(updated.homeAirport ?? '');
      setPreferredCurrency(updated.preferredCurrency ?? 'INR');
      setNotice('Your profile has been saved to your FlyScanner account.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update your profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function skipProfileOnboarding() {
    setError('');
    setSavingProfile(true);
    try {
      const updated = await updateProfile({});
      setUser(updated);
      setShowOnboarding(false);
      setNotice('You can update your traveler profile at any time.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to continue without profile details.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function removeSavedFlight(id: string) {
    try {
      await removeSavedFlightFromApi(id);
      setSavedFlights((current) => current.filter((flight) => flight.id !== id));
      setNotice('Flight removed from your saved items.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to remove this saved flight.');
    }
  }

  if (!user) {
    return <main className="account-redirect"><span className="loading-spinner" /> Opening sign in…</main>;
  }

  return (
    <div className="page-shell account-page">
      <SiteHeader onAction={setNotice} />
      {showOnboarding && (
        <div className="profile-onboarding-backdrop">
          <section className="profile-onboarding-card" role="dialog" aria-modal="true" aria-labelledby="profile-onboarding-title">
            <span className="eyebrow">WELCOME TO FLYSCANNER</span>
            <h2 id="profile-onboarding-title">Complete your profile</h2>
            <p>Add a few optional details to make your travel experience more personal. You can add or change these later.</p>
            <form className="profile-onboarding-form" onSubmit={saveProfile}>
              <label>Full name (optional)
                <input type="text" autoComplete="name" maxLength={200}
                  value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label>Mobile number (optional)
                <input type="tel" autoComplete="tel" maxLength={25}
                  pattern="^\\+?[0-9 ()-]{7,20}$" placeholder="+91 98765 43210"
                  value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
              </label>
              <label>Date of birth (optional)
                <input type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)}
                  value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
              </label>
              <div className="profile-onboarding-actions">
                <button className="account-primary-button" type="submit" disabled={savingProfile}>
                  {savingProfile ? 'Saving…' : 'Save & Continue'} {!savingProfile && <Check size={15} />}
                </button>
                <button className="profile-onboarding-skip" type="button" disabled={savingProfile}
                  onClick={() => void skipProfileOnboarding()}>Skip for now</button>
              </div>
            </form>
            {error && <p className="account-form-error" role="alert">{error}</p>}
            <small>You can update your traveler details later from Profile.</small>
          </section>
        </div>
      )}
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
              <div className="account-avatar">{user.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
              <strong>{user.fullName}</strong>
              <small>{user.email}</small>
              <span className="account-demo-pill"><ShieldCheck size={12} /> {user.role} account</span>
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
                  <button type="button" onClick={() => selectTab('alerts')} className="account-stat-card"><span><Bell size={18} /></span><strong>{alerts.filter((alert) => alert.active).length}</strong><small>Price alerts</small></button>
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
                <div className="account-content-heading"><div><span className="eyebrow">KEEP AN EYE ON FARES</span><h2>Price alerts</h2><p>Save route and target-fare alerts to your account.</p></div></div>
                <div className="account-panel alert-create-panel">
                  <h3><Plus size={17} /> Create a price alert</h3>
                  <form className="alert-form" onSubmit={submitAlert}>
                    <label>From<select value={origin} onChange={(event) => setOrigin(event.target.value)}>{AIRPORT_OPTIONS.map((airport) => <option key={airport.code} value={airport.code}>{airport.city} ({airport.code})</option>)}</select></label>
                    <label>To<select value={destination} onChange={(event) => setDestination(event.target.value)}>{AIRPORT_OPTIONS.map((airport) => <option key={airport.code} value={airport.code}>{airport.city} ({airport.code})</option>)}</select></label>
                    <label>Trip type<select value={tripType} onChange={(event) => setTripType(event.target.value as 'ONE_WAY' | 'ROUND_TRIP')}><option value="ONE_WAY">One way</option><option value="ROUND_TRIP">Round trip</option></select></label>
                    <label>Departure date<input type="date" min={dateAfter(0)} value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} required /></label>
                    {tripType === 'ROUND_TRIP' && <label>Return date<input type="date" min={departureDate} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required /></label>}
                    <label>Target fare (INR)<input type="number" min="1000" step="500" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} /></label>
                    <button className="account-primary-button" type="submit" disabled={savingAlert}>{savingAlert ? 'Saving alert…' : 'Create alert'} {!savingAlert && <ArrowRight size={15} />}</button>
                  </form>
                  {error && <p className="account-form-error" role="alert">{error}</p>}
                </div>
                <div className="account-panel">
                  <div className="account-panel-heading"><div><h3>Your active alerts</h3><p>Saved against your signed-in account.</p></div><span className="account-count">{alerts.filter((alert) => alert.active).length}</span></div>
                  {alerts.filter((alert) => alert.active).length === 0 ? <div className="account-empty compact"><Bell size={22} /><strong>No active alerts</strong><p>Create an alert above to save a route and target fare.</p></div> : alerts.filter((alert) => alert.active).map((alert) => <PriceAlertRow key={alert.id} alert={alert} onDelete={deleteAlert} />)}
                </div>
              </>
            )}

            {activeTab === 'profile' && (
              <>
                <div className="account-content-heading"><div><span className="eyebrow">ACCOUNT DETAILS</span><h2>Profile</h2><p>Manage the details stored securely in your FlyScanner account.</p></div></div>
                <div className="account-panel profile-panel">
                  <form className="profile-form" onSubmit={saveProfile}>
                    <div className="profile-fields-grid">
                      <label>Full name
                        <input type="text" autoComplete="name" maxLength={200}
                          value={name} onChange={(event) => setName(event.target.value)} />
                      </label>
                      <label>Email address
                        <input type="email" autoComplete="email" value={user.email} disabled />
                      </label>
                      <label>Mobile number
                        <input type="tel" autoComplete="tel" maxLength={25}
                          pattern="^\+?[0-9 ()-]{7,20}$"
                          placeholder="+91 98765 43210"
                          value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
                      </label>
                      <label>Date of birth
                        <input type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)}
                          value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
                      </label>
                      <label>Nationality (2-letter country code)
                        <input type="text" autoComplete="country" maxLength={2} pattern="[A-Za-z]{2}"
                          placeholder="IN" value={nationality}
                          onChange={(event) => setNationality(event.target.value.toUpperCase())} />
                      </label>
                      <label>Home airport (IATA code)
                        <input type="text" maxLength={3} pattern="[A-Za-z]{3}" placeholder="BLR"
                          value={homeAirport}
                          onChange={(event) => setHomeAirport(event.target.value.toUpperCase())} />
                      </label>
                      <label>Preferred currency
                        <input type="text" maxLength={3} pattern="[A-Za-z]{3}" placeholder="INR"
                          value={preferredCurrency}
                          onChange={(event) => setPreferredCurrency(event.target.value.toUpperCase())} />
                      </label>
                    </div>
                    <div className="profile-meta"><span>Account created</span><strong>{dateLabel(user.createdAt.slice(0, 10))}</strong></div>
                    <button className="account-primary-button" type="submit" disabled={savingProfile}>
                      {savingProfile ? 'Saving profile…' : 'Save changes'} {!savingProfile && <Check size={15} />}
                    </button>
                  </form>
                  {error && <p className="account-form-error" role="alert">{error}</p>}
                </div>
                <div className="account-privacy-note"><ShieldCheck size={17} /><span><strong>Private traveler profile</strong><small>Your traveler details are saved against your signed-in account. Your email and account role are managed by the server and cannot be changed from this form.</small></span></div>
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

function SavedFlightRow({ flight, onRemove }: { flight: SavedFlightRecord; onRemove: (id: string) => void }) {
  return (
    <div className="saved-flight-row">
      <div className="saved-flight-airline"><span className="airline-logo">{flight.airlineCode}</span><span><strong>{flight.airline}</strong><small>{flight.code}</small></span></div>
      <div className="saved-flight-route"><strong>{routeName(flight.from)} <span>→</span> {routeName(flight.to)}</strong><small>{flight.depart} – {flight.arrive} · {flight.duration} · {flight.stops === 0 ? 'Non-stop' : flight.stops + ' stop'} · {flight.fareType === 'ROUND_TRIP' ? 'Round trip' : 'One way'}</small></div>
      <div className="saved-flight-price"><strong>{money(flight.price)}</strong><small>saved fare snapshot</small></div>
      <button type="button" className="saved-flight-remove" onClick={() => void onRemove(flight.id)} aria-label={'Remove ' + flight.code + ' from saved flights'}><Trash2 size={16} /></button>
    </div>
  );
}

function PriceAlertRow({ alert, onDelete }: { alert: PriceAlertRecord; onDelete: (id: string) => void }) {
  return (
    <div className="price-alert-row">
      <div className="price-alert-route"><span className="popular-route-icon"><Bell size={16} /></span><span><strong>{routeName(alert.origin)} → {routeName(alert.destination)}</strong><small>{alert.tripType === 'ROUND_TRIP' ? 'Round trip' : 'One way'} · Depart {dateLabel(alert.departureDate)}{alert.returnDate ? ' · Return ' + dateLabel(alert.returnDate) : ''} · Created {dateLabel(alert.createdAt.slice(0, 10))}</small></span></div>
      <div className="price-alert-target"><small>Target fare</small><strong>{money(alert.targetPrice)}</strong></div>
      <button type="button" className="saved-flight-remove" onClick={() => onDelete(alert.id)} aria-label="Deactivate price alert"><Trash2 size={16} /></button>
    </div>
  );
}

function SparklesIcon() {
  return <span className="account-tip-icon"><Check size={17} /></span>;
}
