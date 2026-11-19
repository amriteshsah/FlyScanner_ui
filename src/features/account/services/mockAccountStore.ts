import type { FlightResult } from '../../flight-search/services/mockFlightApi';

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type SavedFlight = Pick<
  FlightResult,
  'id' | 'airline' | 'airlineCode' | 'code' | 'from' | 'to' | 'depart' | 'arrive' |
  'duration' | 'durationMinutes' | 'stops' | 'price' | 'baggage' | 'fareType'
> & { savedAt: string };

export type PriceAlert = {
  id: string;
  origin: string;
  destination: string;
  targetPrice: number;
  currency: 'INR';
  createdAt: string;
  active: boolean;
};

const KEYS = {
  user: 'flyscanner.demo.user.v1',
  savedFlights: 'flyscanner.demo.saved-flights.v1',
  alerts: 'flyscanner.demo.price-alerts.v1',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or storage quota restrictions should not break the demo UI.
  }
}

export function getCurrentUser(): AccountUser | null {
  return readStorage<AccountUser | null>(KEYS.user, null);
}

export function signInDemo(email: string, password: string): AccountUser {
  if (!email.trim() || password.length < 6) {
    throw new Error('Enter a valid email address and a password of at least 6 characters.');
  }

  const existing = getCurrentUser();
  const user: AccountUser = existing?.email.toLowerCase() === email.trim().toLowerCase()
    ? existing
    : {
        id: 'demo-' + email.trim().toLowerCase(),
        name: email.trim().split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        email: email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
      };

  writeStorage(KEYS.user, user);
  return user;
}

export function registerDemo(name: string, email: string, password: string): AccountUser {
  if (name.trim().length < 2) throw new Error('Enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter a valid email address.');
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.');

  const user: AccountUser = {
    id: 'demo-' + crypto.randomUUID(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };
  writeStorage(KEYS.user, user);
  return user;
}

export function updateDemoProfile(name: string): AccountUser | null {
  const current = getCurrentUser();
  if (!current || name.trim().length < 2) return current;
  const updated = { ...current, name: name.trim() };
  writeStorage(KEYS.user, updated);
  return updated;
}

export function signOutDemo(): void {
  try {
    localStorage.removeItem(KEYS.user);
  } catch {
    // Ignore unavailable browser storage.
  }
}

export function getSavedFlights(): SavedFlight[] {
  return readStorage<SavedFlight[]>(KEYS.savedFlights, []);
}

export function toggleSavedFlight(flight: FlightResult): SavedFlight[] {
  const saved = getSavedFlights();
  const exists = saved.some((item) => item.id === flight.id);
  const next = exists
    ? saved.filter((item) => item.id !== flight.id)
    : [...saved, {
        id: flight.id,
        airline: flight.airline,
        airlineCode: flight.airlineCode,
        code: flight.code,
        from: flight.from,
        to: flight.to,
        depart: flight.depart,
        arrive: flight.arrive,
        duration: flight.duration,
        durationMinutes: flight.durationMinutes,
        stops: flight.stops,
        price: flight.price,
        baggage: flight.baggage,
        fareType: flight.fareType,
        savedAt: new Date().toISOString(),
      }];
  writeStorage(KEYS.savedFlights, next);
  return next;
}


export function removeSavedFlight(id: number): SavedFlight[] {
  const next = getSavedFlights().filter((flight) => flight.id !== id);
  writeStorage(KEYS.savedFlights, next);
  return next;
}

export function getPriceAlerts(): PriceAlert[] {
  return readStorage<PriceAlert[]>(KEYS.alerts, []);
}

export function createPriceAlert(origin: string, destination: string, targetPrice: number): PriceAlert[] {
  const next = [{
    id: 'alert-' + crypto.randomUUID(),
    origin: origin.toUpperCase(),
    destination: destination.toUpperCase(),
    targetPrice,
    currency: 'INR' as const,
    createdAt: new Date().toISOString(),
    active: true,
  }, ...getPriceAlerts()];
  writeStorage(KEYS.alerts, next);
  return next;
}

export function removePriceAlert(id: string): PriceAlert[] {
  const next = getPriceAlerts().filter((alert) => alert.id !== id);
  writeStorage(KEYS.alerts, next);
  return next;
}
