// =============================================================
//  lib/roles.ts
//
//  Role values are not stored consistently in the profiles table —
//  "Sales User", "salesuser" and "sales_user" all mean the same role.
//  Grouping on the raw string therefore splits one role across several
//  buckets (the Total Users donut showed "Sales User: 1" and "Sales: 8"
//  as separate slices). Normalise to a single key before counting.
// =============================================================

/** Collapse a raw role string to a comparable key: "Sales User" -> "salesuser". */
export function normalizeRole(role: string): string {
  return role.toLowerCase().replace(/[\s_-]/g, '');
}

const ROLE_LABELS: Record<string, string> = {
  admin:         'Admin',
  superuser:     'Super User',
  salesuser:     'Sales User',
  operationuser: 'Operation User',
  staff:         'Staff',
  user:          'User',
  automated:     'Automated',
  unknown:       'Unknown',
};

const ROLE_COLORS: Record<string, string> = {
  admin:         'var(--c-chart-1)',
  superuser:     'var(--c-chart-2)',
  operationuser: 'var(--c-chart-3)',
  salesuser:     'var(--c-chart-4)',
  staff:         'var(--c-chart-6)',
  user:          'var(--c-chart-6)',
  unknown:       'var(--c-chart-6)',
};

/** Display name for a role, accepting any of its stored spellings. */
export function formatRoleLabel(role: string): string {
  const key = normalizeRole(role);
  if (ROLE_LABELS[key]) return ROLE_LABELS[key];

  // Unknown role — fall back to title-casing whatever the database holds.
  return role.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Chart colour for a role, accepting any of its stored spellings. */
export function roleColor(role: string): string {
  return ROLE_COLORS[normalizeRole(role)] ?? 'var(--c-chart-6)';
}
