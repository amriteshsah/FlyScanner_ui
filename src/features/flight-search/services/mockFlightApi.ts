export type Airport = {
  code: string;
  city: string;
  country: string;
  airportName: string;
  timeZone: string;
};

export type FlightResult = {
  id: number;
  airline: string;
  airlineCode: string;
  code: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  stopDetail?: string;
  price: number;
  outboundFare: number;
  returnFare: number;
  label?: string;
  baggage: string;
  seatsRemaining: number;
  provider: string;
  carbonIndex: string;
  fareType: 'ONE_WAY' | 'ROUND_TRIP';
  source?: 'MOCK' | 'BACKEND';
  offerToken?: string;
  checkedAt?: string;
  expiresAt?: string;
  affiliateRedirectAvailable?: boolean;
  journeys?: Array<{
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
  }>;
};

export type FlightSearchParams = {
  originCode: string;
  destinationCode: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  cabinClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
};

type Airline = { code: string; name: string };
type RawOffer = {
  id: number;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  stopDetail: string | null;
  baseFare: number;
  returnFare: number;
  seatsRemaining: number;
  baggage: string;
  cabinClasses: string[];
  daysOfWeek: number[];
  provider: string;
  isFeatured: boolean;
  carbonIndex: string;
};

const DATA_ROOT = import.meta.env.BASE_URL + 'mock-data';
const cabinMultiplier: Record<FlightSearchParams['cabinClass'], number> = {
  ECONOMY: 1,
  PREMIUM_ECONOMY: 1.65,
  BUSINESS: 3.1,
  FIRST: 5.2,
};

async function readDataset<T>(fileName: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(DATA_ROOT + '/' + fileName, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error('Unable to load mock dataset "' + fileName + '" (' + response.status + ').');
  }
  return response.json() as Promise<T>;
}

function simulateNetworkDelay(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, 350);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('The search was cancelled.', 'AbortError'));
    }, { once: true });
  });
}

export async function getAirportCatalog(signal?: AbortSignal): Promise<Airport[]> {
  const data = await readDataset<{ items: Airport[] }>('airports.json', signal);
  return data.items;
}

export function resolveAirportCode(value: string, airports: Airport[]): string | undefined {
  const normalized = value.trim();
  const codeInParentheses = normalized.match(/\(([A-Za-z]{3})\)/)?.[1]?.toUpperCase();
  const directCode = normalized.match(/^[A-Za-z]{3}$/)?.[0]?.toUpperCase();
  const code = codeInParentheses ?? directCode;
  if (code && airports.some((airport) => airport.code === code)) return code;

  const match = airports.find((airport) =>
    airport.city.toLowerCase() === normalized.toLowerCase()
    || airport.airportName.toLowerCase() === normalized.toLowerCase()
    || (airport.city + ', ' + airport.country).toLowerCase() === normalized.toLowerCase()
  );
  return match?.code;
}

function dateFareFactor(date: string): number {
  const day = new Date(date + 'T12:00:00').getDay();
  return [1.035, 1, 1.015, 1.025, 1.04, 1.075, 1.06][day];
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? hours + 'h ' + remainingMinutes + 'm' : remainingMinutes + 'm';
}

function toFlightResult(offer: RawOffer, airline: Airline | undefined, params: FlightSearchParams): FlightResult {
  const multiplier = cabinMultiplier[params.cabinClass];
  const dayFactor = dateFareFactor(params.departureDate);
  const outboundFare = Math.round((offer.baseFare * multiplier * dayFactor) / 10) * 10;
  const roundTrip = Boolean(params.returnDate);
  const inboundFare = roundTrip
    ? Math.round((offer.returnFare * multiplier * dateFareFactor(params.returnDate!)) / 10) * 10
    : 0;
  const outboundTotal = outboundFare * params.adults;
  const returnTotal = inboundFare * params.adults;

  return {
    id: offer.id,
    airline: airline?.name ?? offer.airlineCode,
    airlineCode: offer.airlineCode,
    code: offer.flightNumber,
    from: offer.origin,
    to: offer.destination,
    depart: offer.departureTime,
    arrive: offer.arrivalTime,
    duration: formatDuration(offer.durationMinutes),
    durationMinutes: offer.durationMinutes,
    stops: offer.stops,
    stopDetail: offer.stopDetail ?? undefined,
    price: outboundTotal + returnTotal,
    outboundFare: outboundTotal,
    returnFare: returnTotal,
    label: offer.id === 1001 ? 'Best price' : offer.id === 1003 ? 'Top airline' : undefined,
    baggage: offer.baggage,
    seatsRemaining: offer.seatsRemaining,
    provider: offer.provider,
    carbonIndex: offer.carbonIndex,
    fareType: roundTrip ? 'ROUND_TRIP' : 'ONE_WAY',
  };
}

async function loadOfferCatalog(signal?: AbortSignal) {
  const [offersData, airlinesData] = await Promise.all([
    readDataset<{ items: RawOffer[] }>('flight-offers.json', signal),
    readDataset<{ items: Airline[] }>('airlines.json', signal),
  ]);
  const airlineMap = new Map(airlinesData.items.map((airline) => [airline.code, airline]));
  return { offers: offersData.items, airlineMap };
}

export async function getFeaturedFlights(signal?: AbortSignal): Promise<FlightResult[]> {
  await simulateNetworkDelay(signal);
  const catalog = await loadOfferCatalog(signal);
  const featured = catalog.offers.filter((offer) => offer.isFeatured && offer.origin === 'BLR' && offer.destination === 'DXB');
  const date = new Date();
  date.setDate(date.getDate() + 14);
  const departureDate = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  return featured.map((offer) => toFlightResult(offer, catalog.airlineMap.get(offer.airlineCode), {
    originCode: 'BLR', destinationCode: 'DXB', departureDate, adults: 1, cabinClass: 'ECONOMY',
  }));
}

export async function searchFlightOffers(params: FlightSearchParams, signal?: AbortSignal): Promise<FlightResult[]> {
  await simulateNetworkDelay(signal);
  const catalog = await loadOfferCatalog(signal);
  const dayOfWeek = new Date(params.departureDate + 'T12:00:00').getDay();

  return catalog.offers
    .filter((offer) =>
      offer.origin === params.originCode
      && offer.destination === params.destinationCode
      && offer.daysOfWeek.includes(dayOfWeek)
      && offer.cabinClasses.includes(params.cabinClass)
      && offer.seatsRemaining >= params.adults
    )
    .map((offer) => toFlightResult(offer, catalog.airlineMap.get(offer.airlineCode), params))
    .sort((first, second) => first.price - second.price);
}

export type Destination = {
  id: string;
  city: string;
  country: string;
  airportCode: string;
  tagline: string;
  fromAirport: string;
  indicativeFare: number;
  category: string;
  imageKey: string;
};

export type PopularRoute = {
  id: string;
  origin: string;
  destination: string;
  label: string;
  fromFare: number;
  searchCountLabel: string;
};

export type PriceCalendarMonth = {
  route: string;
  month: string;
  dailyFrom: number[];
};

export async function getDestinationCatalog(signal?: AbortSignal): Promise<Destination[]> {
  const data = await readDataset<{ items: Destination[] }>('destinations.json', signal);
  return data.items;
}

export async function getPopularRoutes(signal?: AbortSignal): Promise<PopularRoute[]> {
  const data = await readDataset<{ items: PopularRoute[] }>('popular-routes.json', signal);
  return data.items;
}

export async function getPriceCalendarCatalog(signal?: AbortSignal): Promise<PriceCalendarMonth[]> {
  const data = await readDataset<{ items: PriceCalendarMonth[] }>('price-calendar.json', signal);
  return data.items;
}
