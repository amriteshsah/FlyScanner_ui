import {
  type FlightResult,
  type FlightSearchParams,
  searchFlightOffers,
} from './mockFlightApi';

type BackendSegment = {
  origin: string;
  destination: string;
  carrierCode: string;
  flightNumber: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
};

type BackendJourney = {
  legNumber: number;
  origin: string;
  destination: string;
  departureDate: string;
  segments: BackendSegment[];
  durationMinutes: number;
  stopCount: number;
};

type BackendOffer = {
  offerToken: string;
  providerCode: string;
  price: { amount: string | number; currency: string };
  itinerary: BackendJourney[];
  stops: number;
  totalDurationMinutes: number;
  checkedAt: string;
  expiresAt: string | null;
  affiliateRedirectAvailable: boolean;
};

type BackendSearchResponse = {
  searchId: string;
  generatedAt: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'NO_RESULTS' | 'UNAVAILABLE';
  providerStatuses: Array<{
    providerCode: string;
    status: 'SUCCESS' | 'NO_RESULTS' | 'TIMEOUT' | 'ERROR';
    latencyMs: number;
    message: string;
  }>;
  offers: BackendOffer[];
  disclaimer: string;
};

export type FlightJourneyView = {
  legNumber: number;
  origin: string;
  destination: string;
  departureDate: string;
  depart: string;
  arrive: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  stopDetail?: string;
};

export type FlightSearchSource = 'backend' | 'mock';

export type FlightSearchResultSet = {
  offers: FlightResult[];
  status: BackendSearchResponse['status'];
  providerStatuses: BackendSearchResponse['providerStatuses'];
  disclaimer: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

function formatTime(instant: string): string {
  const parsed = new Date(instant);
  if (Number.isNaN(parsed.getTime())) return '--:--';
  return parsed.toISOString().slice(11, 16);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? hours + 'h ' + remainingMinutes + 'm' : remainingMinutes + 'm';
}

function mapJourney(journey: BackendJourney): FlightJourneyView {
  const firstSegment = journey.segments[0];
  const lastSegment = journey.segments[journey.segments.length - 1];
  const connectionPoints = journey.segments.slice(0, -1).map((segment) => segment.destination);

  return {
    legNumber: journey.legNumber,
    origin: journey.origin,
    destination: journey.destination,
    departureDate: journey.departureDate,
    depart: firstSegment ? formatTime(firstSegment.departureAt) : '--:--',
    arrive: lastSegment ? formatTime(lastSegment.arrivalAt) : '--:--',
    duration: formatDuration(journey.durationMinutes),
    durationMinutes: journey.durationMinutes,
    stops: journey.stopCount,
    stopDetail: connectionPoints.length > 0 ? connectionPoints.join(' · ') : undefined,
  };
}

function mapOffer(offer: BackendOffer, index: number, params: FlightSearchParams): FlightResult {
  const journeys = offer.itinerary.map(mapJourney);
  const outbound = journeys[0];
  const firstSegment = offer.itinerary[0]?.segments[0];
  const amount = Number(offer.price.amount);

  if (!outbound || !firstSegment || !Number.isFinite(amount)) {
    throw new Error('The backend returned a flight offer with incomplete itinerary or price data.');
  }

  return {
    // IDs are positional because the details page repeats the same deterministic mock search.
    // Real supplier offers will use a dedicated short-lived offer lookup endpoint.
    id: index + 1,
    airline: 'Carrier ' + firstSegment.carrierCode,
    airlineCode: firstSegment.carrierCode,
    code: firstSegment.flightNumber,
    from: outbound.origin,
    to: outbound.destination,
    depart: outbound.depart,
    arrive: outbound.arrive,
    duration: outbound.duration,
    durationMinutes: outbound.durationMinutes,
    stops: outbound.stops,
    stopDetail: outbound.stopDetail,
    price: amount,
    outboundFare: amount,
    returnFare: 0,
    baggage: 'Not supplied by search response',
    seatsRemaining: 0,
    provider: offer.providerCode,
    carbonIndex: 'Not supplied',
    fareType: params.returnDate ? 'ROUND_TRIP' : 'ONE_WAY',
    label: index === 0 ? 'Lowest shown price' : undefined,
    source: 'BACKEND',
    offerToken: offer.offerToken,
    checkedAt: offer.checkedAt,
    expiresAt: offer.expiresAt ?? undefined,
    affiliateRedirectAvailable: offer.affiliateRedirectAvailable,
    journeys,
  };
}

function mapBackendResponse(response: BackendSearchResponse, params: FlightSearchParams): FlightSearchResultSet {
  return {
    offers: response.offers.map((offer, index) => mapOffer(offer, index, params)),
    status: response.status,
    providerStatuses: response.providerStatuses,
    disclaimer: response.disclaimer,
  };
}

export function getFlightSearchSource(searchParams: URLSearchParams): FlightSearchSource {
  const requestedSource = searchParams.get('source');
  if (requestedSource === 'backend') return 'backend';
  if (requestedSource === 'mock') return 'mock';
  return import.meta.env.VITE_FLIGHT_SEARCH_MODE === 'mock' ? 'mock' : 'backend';
}

export async function searchFlightResults(
  params: FlightSearchParams,
  signal?: AbortSignal,
  source: FlightSearchSource = 'backend',
): Promise<FlightSearchResultSet> {
  if (source === 'mock') {
    const offers = await searchFlightOffers(params, signal);
    return {
      offers,
      status: 'SUCCESS',
      providerStatuses: [{
        providerCode: 'LOCAL_MOCK',
        status: offers.length > 0 ? 'SUCCESS' : 'NO_RESULTS',
        latencyMs: 0,
        message: 'Local static demo data.',
      }],
      disclaimer: 'Demo prices and seat counts are fictional test data and are not live or bookable.',
    };
  }

  const legs = [{
    origin: params.originCode,
    destination: params.destinationCode,
    departureDate: params.departureDate,
  }];

  if (params.returnDate) {
    legs.push({
      origin: params.destinationCode,
      destination: params.originCode,
      departureDate: params.returnDate,
    });
  }

  let response: Response;
  try {
    response = await fetch(API_BASE_URL + '/api/v1/searches', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripType: params.returnDate ? 'ROUND_TRIP' : 'ONE_WAY',
        legs,
        passengers: {
          adults: params.adults,
          childrenAges: [],
          infants: 0,
        },
        cabinClass: params.cabinClass,
        currency: 'INR',
        market: 'IN',
        locale: 'en-IN',
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error('Unable to reach FlyScanner backend. Check that the Java API is running and try again.');
  }

  const payload = await response.json().catch(() => null) as
    | (BackendSearchResponse & { detail?: string; title?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.title || 'Flight search failed (' + response.status + '). Please try again.');
  }

  if (!payload || !Array.isArray(payload.offers) || !Array.isArray(payload.providerStatuses)) {
    throw new Error('FlyScanner backend returned an unexpected search response.');
  }

  return mapBackendResponse(payload, params);
}
