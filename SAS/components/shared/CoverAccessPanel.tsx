"use client";

// =============================================================================
//  CoverAccessPanel — request/approve/activate temporary access to a colleague's
//  work while they're away. Same-department peers only. Used by Operation & Sales
//  users. Talks to /api/cover/*.
//
//  "Ongoing" tab is the one place that shows both sides of active cover at a
//  glance: work this user is currently covering, and who is currently
//  covering this user's own work (mirrors the top-bar CoverWorkSelector).
// =============================================================================

import { useState, useEffect, useCallback, CSSProperties } from "react";
import { T } from "@/styles/tokens";
import { useAuth } from "@/lib/hooks/useAuth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";
function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const DURATIONS = [
  { h: 12,  label: "12 hours" },
  { h: 24,  label: "24 hours" },
  { h: 72,  label: "3 days" },
  { h: 168, label: "1 week" },
];

type Req = {
  id: string;
  requester_email?: string; requester_name?: string;
  owner_email?: string; owner_name?: string;
  department?: string; reason?: string;
  status: string; duration_hours?: number;
  expires_at?: string; created_at?: string;
};

// From GET /api/cover/state
type ActiveGrant = { request_id: string; owner_email: string; owner_name: string; expires_at?: string | null };
type CoveredByGrant = { request_id: string; requester_email: string; requester_name: string; expires_at?: string | null };

const STATUS_COLOR: Record<string, string> = {
  pending:  T.amber, approved: T.blue, active: T.green,
  ended:    T.gray500, rejected: T.red, expired: T.gray400, revoked: T.gray500,
};

function fmt(ts?: string) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return ts; }
}

export default function CoverAccessPanel() {
  const user = useAuth();
  const [tab, setTab] = useState<"request" | "ongoing" | "incoming" | "outgoing">("request");

  const [colleagues, setColleagues] = useState<{ email: string; name: string }[]>([]);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [incoming, setIncoming] = useState<Req[]>([]);
  const [outgoing, setOutgoing] = useState<Req[]>([]);
  const [myActive, setMyActive] = useState<ActiveGrant[]>([]);       // work I'm covering
  const [beingCovered, setBeingCovered] = useState<CoveredByGrant[]>([]);  // my work, covered by others
  const [durationFor, setDurationFor] = useState<Record<string, number>>({});
  const [codeFor, setCodeFor] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const flash = (kind: "ok" | "err", text: string) => { setMsg({ kind, text }); setTimeout(() => setMsg(null), 4000); };

  const loadColleagues = useCallback(async () => {
    if (!user.email) return;
    try {
      const p = new URLSearchParams({ email: user.email, department: user.department ?? "", role: user.role ?? "" });
      const res = await fetch(`${API}/api/cover/colleagues?${p}`, { headers: authHeaders() });
      const j = await res.json();
      if (res.ok) setColleagues(j.data || []);
    } catch { /* ignore */ }
  }, [user.email, user.department, user.role]);

  const loadLists = useCallback(async () => {
    if (!user.email) return;
    try {
      const [inc, out] = await Promise.all([
        fetch(`${API}/api/cover/requests/incoming?email=${encodeURIComponent(user.email)}`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/api/cover/requests/outgoing?email=${encodeURIComponent(user.email)}`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      setIncoming(inc.data || []);
      setOutgoing(out.data || []);
    } catch { /* ignore */ }
  }, [user.email]);

  // Ongoing (active) cover, both directions — same feed the top-bar selector uses.
  const loadOngoing = useCallback(async () => {
    if (!user.email) return;
    try {
      const p = new URLSearchParams({ email: user.email, role: user.role ?? "", department: user.department ?? "" });
      const res = await fetch(`${API}/api/cover/state?${p}`, { headers: authHeaders() });
      const j = await res.json();
      if (res.ok && j.data) {
        setMyActive(j.data.active || []);
        setBeingCovered(j.data.being_covered || []);
      }
    } catch { /* ignore */ }
  }, [user.email, user.role, user.department]);

  useEffect(() => { loadColleagues(); loadLists(); loadOngoing(); }, [loadColleagues, loadLists, loadOngoing]);

  const submitRequest = async () => {
    if (!target) { flash("err", "Pick a colleague first."); return; }
    setBusy(true);
    try {
      const owner = colleagues.find(c => c.email === target);
      const res = await fetch(`${API}/api/cover/requests`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          requester_email: user.email, requester_name: user.name ?? user.email,
          owner_email: target, owner_name: owner?.name, department: user.department, reason,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Request failed");
      flash("ok", "Request sent — the colleague will be emailed to approve.");
      setTarget(""); setReason(""); loadLists();
    } catch (e: any) { flash("err", e.message); }
    finally { setBusy(false); }
  };

  const approve = async (id: string) => {
    const hours = durationFor[id] ?? 24;
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/cover/requests/${id}/approve`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ approver_email: user.email, role: user.role, duration_hours: hours }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Approve failed");
      flash("ok", "Approved — a one-time code was emailed to the requester.");
      loadLists();
    } catch (e: any) { flash("err", e.message); }
    finally { setBusy(false); }
  };

  const reject = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/cover/requests/${id}/reject`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ approver_email: user.email, role: user.role }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Reject failed");
      flash("ok", "Request declined."); loadLists();
    } catch (e: any) { flash("err", e.message); }
    finally { setBusy(false); }
  };

  const verify = async (id: string) => {
    const code = (codeFor[id] || "").trim();
    if (!code) { flash("err", "Enter the code you were emailed."); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/cover/requests/${id}/verify`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ requester_email: user.email, code }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Verification failed");
      flash("ok", "Access activated. Their work now appears in your views.");
      loadLists(); loadOngoing();
    } catch (e: any) { flash("err", e.message); }
    finally { setBusy(false); }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/cover/requests/${id}/revoke`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ email: user.email, role: user.role }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Revoke failed");
      flash("ok", "Access ended."); loadLists(); loadOngoing();
    } catch (e: any) { flash("err", e.message); }
    finally { setBusy(false); }
  };

  const chip = (s: string) => (
    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize", color: "#fff",
      background: STATUS_COLOR[s] || T.gray500, borderRadius: 20, padding: "2px 9px" }}>{s}</span>
  );

  const pendingIncoming = incoming.filter(r => r.status === "pending");
  const inp: CSSProperties = { width: "100%", padding: "9px 12px", border: `1px solid ${T.gray200}`,
    borderRadius: 8, fontSize: 13, color: T.gray900, background: T.cardBg, fontFamily: T.font, boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: T.gray900 }}>Cover Access</div>
      <div style={{ fontSize: 13, color: T.gray500, marginBottom: 16 }}>
        Request temporary access to a teammate's work while they're away, or approve a request for yours.
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {([
          ["request", "Request cover"],
          ["ongoing", `Ongoing${(myActive.length + beingCovered.length) ? ` (${myActive.length + beingCovered.length})` : ""}`],
          ["incoming", `Requests to me${pendingIncoming.length ? ` (${pendingIncoming.length})` : ""}`],
          ["outgoing", "My requests"],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${tab === id ? T.blue : T.gray200}`,
              background: tab === id ? T.blueBg : T.cardBg, color: tab === id ? T.blue : T.gray600 }}>
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ marginBottom: 12, fontSize: 12, padding: "8px 12px", borderRadius: 8,
          color: msg.kind === "ok" ? "#065F46" : T.red,
          background: msg.kind === "ok" ? T.greenBg : T.redBg,
          border: `1px solid ${msg.kind === "ok" ? T.greenBorder : T.redBorder}` }}>{msg.text}</div>
      )}

      {/* ── Request tab ── */}
      {tab === "request" && (
        <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: 12, padding: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.gray600 }}>Colleague ({user.department || "your department"})</label>
          <select value={target} onChange={e => setTarget(e.target.value)} style={{ ...inp, marginTop: 6, marginBottom: 12 }}>
            <option value="">Select a colleague…</option>
            {colleagues.map(c => <option key={c.email} value={c.email}>{c.name} ({c.email})</option>)}
          </select>
          {colleagues.length === 0 && (
            <div style={{ fontSize: 12, color: T.gray400, marginBottom: 12 }}>No same-department colleagues found.</div>
          )}
          <label style={{ fontSize: 12, fontWeight: 600, color: T.gray600 }}>Reason (optional)</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Covering while on leave today"
            style={{ ...inp, marginTop: 6, marginBottom: 14 }} />
          <button onClick={submitRequest} disabled={busy || !target}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: busy || !target ? "not-allowed" : "pointer",
              background: !target ? T.gray300 : T.blue, color: "#fff", fontSize: 13, fontWeight: 700 }}>
            {busy ? "Sending…" : "Send request"}
          </button>
        </div>
      )}

      {/* ── Ongoing tab — both sides of active cover, at a glance ── */}
      {tab === "ongoing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.gray600, marginBottom: 8 }}>Work you're covering</div>
            {myActive.length === 0 ? (
              <Empty text="You aren't covering anyone's work right now." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myActive.map(g => (
                  <div key={g.request_id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.gray900 }}>{g.owner_name || g.owner_email}</div>
                      {chip("active")}
                    </div>
                    <div style={{ fontSize: 12, color: T.green, fontWeight: 600, marginTop: 8 }}>
                      Active {g.expires_at ? <>until {fmt(g.expires_at)}</> : "(direct grant)"}
                      <button onClick={() => revoke(g.request_id)} disabled={busy} style={{ ...btnOutline(T.gray500), marginLeft: 10 }}>End</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.gray600, marginBottom: 8 }}>Your work being covered</div>
            {beingCovered.length === 0 ? (
              <Empty text="No one currently has access to your work." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {beingCovered.map(g => (
                  <div key={g.request_id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.gray900 }}>{g.requester_name || g.requester_email}</div>
                      {chip("active")}
                    </div>
                    <div style={{ fontSize: 12, color: T.gray600, marginTop: 8 }}>
                      Active {g.expires_at ? <>until <strong>{fmt(g.expires_at)}</strong></> : "(direct grant)"}
                      <button onClick={() => revoke(g.request_id)} disabled={busy} style={{ ...btnOutline(T.red), marginLeft: 10 }}>End now</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Incoming tab ── */}
      {tab === "incoming" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {incoming.length === 0 && <Empty text="No one has requested access to your work." />}
          {incoming.map(r => (
            <div key={r.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.gray900 }}>{r.requester_name || r.requester_email}</div>
                {chip(r.status)}
              </div>
              <div style={{ fontSize: 12, color: T.gray500, margin: "3px 0 10px" }}>
                {r.requester_email} · {r.reason || "No reason given"} · {fmt(r.created_at)}
              </div>
              {r.status === "pending" ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: T.gray600 }}>Grant for</span>
                  <select value={durationFor[r.id] ?? 24} onChange={e => setDurationFor(p => ({ ...p, [r.id]: Number(e.target.value) }))}
                    style={{ ...inp, width: "auto", padding: "6px 10px" }}>
                    {DURATIONS.map(d => <option key={d.h} value={d.h}>{d.label}</option>)}
                  </select>
                  <button onClick={() => approve(r.id)} disabled={busy} style={btn(T.green)}>Approve &amp; send code</button>
                  <button onClick={() => reject(r.id)} disabled={busy} style={btnOutline(T.red)}>Decline</button>
                </div>
              ) : r.status === "active" ? (
                <div style={{ fontSize: 12, color: T.gray600 }}>
                  Active until <strong>{fmt(r.expires_at)}</strong>
                  <button onClick={() => revoke(r.id)} disabled={busy} style={{ ...btnOutline(T.red), marginLeft: 10 }}>End now</button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: T.gray400 }}>{r.duration_hours ? `${r.duration_hours}h grant` : ""}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Outgoing tab ── */}
      {tab === "outgoing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {outgoing.length === 0 && <Empty text="You haven't requested cover from anyone." />}
          {outgoing.map(r => (
            <div key={r.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.gray900 }}>{r.owner_name || r.owner_email}</div>
                {chip(r.status)}
              </div>
              <div style={{ fontSize: 12, color: T.gray500, margin: "3px 0 10px" }}>
                {r.owner_email} · {r.reason || "No reason given"} · {fmt(r.created_at)}
              </div>
              {r.status === "approved" ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input value={codeFor[r.id] || ""} onChange={e => setCodeFor(p => ({ ...p, [r.id]: e.target.value }))}
                    placeholder="Enter 6-digit code" inputMode="numeric" maxLength={6}
                    style={{ ...inp, width: 150, letterSpacing: 3, fontFamily: T.mono }} />
                  <button onClick={() => verify(r.id)} disabled={busy} style={btn(T.blue)}>Activate</button>
                </div>
              ) : r.status === "active" ? (
                <div style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>
                  Active until {fmt(r.expires_at)}
                  <button onClick={() => revoke(r.id)} disabled={busy} style={{ ...btnOutline(T.gray500), marginLeft: 10 }}>End</button>
                </div>
              ) : r.status === "pending" ? (
                <div style={{ fontSize: 12, color: T.gray400 }}>Waiting for approval…</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const cardStyle: CSSProperties = { background: "var(--card-bg, #fff)", border: "1px solid var(--gray-200, #E2E8F0)", borderRadius: 12, padding: 14 };
function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#94A3B8" }}>{text}</div>;
}
function btn(bg: string): CSSProperties {
  return { padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: bg, color: "#fff", fontSize: 12.5, fontWeight: 700 };
}
function btnOutline(c: string): CSSProperties {
  return { padding: "7px 14px", borderRadius: 8, border: `1px solid ${c}`, cursor: "pointer", background: "transparent", color: c, fontSize: 12.5, fontWeight: 700 };
}
