"use client";

// =============================================================================
//  CoverWorkSelector — top-bar button + dropdown for the "whose work am I
//  viewing" feature. Always visible for any logged-in user — grey/"No cover"
//  when nothing is assigned either way, colored once something is:
//    grey  = nothing            green = active, none expired
//    yellow = some expired       red  = all expired (3h re-request window)
//  (color reflects THIS user's own covering activity, i.e. `active`/`red`
//  below — unchanged from the original scheme.) Ongoing access shows on both
//  sides of the pair: `active` is work this user is covering, `beingCovered`
//  is who is currently covering THIS user's own work.
//  The selection is global (useCoverSelection); changing it re-renders the
//  current page's work views. Admin/Super can add anyone directly; Operation/
//  Sales pick from grants they were given.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCoverSelection, getCoverSelection } from "@/lib/hooks/useCoverSelection";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";
function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const COLORS: Record<string, { dot: string; label: string }> = {
  grey:   { dot: "#94A3B8", label: "No cover" },
  green:  { dot: "#16A34A", label: "Covering" },
  yellow: { dot: "#D97706", label: "Some expired" },
  red:    { dot: "#DC2626", label: "Expired" },
};

type Grant = { request_id: string; owner_email: string; owner_name: string; expires_at?: string | null };
type CoveredBy = { request_id: string; requester_email: string; requester_name: string; expires_at?: string | null };
type Person = { email: string; name: string };

export default function CoverWorkSelector() {
  const user = useAuth();
  const role = (user.role || "").toLowerCase();
  const isPrivileged = role.includes("admin") || role.includes("super");
  const { selection, setSelection } = useCoverSelection();

  const [active, setActive] = useState<Grant[]>([]);
  const [beingCovered, setBeingCovered] = useState<CoveredBy[]>([]);
  const [red, setRed] = useState<Grant[]>([]);
  const [canCover, setCanCover] = useState<Person[]>([]);
  const [awaiting, setAwaiting] = useState<Grant[]>([]);
  const [canRequest, setCanRequest] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [extHours, setExtHours] = useState<Record<string, number>>({});
  const [codeFor, setCodeFor] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user.email) return;
    try {
      const p = new URLSearchParams({ email: user.email, role: user.role || "", department: user.department || "" });
      const res = await fetch(`${API}/api/cover/state?${p}`, { headers: authHeaders() });
      const j = await res.json();
      if (res.ok && j.data) {
        const newActive: Grant[] = j.data.active || [];
        const newCanCover: Person[] = j.data.can_cover || [];
        setActive(newActive);
        setBeingCovered(j.data.being_covered || []);
        setRed(j.data.red || []);
        setCanCover(newCanCover);
        setAwaiting(j.data.awaiting_code || []);
        setCanRequest(j.data.can_request || []);

        // Self-heal the persisted "viewing" selection: drop anything that
        // isn't currently a real option for this user (own work, an active
        // grant, or — if privileged — someone they can cover). Without this,
        // a stale/foreign entry (a different account's old selection, or a
        // colleague whose grant since ended) silently inflates the "Viewing N"
        // count without any way for the user to see or clear it.
        const validOwners = new Set<string>([
          user.email,
          ...newActive.map(g => g.owner_email),
          ...(isPrivileged ? newCanCover.map(p2 => p2.email) : []),
        ]);
        const current = getCoverSelection();
        const pruned = current.filter(e => validOwners.has(e));
        if (pruned.length !== current.length) setSelection(pruned);
      }
    } catch { /* ignore */ }
  }, [user.email, user.role, user.department, isPrivileged]);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Colour per the agreed state machine.
  const color = active.length && red.length ? "yellow"
    : active.length ? "green"
    : red.length ? "red" : "grey";

  if (!user.email) return null;
  // Always rendered from here on — grey/"No cover" when nothing is assigned
  // either way. Requesting cover (for Op/Sales) is still done from the Cover
  // nav page; this button is just the always-on status + "whose work am I
  // viewing" switch.

  const toggle = (email: string) => {
    setSelection(selection.includes(email) ? selection.filter(e => e !== email) : [...selection, email]);
  };

  const addDirect = async (owner_email: string) => {
    // Admin/super can VIEW anyone they select immediately (authorization is by
    // role, not by a grant record), so select optimistically. The direct-grant
    // POST is best-effort — it only powers action logging + the owner alert.
    if (!selection.includes(owner_email)) setSelection([...selection, owner_email]);
    setSearch("");
    try {
      await fetch(`${API}/api/cover/direct`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ actor_email: user.email, role: user.role, department: user.department, owner_email }),
      });
      load();
    } catch { /* selection already applied */ }
  };

  const requestCover = async (owner_email: string, owner_name?: string) => {
    try {
      const res = await fetch(`${API}/api/cover/requests`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ requester_email: user.email, requester_name: user.name,
          owner_email, owner_name, department: user.department }),
      });
      const j = await res.json();
      setNote(res.ok ? "Request sent — the owner will approve and email you a code." : (j.error || "Request failed"));
      setSearch(""); load();
    } catch { setNote("Could not reach server."); }
    setTimeout(() => setNote(""), 4000);
  };

  const verifyCode = async (g: Grant) => {
    const code = (codeFor[g.request_id] || "").trim();
    if (!code) return;
    try {
      const res = await fetch(`${API}/api/cover/requests/${g.request_id}/verify`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ requester_email: user.email, code }),
      });
      const j = await res.json();
      if (res.ok) { setNote("Access activated."); toggle(g.owner_email); load(); }
      else setNote(j.error || "Incorrect code");
    } catch { setNote("Could not reach server."); }
    setTimeout(() => setNote(""), 4000);
  };

  const revokeCoverOfMe = async (g: CoveredBy) => {
    try {
      const res = await fetch(`${API}/api/cover/requests/${g.request_id}/revoke`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ email: user.email, role: user.role }),
      });
      if (res.ok) { setNote("Access ended."); load(); }
      else { const j = await res.json().catch(() => ({})); setNote(j.error || "Could not end access."); }
    } catch { setNote("Could not reach server."); }
    setTimeout(() => setNote(""), 4000);
  };

  const extend = async (g: Grant) => {
    const hours = extHours[g.request_id] || 24;
    try {
      const res = await fetch(`${API}/api/cover/requests/${g.request_id}/extend`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ requester_email: user.email, proposed_hours: hours }),
      });
      if (res.ok) await load();
    } catch { /* ignore */ }
  };

  const c = COLORS[color];
  const selCount = selection.length;
  const s = { fontFamily: "inherit" } as const;

  // Full display name for an email currently in the selection — the button
  // itself is icon-only now (just the status dot), so the dropdown is the
  // only place the actual name(s) being viewed show up.
  const nameFor = (email: string): string => {
    if (email === user.email) return `${user.name || user.email} (you)`;
    return active.find(g => g.owner_email === email)?.owner_name
      || canCover.find(p => p.email === email)?.name
      || canRequest.find(p => p.email === email)?.name
      || email;
  };
  const selectedNames = selection.map(nameFor);

  const alreadyCovered = new Set([...active, ...red, ...awaiting].map(g => g.owner_email));
  const matchSearch = (p: Person) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
  const addable = canCover.filter(p => !alreadyCovered.has(p.email) && matchSearch(p));
  const reqAddable = canRequest.filter(p => !alreadyCovered.has(p.email) && matchSearch(p));

  // Tick / untick a coverable person (admin/super). Ticking selects them (and
  // best-effort creates the direct grant for logging); unticking just deselects.
  const togglePrivileged = (email: string) => {
    if (selection.includes(email)) setSelection(selection.filter(e => e !== email));
    else addDirect(email);
  };

  // Select-all across ALL coverable people (admin = everyone, super = their dept),
  // regardless of the current search filter.
  const allCover = canCover.filter(p => !alreadyCovered.has(p.email));
  const allCoverEmails = allCover.map(p => p.email);
  const allCoverSelected = allCoverEmails.length > 0 && allCoverEmails.every(e => selection.includes(e));
  const toggleAllCover = () => {
    if (allCoverSelected) setSelection(selection.filter(e => !allCoverEmails.includes(e)));
    else setSelection(Array.from(new Set([...selection, ...allCoverEmails])));
  };

  return (
    <div ref={ref} style={{ position: "relative", ...s }}>
      <button onClick={() => setOpen(o => !o)}
        title={selCount > 0 ? `Viewing ${selCount} — ${selectedNames.join(", ")}` : "Whose work you're viewing"}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, padding: 0,
          borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.dot }} />
      </button>

      {open && (
        <div style={{ position: "absolute", right: 0, top: "110%", width: 320, zIndex: 1000,
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.14)", padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>Whose work am I viewing</div>
          <div style={{ fontSize: 11, color: "#64748B", marginBottom: 10 }}>Select one or more. Applies to every page.</div>
          {selCount > 0 && (
            <div style={{ fontSize: 11.5, color: "#1E3A8A", background: "#EFF6FF", border: "1px solid #BFDBFE",
              borderRadius: 7, padding: "6px 8px", marginBottom: 8, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700 }}>Viewing {selCount}:</span> {selectedNames.join(", ")}
            </div>
          )}
          {note && <div style={{ fontSize: 11, color: "#0F5132", background: "#E9F8EF", border: "1px solid #B7EBC6", borderRadius: 7, padding: "6px 8px", marginBottom: 8 }}>{note}</div>}

          {/* My own work */}
          <Row label="My work" email={user.email} on={selection.includes(user.email)} onToggle={() => toggle(user.email)} />

          {/* Ongoing: who is currently covering MY work (the other side of `active` below) */}
          {beingCovered.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Your work is being covered by</div>
              {beingCovered.map(g => (
                <div key={g.request_id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 12, color: "#0F172A" }}>{g.requester_name}</span>
                  <span style={{ fontSize: 10.5, color: "#94A3B8" }}>{g.expires_at ? `until ${fmt(g.expires_at)}` : "direct"}</span>
                  <button onClick={() => revokeCoverOfMe(g)} style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", background: "transparent",
                    border: "1px solid #FCA5A5", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>End</button>
                </div>
              ))}
            </div>
          )}

          {/* Active grants (work I am covering) */}
          {active.map(g => (
            <Row key={g.request_id} label={g.owner_name} sub={g.expires_at ? `until ${fmt(g.expires_at)}` : "direct"}
              email={g.owner_email} on={selection.includes(g.owner_email)} onToggle={() => toggle(g.owner_email)} />
          ))}

          {/* Expired (red) — offer re-request */}
          {red.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", marginBottom: 6 }}>Expired — request more time</div>
              {red.map(g => (
                <div key={g.request_id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 12, color: "#0F172A" }}>{g.owner_name}</span>
                  <input type="number" min={1} value={extHours[g.request_id] ?? 24}
                    onChange={e => setExtHours(p => ({ ...p, [g.request_id]: Number(e.target.value) }))}
                    style={{ width: 54, padding: "4px 6px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12 }} />
                  <span style={{ fontSize: 11, color: "#64748B" }}>h</span>
                  <button onClick={() => extend(g)} style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#2563EB",
                    border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>Ask</button>
                </div>
              ))}
            </div>
          )}

          {/* Admin/Super: tickable checklist of coverable people + select-all */}
          {isPrivileged && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>
                  Cover {role.includes("admin") ? "anyone" : "your department"}
                </div>
                {allCoverEmails.length > 0 && (
                  <button onClick={toggleAllCover}
                    style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", background: "transparent", border: "none", cursor: "pointer" }}>
                    {allCoverSelected ? "Clear all" : "Select all"}
                  </button>
                )}
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter colleagues…"
                style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 12, marginBottom: 6 }} />
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {addable.length === 0 && <div style={{ fontSize: 11, color: "#94A3B8", padding: "4px 0" }}>{canCover.length ? "No matches." : "No colleagues available."}</div>}
                {addable.map(p => (
                  <Row key={p.email} label={p.name} sub={p.email} email={p.email}
                    on={selection.includes(p.email)} onToggle={() => togglePrivileged(p.email)} />
                ))}
              </div>
            </div>
          )}

          {/* Operation/Sales: only enter a code for an approved request. Requesting
              cover happens on the Cover page (opened from the left nav bar). */}
          {!isPrivileged && awaiting.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", marginBottom: 6 }}>Enter cover code</div>
              {awaiting.map(g => (
                <div key={g.request_id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 12, color: "#0F172A" }}>{g.owner_name}</span>
                  <input value={codeFor[g.request_id] || ""} onChange={e => setCodeFor(p => ({ ...p, [g.request_id]: e.target.value }))}
                    placeholder="code" inputMode="numeric" maxLength={6}
                    style={{ width: 84, padding: "4px 6px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, letterSpacing: 2, fontFamily: "monospace" }} />
                  <button onClick={() => verifyCode(g)} style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#16A34A",
                    border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>Activate</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, sub, email, on, onToggle }:
  { label: string; sub?: string; email: string; on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 6px", cursor: "pointer", borderRadius: 7 }}
      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <span style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${on ? "#2563EB" : "#CBD5E1"}`,
        background: on ? "#2563EB" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
      </span>
      <span style={{ flex: 1, fontSize: 12.5, color: "#0F172A" }}>{label}</span>
      {sub && <span style={{ fontSize: 10.5, color: "#94A3B8" }}>{sub}</span>}
    </div>
  );
}

function fmt(ts?: string | null) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}
