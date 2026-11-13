import type { FlightSearchParams } from '../services/mockFlightApi';

const CABIN_CLASSES = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] as const;

export function parseFlightSearchParams(params: URLSearchParams): FlightSearchParams | null {
  const originCode = params.get('from')?.toUpperCase() ?? '';
  const destinationCode = params.get('to')?.toUpperCase() ?? '';
  const departureDate = params.get('departure') ?? '';
  const returnDate = params.get('returnDate') ?? undefined;
  const adults = Number(params.get('adults') ?? '1');
  const cabinClass = (params.get('cabin') ?? 'ECONOMY').toUpperCase();

  if (!/^[A-Z]{3}$/.test(originCode) || !/^[A-Z]{3}$/.test(destinationCode)) return null;
  if (originCode === destinationCode) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) return null;
  if (returnDate && (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate) || returnDate < departureDate)) return null;
  if (!Number.isInteger(adults) || adults < 1 || adults > 9) return null;
  if (!CABIN_CLASSES.includes(cabinClass as typeof CABIN_CLASSES[number])) return null;

  return {
    originCode,
    destinationCode,
    departureDate,
    returnDate,
    adults,
    cabinClass: cabinClass as FlightSearchParams['cabinClass'],
  };
}

export function createFlightSearchQuery(params: FlightSearchParams): string {
  const query = new URLSearchParams({
    from: params.originCode,
    to: params.destinationCode,
    departure: params.departureDate,
    adults: String(params.adults),
    cabin: params.cabinClass,
    trip: params.returnDate ? 'ROUND_TRIP' : 'ONE_WAY',
  });
  if (params.returnDate) query.set('returnDate', params.returnDate);
  return query.toString();
}

export function formatTravelDate(value: string): string {
  const date = new Date(value + 'T12:00:00');
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function cabinLabel(value: FlightSearchParams['cabinClass']): string {
  return {
    ECONOMY: 'Economy',
    PREMIUM_ECONOMY: 'Premium economy',
    BUSINESS: 'Business',
    FIRST: 'First class',
  }[value];
}
