"use client";

// =============================================================================
//  RoleSuggestion — "found in shipment data as Sales User" banner for the
//  Create User form. Debounce-checks the entered email against the admin-
//  configurable User Type Rules registry (System Settings -> User Type Rules,
//  services/user_type_rules.py) and, if it matches, offers to fill the Role
//  field. Purely a suggestion — the admin still picks and submits the role
//  themselves; nothing here creates or changes an account on its own.
// =============================================================================

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";
function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", superuser: "Super User", operationuser: "Operation User", salesuser: "Sales User",
};

type Candidate = { role: string; priority: number; matched_via: { table_name: string; column_name: string }[] };

function isLikelyEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function RoleSuggestion({ email, currentRole, onApply }:
  { email: string; currentRole: string; onApply: (role: string) => void }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setCandidates([]);
    setChecked(false);
    if (!isLikelyEmail(email)) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/user-type-rules/detect?email=${encodeURIComponent(email.trim())}`, { headers: authHeaders() });
        const j = await res.json();
        if (res.ok) setCandidates(j.data || []);
      } catch { /* best-effort — a failed check just means no suggestion shown */ }
      finally { setChecked(true); }
    }, 500);
    return () => clearTimeout(t);
  }, [email]);

  if (!isLikelyEmail(email) || !checked || candidates.length === 0) return null;

  // Only worth showing if there's a role on offer that isn't already selected.
  const actionable = candidates.filter(c => c.role !== currentRole);
  if (actionable.length === 0) return null;

  return (
    <div style={{ marginTop: 8, padding: "8px 12px", background: "#EFF6FF", border: "1px solid #BFDBFE",
      borderRadius: 8, fontSize: 12.5, color: "#1E3A8A", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <span>
        Found in shipment data as{" "}
        {candidates.map((c, i) => (
          <span key={c.role}>
            {i > 0 && " / "}
            <strong>{ROLE_LABEL[c.role] || c.role}</strong>{" "}
            <span style={{ color: "#64748B" }}>
              (via {c.matched_via.map(m => `${m.table_name}.${m.column_name}`).join(", ")})
            </span>
          </span>
        ))}.
      </span>
      {actionable.map(c => (
        <button key={c.role} type="button" onClick={() => onApply(c.role)}
          style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: "#2563EB",
            border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
          Use {ROLE_LABEL[c.role] || c.role}
        </button>
      ))}
    </div>
  );
}
