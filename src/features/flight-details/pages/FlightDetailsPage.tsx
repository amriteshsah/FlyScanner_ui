import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Clock3, Luggage, MapPin, Plane, ShieldCheck, Users } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';
import SiteHeader from '../../../components/layout/SiteHeader';
import { type Airport, type FlightResult, getAirportCatalog, searchFlightOffers } from '../../flight-search/services/mockFlightApi';
import { cabinLabel, createFlightSearchQuery, formatTravelDate, parseFlightSearchParams } from '../../flight-search/utils/searchQuery';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function FlightDetailsPage() {
  const { offerId } = useParams();
  const [searchParams] = useSearchParams();
  const queryKey = searchParams.toString();
  const criteria = useMemo(() => parseFlightSearchParams(new URLSearchParams(queryKey)), [queryKey]);
  const [flight, setFlight] = useState<FlightResult | null>(null);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    if (!criteria) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    searchFlightOffers(criteria, controller.signal)
      .then((offers) => setFlight(offers.find((item) => String(item.id) === offerId) ?? null))
      .then(() => getAirportCatalog(controller.signal).then(setAirports))
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== 'AbortError') {
          setNotice('Could not load this sample offer. Please return to the results.');
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [queryKey, offerId]);

  const origin = airports.find((airport) => airport.code === criteria?.originCode);
  const destination = airports.find((airport) => airport.code === criteria?.destinationCode);
  const resultQuery = criteria ? createFlightSearchQuery(criteria) : '';

  return (
    <div className="page-shell detail-page-shell">
      <SiteHeader onAction={setNotice} />
      <main className="detail-page-main">
        <Link className="back-link" to={criteria ? '/flights/search?' + resultQuery : '/'}><ArrowLeft size={16} /> Back to flight results</Link>

        {loading && <div className="loading-state" role="status"><span className="loading-spinner" /> Loading flight details…</div>}
        {!loading && !flight && (
          <div className="empty-state detail-empty">
            <h1>Flight offer not found</h1>
            <p>This sample offer may no longer match the search details in the link.</p>
            <Link to={criteria ? '/flights/search?' + resultQuery : '/'}>Return to flight results</Link>
          </div>
        )}

        {!loading && flight && criteria && (
          <>
            <section className="detail-heading">
              <div>
                <div className="eyebrow">FLIGHT DETAILS</div>
                <h1>{origin?.city ?? flight.from} <span>→</span> {destination?.city ?? flight.to}</h1>
                <p>{formatTravelDate(criteria.departureDate)}{criteria.returnDate ? ' · Return ' + formatTravelDate(criteria.returnDate) : ' · One way'} · {criteria.adults} {criteria.adults === 1 ? 'traveller' : 'travellers'} · {cabinLabel(criteria.cabinClass)}</p>
              </div>
              <span className="detail-demo-tag"><ShieldCheck size={15} /> Sample offer</span>
            </section>

            <div className="detail-layout">
              <section className="detail-main-column">
                <article className="detail-card">
                  <div className="detail-card-heading"><div><span className="eyebrow">YOUR OUTBOUND JOURNEY</span><h2>Flight itinerary</h2></div><span className="detail-date">{formatTravelDate(criteria.departureDate)}</span></div>
                  <div className="detail-airline">
                    <div className="airline-logo detail-airline-logo">{flight.airlineCode}</div>
                    <div><strong>{flight.airline}</strong><small>{flight.code} · {cabinLabel(criteria.cabinClass)}</small></div>
                    <span className="detail-fare-type">{flight.fareType === 'ROUND_TRIP' ? 'Round trip estimate' : 'One way'}</span>
                  </div>
                  <div className="detail-itinerary">
                    <div className="detail-time-block"><strong>{flight.depart}</strong><span>{origin?.city ?? flight.from} ({flight.from})</span><small>{origin?.airportName ?? 'Departure airport'}</small></div>
                    <div className="detail-timeline"><span className="timeline-dot" /><div className="timeline-line" /><Plane size={17} /><small><Clock3 size={13} /> {flight.duration}</small><span className="timeline-dot timeline-dot-end" /></div>
                    <div className="detail-time-block detail-arrival"><strong>{flight.arrive}</strong><span>{destination?.city ?? flight.to} ({flight.to})</span><small>{destination?.airportName ?? 'Arrival airport'}</small></div>
                  </div>
                  <div className="detail-stop-info">{flight.stops === 0 ? <Check size={15} /> : <MapPin size={15} />}{flight.stops === 0 ? 'Non-stop flight' : flight.stopDetail ?? flight.stops + ' stop'} <span>·</span> {flight.duration}</div>
                </article>

                <article className="detail-card">
                  <div className="detail-card-heading"><div><span className="eyebrow">WHAT'S INCLUDED</span><h2>Baggage & passenger details</h2></div></div>
                  <div className="detail-inclusions">
                    <div><Luggage size={19} /><span><strong>Checked baggage</strong><small>{flight.baggage} per traveller · demo allowance</small></span></div>
                    <div><BriefcaseBusiness size={19} /><span><strong>Cabin baggage</strong><small>One cabin bag · confirm with provider</small></span></div>
                    <div><Users size={19} /><span><strong>Passengers</strong><small>{criteria.adults} adult {criteria.adults === 1 ? 'traveller' : 'travellers'}</small></span></div>
                  </div>
                </article>

                {criteria.returnDate && (
                  <article className="detail-card return-estimate-card">
                    <div className="detail-card-heading"><div><span className="eyebrow">RETURN JOURNEY</span><h2>Return fare estimate</h2></div><span className="detail-date">{formatTravelDate(criteria.returnDate)}</span></div>
                    <p>The local mock dataset provides a return fare estimate, but does not include a separate return-flight itinerary. The live supplier response will supply both journey segments.</p>
                  </article>
                )}
              </section>

              <aside className="detail-price-column">
                <article className="detail-price-card">
                  <span className="eyebrow">PRICE SUMMARY</span>
                  <h2>{money(flight.price)}</h2>
                  <p>Total sample fare for {criteria.adults} {criteria.adults === 1 ? 'traveller' : 'travellers'}</p>
                  <div className="price-breakdown">
                    <div><span>Outbound sample fare</span><strong>{money(flight.outboundFare)}</strong></div>
                    {criteria.returnDate && <div><span>Return sample estimate</span><strong>{money(flight.returnFare)}</strong></div>}
                    <div className="price-total"><span>Estimated total</span><strong>{money(flight.price)}</strong></div>
                  </div>
                  <button className="provider-button" type="button" onClick={() => setNotice('This is a demo offer. Live supplier validation and booking links will be added when the backend is connected.')}>Continue to provider <ArrowRight size={18} /></button>
                  <small className="price-note">No booking is made in this demo.</small>
                </article>
                <div className="detail-security-note"><ShieldCheck size={17} /><span><strong>Compare with confidence</strong><small>Always recheck the final fare, baggage and rules with the airline or travel provider.</small></span></div>
              </aside>
            </div>
          </>
        )}
      </main>
      {flight && !loading && <div className="mobile-provider-bar"><div><small>Estimated total</small><strong>{money(flight.price)}</strong></div><button type="button" onClick={() => setNotice('Demo only — no live provider booking link is connected.')}>Continue <ArrowRight size={17} /></button></div>}
      <div className={notice ? 'toast visible' : 'toast'} role="status" aria-live="polite"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>
    </div>
  );
}
