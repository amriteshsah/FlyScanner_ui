import { useMemo, useState } from 'react';
import {
  ArrowDownUp, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown,
  Clock3, Compass, Globe2, Heart, Luggage, MapPin, Menu, Plane, Plus, Search,
  ShieldCheck, SlidersHorizontal, Sparkles, Users, X
} from 'lucide-react';

type TripType = 'Round trip' | 'One way';
type Flight = {
  id: number; airline: string; code: string; logo: string; from: string; to: string;
  depart: string; arrive: string; duration: string; stops: string; stopDetail?: string;
  price: number; tag?: string; carbon?: string;
};

const flights: Flight[] = [
  { id: 1, airline: 'IndiGo', code: '6E 1421', logo: '6E', from: 'BLR', to: 'DXB', depart: '06:20', arrive: '09:10', duration: '4h 20m', stops: 'Non-stop', price: 12480, tag: 'Best price', carbon: 'Lowest CO₂' },
  { id: 2, airline: 'Air India Express', code: 'IX 839', logo: 'IX', from: 'BLR', to: 'DXB', depart: '08:45', arrive: '11:35', duration: '4h 20m', stops: 'Non-stop', price: 13890 },
  { id: 3, airline: 'Emirates', code: 'EK 569', logo: 'EK', from: 'BLR', to: 'DXB', depart: '04:30', arrive: '07:15', duration: '4h 15m', stops: 'Non-stop', price: 22450, tag: 'Top airline' },
  { id: 4, airline: 'Air India', code: 'AI 808', logo: 'AI', from: 'BLR', to: 'DXB', depart: '21:10', arrive: '06:45', duration: '9h 05m', stops: '1 stop', stopDetail: 'Mumbai · 2h 05m layover', price: 15920 },
];

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

function App() {
  const [trip, setTrip] = useState<TripType>('Round trip');
  const [from, setFrom] = useState('Bengaluru (BLR)');
  const [to, setTo] = useState('Dubai (DXB)');
  const [depart, setDepart] = useState('2026-12-12');
  const [returnDate, setReturnDate] = useState('2026-12-18');
  const [travellers, setTravellers] = useState(1);
  const [cabin, setCabin] = useState('Economy');
  const [showTravellers, setShowTravellers] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sort, setSort] = useState<'Recommended' | 'Cheapest' | 'Fastest'>('Recommended');
  const [nonstop, setNonstop] = useState(false);
  const [saved, setSaved] = useState<number[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);

  const results = useMemo(() => {
    let list = flights.filter(f => !nonstop || f.stops === 'Non-stop');
    if (sort === 'Cheapest') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'Fastest') list = [...list].sort((a, b) => a.duration.localeCompare(b.duration));
    return list;
  }, [sort, nonstop]);

  const swap = () => { setFrom(to); setTo(from); };
  const toggleSaved = (id: number) => setSaved(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="FlyScanner home"><span className="brand-mark"><Plane size={19} fill="currentColor" /></span><span>fly<span>scanner</span></span></a>
        <nav className={mobileMenu ? 'nav-links open' : 'nav-links'}>
          <a className="active" href="#flights">Flights</a><a href="#inspiration">Explore</a><a href="#deals">Price alerts</a>
        </nav>
        <div className="header-actions"><button className="icon-button notification" aria-label="Notifications"><Bell size={18}/><i /></button><button className="signin">Sign in <ArrowUpRight size={15}/></button><button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button></div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14}/> YOUR NEXT JOURNEY STARTS HERE</div>
            <h1>Go further.<br/><span>Spend smarter.</span></h1>
            <p>Compare flights from across the sky. Find a fare that feels right, and make more of every journey.</p>
            <div className="trust-row"><span><ShieldCheck size={15}/> Compare with confidence</span><span><Globe2 size={15}/> Worldwide destinations</span></div>
          </div>
          <div className="hero-art" aria-label="Illustration of a journey through the sky" role="img">
            <div className="sun-glow"/><div className="route route-one"/><div className="route route-two"/>
            <div className="cloud cloud-one"/><div className="cloud cloud-two"/>
            <div className="flight-stamp"><span>YOUR WORLD</span><strong>IS WAITING</strong><small>✦  DISCOVER MORE</small></div>
            <div className="plane-illustration"><Plane size={72} strokeWidth={1.2}/></div>
            <div className="art-caption"><span>01 —  THE JOURNEY</span><span>MADE FOR YOU</span></div>
          </div>
        </section>

        <section className="search-panel" aria-label="Flight search">
          <div className="search-top">
            <div className="trip-tabs">{(['Round trip', 'One way'] as TripType[]).map(t => <button key={t} onClick={() => setTrip(t)} className={trip === t ? 'selected' : ''}>{t}</button>)}</div>
            <div className="search-note"><span className="live-dot"/> Compare fares from trusted travel partners</div>
          </div>
          <form className="search-grid" onSubmit={e => { e.preventDefault(); setSearched(true); }}>
            <label className="field airport-field"><span>FROM</span><div><MapPin size={17}/><input aria-label="Departure airport" value={from} onChange={e => setFrom(e.target.value)} /></div><small>Departure city or airport</small></label>
            <button type="button" className="swap-button" onClick={swap} aria-label="Swap departure and destination"><ArrowDownUp size={17}/></button>
            <label className="field airport-field"><span>TO</span><div><MapPin size={17}/><input aria-label="Destination airport" value={to} onChange={e => setTo(e.target.value)} /></div><small>Where to?</small></label>
            <label className="field date-field"><span>DEPARTURE</span><div><CalendarDays size={17}/><input aria-label="Departure date" type="date" value={depart} onChange={e => setDepart(e.target.value)} /></div><small>Choose your date</small></label>
            {trip === 'Round trip' && <label className="field date-field return-field"><span>RETURN</span><div><CalendarDays size={17}/><input aria-label="Return date" type="date" min={depart} value={returnDate} onChange={e => setReturnDate(e.target.value)} /></div><small>When are you back?</small></label>}
            <div className="traveller-wrap">
              <button type="button" className="field traveller-field" onClick={() => setShowTravellers(!showTravellers)}><span>TRAVELLERS & CLASS</span><div><Users size={17}/><strong>{travellers} {travellers === 1 ? 'traveller' : 'travellers'}</strong><ChevronDown size={15}/></div><small>{cabin}</small></button>
              {showTravellers && <div className="traveller-popover"><div><div><b>Travellers</b><small>Age 12+</small></div><div className="counter"><button type="button" onClick={() => setTravellers(Math.max(1, travellers - 1))}>−</button><b>{travellers}</b><button type="button" onClick={() => setTravellers(Math.min(9, travellers + 1))}>+</button></div></div><label>Cabin class<select value={cabin} onChange={e => setCabin(e.target.value)}><option>Economy</option><option>Premium economy</option><option>Business</option><option>First class</option></select></label><button type="button" className="done-button" onClick={() => setShowTravellers(false)}>Done</button></div>}
            </div>
            <button className="search-button" type="submit"><Search size={18}/> Search flights <ArrowRight size={17}/></button>
          </form>
          <div className="panel-foot"><span><Check size={14}/> No booking fees from FlyScanner</span><span>Prices shown in INR (₹)</span></div>
        </section>

        <section className="results-section" id="flights">
          <div className="section-heading"><div><div className="eyebrow dark-eyebrow">A GOOD PLACE TO START</div><h2>{searched ? 'Your flight options' : 'Popular flights for you'}</h2><p>{searched ? `Showing available options for ${from} to ${to}` : 'A little inspiration for wherever you want to go next.'}</p></div><button className="text-link" onClick={() => setSearched(true)}>View all flights <ArrowRight size={16}/></button></div>
          <div className="results-layout">
            <aside className="filters">
              <div className="filter-heading"><SlidersHorizontal size={17}/><strong>Filters</strong><button onClick={() => setNonstop(false)}>Reset</button></div>
              <div className="filter-group"><h3>Stops</h3><label className="check-option"><input type="checkbox" checked={nonstop} onChange={e => setNonstop(e.target.checked)}/><span>Non-stop only</span><b>3</b></label><label className="check-option disabled"><input type="checkbox" disabled/><span>1 stop or more</span><b>1</b></label></div>
              <div className="filter-group"><h3>Price range</h3><div className="price-range"><div className="range-line"><i/></div><div><span>₹12,000</span><span>₹30,000+</span></div></div></div>
              <div className="filter-group"><h3>Airlines</h3>{['IndiGo','Air India Express','Emirates','Air India'].map((a, i) => <label className="check-option" key={a}><input type="checkbox"/><span>{a}</span><b>{[1,1,1,1][i]}</b></label>)}</div>
              <div className="filter-group"><h3>Departure time</h3><div className="time-options"><button>Morning</button><button>Afternoon</button><button>Evening</button><button>Night</button></div></div>
            </aside>

            <div className="flight-results">
              <div className="results-toolbar"><span><b>{results.length} flights</b> found <span className="muted">· Updated just now</span></span><div className="sort-control"><span>Sort by</span><select value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option>Recommended</option><option>Cheapest</option><option>Fastest</option></select></div></div>
              {results.map(f => <article className="flight-card" key={f.id}>
                <div className="flight-main"><div className="airline"><div className={`airline-logo logo-${f.id}`}>{f.logo}</div><div><strong>{f.airline}</strong><small>{f.code}</small></div></div><div className="journey"><div className="time-place"><strong>{f.depart}</strong><span>{f.from}</span></div><div className="journey-line"><small>{f.duration}</small><div><i/><span/><i/></div><small>{f.stops}</small>{f.stopDetail && <em>{f.stopDetail}</em>}</div><div className="time-place right"><strong>{f.arrive}</strong><span>{f.to}</span></div></div><div className="fare"><strong>{money(f.price)}</strong><small>per person</small><button onClick={() => window.alert(`You selected ${f.airline}. Supplier booking integration will be connected in a later release.`)}>View deal <ArrowUpRight size={15}/></button></div></div>
                {(f.tag || f.carbon) && <div className="flight-meta">{f.tag && <span className={f.tag === 'Best price' ? 'best-tag' : 'meta-tag'}>{f.tag === 'Best price' && <Sparkles size={12}/>} {f.tag}</span>}{f.carbon && <span className="carbon-tag"><Check size={12}/>{f.carbon}</span>}</div>}
                <button className={saved.includes(f.id) ? 'save-flight saved' : 'save-flight'} onClick={() => toggleSaved(f.id)} aria-label={saved.includes(f.id) ? 'Remove saved flight' : 'Save flight'}><Heart size={17} fill={saved.includes(f.id) ? 'currentColor' : 'none'}/></button>
              </article>)}
              {results.length === 0 && <div className="empty-state">No flights match these filters. Try resetting your stops filter.</div>}
              <div className="results-disclaimer"><ShieldCheck size={15}/> Prices are illustrative demo data, not live fares. Final prices and availability are confirmed by the travel provider.</div>
            </div>
          </div>
        </section>

        <section className="inspiration" id="inspiration"><div className="inspiration-copy"><span className="eyebrow">A WORLD OF POSSIBILITIES</span><h2>Somewhere new<br/>is closer than you think.</h2><p>Big adventures don't need big budgets. Start with a destination and see where the journey takes you.</p><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>Find your next flight <ArrowRight size={16}/></button></div><div className="destination-collage"><div className="destination-photo photo-one"><span>01 / COASTLINES</span><strong>Bali, Indonesia</strong></div><div className="destination-photo photo-two"><span>02 / CITY LIGHTS</span><strong>Tokyo, Japan</strong></div><div className="destination-photo photo-three"><span>03 / OPEN ROADS</span><strong>Swiss Alps</strong></div></div></section>
      </main>
      <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><Plane size={17} fill="currentColor"/></span><span>fly<span>scanner</span></span></a><span>Thoughtful travel starts with a better search.</span><span>© 2026 FlyScanner</span></footer>
    </div>
  );
}

export default App;