export type UserProfile = {
  userId: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  homeAirport?: string | null;
  preferredCurrency?: string | null;
};

export type UpdateProfilePayload = {
  fullName: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  homeAirport: string | null;
  preferredCurrency: string | null;
};

type AuthenticationResponse = {
  userId: string;
  email: string;
  fullName: string;
  accessToken: string;
  expiresAt: string;
};

type ProblemResponse = {
  detail?: string;
  title?: string;
  correlationId?: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const ACCESS_TOKEN_KEY = 'flyscanner.auth.access-token';
const PROFILE_KEY = 'flyscanner.auth.profile';

function readToken(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeSession(token: string, profile: UserProfile): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
  } catch {
    // Session storage can be unavailable in restricted browser contexts.
  }
}

export function getCachedProfile(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    return parsed.userId && parsed.email && parsed.fullName ? parsed : null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const token = authenticated ? readToken() : null;
  if (authenticated && token) headers.set('Authorization', 'Bearer ' + token);

  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, { ...init, headers, credentials: 'omit' });
  } catch {
    throw new Error('Could not reach FlyScanner. Check that the backend is running and try again.');
  }

  if (!response.ok) {
    if (authenticated && response.status === 401) clearSession();
    let message = 'The request could not be completed. Please try again.';
    try {
      const problem = await response.json() as ProblemResponse;
      message = problem.detail || problem.title || message;
      if (problem.correlationId) {
        message += ' Reference: ' + problem.correlationId;
      }
    } catch {
      // Use the generic message for non-JSON responses.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

async function establishSession(path: '/api/v1/auth/login' | '/api/v1/auth/register', body: object): Promise<UserProfile> {
  const result = await request<AuthenticationResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  }, false);

  try {
    // Keep the short-lived bearer token in tab-scoped session storage, not localStorage.
    sessionStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
    const profile = await getProfile();
    writeSession(result.accessToken, profile);
    return profile;
  } catch (error) {
    clearSession();
    throw error;
  }
}

export function login(email: string, password: string): Promise<UserProfile> {
  return establishSession('/api/v1/auth/login', { email, password });
}

export function register(fullName: string, email: string, password: string): Promise<UserProfile> {
  return establishSession('/api/v1/auth/register', { fullName, email, password });
}

export async function getProfile(): Promise<UserProfile> {
  const profile = await request<UserProfile>('/api/v1/auth/me');
  const token = readToken();
  if (token) writeSession(token, profile);
  return profile;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const profile = await request<UserProfile>('/api/v1/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const token = readToken();
  if (token) writeSession(token, profile);
  return profile;
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/api/v1/auth/logout', { method: 'POST' });
  } finally {
    clearSession();
  }
}
