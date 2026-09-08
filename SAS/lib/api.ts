// =============================================================
//  lib/api.ts
//
//  Single source of truth for the backend URL.
//
//  Import API_BASE instead of writing the host and port inline.
//  The port has moved twice already (5000 -> 5001) and each move
//  meant editing 60+ files; with this it is one env var.
//
//  Note the host is 127.0.0.1, not localhost. On macOS `localhost`
//  resolves to IPv6 ::1 first, and AirPlay Receiver listens on
//  port 5000 across all interfaces — so `localhost:5000` reaches
//  AirPlay (403) instead of Flask. 127.0.0.1 forces IPv4.
// =============================================================

const DEFAULT_API_BASE = 'http://127.0.0.1:5000';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  DEFAULT_API_BASE;

/** Build a full backend URL from a path: apiUrl('/api/shipments/stats') */
export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Authorization header from the stored access token. Empty object when absent. */
export function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
