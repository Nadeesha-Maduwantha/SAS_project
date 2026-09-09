// =============================================================
//  lib/departments.ts
//
//  A super user runs exactly one freight desk: air or sea. The desk lives in
//  profiles.department, but is not stored consistently — the same desk appears
//  as 'sea' and 'Sea'. Compare through freightMode() rather than the raw string.
//
//  Mirrors Backend/utils/departments.py — keep the two in step.
// =============================================================

export type FreightMode = 'AIR' | 'SEA';

const AIR_SPELLINGS = ['air', 'airfreight', 'air freight'];
const SEA_SPELLINGS = ['sea', 'seafreight', 'sea freight', 'ocean'];

/** 'Sea' -> 'SEA'. Returns null when the department is not a freight desk. */
export function freightMode(department: string | null | undefined): FreightMode | null {
  const key = (department ?? '').trim().toLowerCase();
  if (AIR_SPELLINGS.includes(key)) return 'AIR';
  if (SEA_SPELLINGS.includes(key)) return 'SEA';
  return null;
}

/** Freight desk of the signed-in user, from what the login stored. */
export function storedFreightMode(): FreightMode | null {
  if (typeof window === 'undefined') return null;
  return freightMode(localStorage.getItem('user_department'));
}
