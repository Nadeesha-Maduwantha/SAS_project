import { parsePhoneNumberFromString } from 'libphonenumber-js';

const FULL_NAME_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 100;
const INVALID_NAME_CHARS = /[0-9<>{}\\/;"]/;

// Mirrors Backend/utils/profile_validation.py — keep both in sync.

export function validateFullName(name: string): string | null {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'Full name is required.';
  if (trimmed.length < FULL_NAME_MIN_LENGTH) return `Full name must be at least ${FULL_NAME_MIN_LENGTH} characters.`;
  if (trimmed.length > FULL_NAME_MAX_LENGTH) return `Full name must be ${FULL_NAME_MAX_LENGTH} characters or fewer.`;
  if (INVALID_NAME_CHARS.test(trimmed)) return 'Full name contains invalid characters.';
  return null;
}

// Validated with libphonenumber-js against the number's own country code —
// works for any country rather than one hardcoded format, which means the
// number must be in international format (a leading '+countrycode'). There's
// no single default country to fall back to for a bare local number.
export function validatePhoneNumber(phone: string): string | null {
  const trimmed = (phone || '').trim();
  if (!trimmed) return null; // optional — clearing it is fine
  if (!trimmed.startsWith('+')) return 'Phone number must include a country code, e.g. +14155552671.';
  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed || !parsed.isValid()) return 'Phone number is not valid for the specified country.';
  return null;
}
