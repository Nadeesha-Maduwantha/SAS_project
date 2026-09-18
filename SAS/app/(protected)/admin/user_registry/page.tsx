"use client";

// =============================================================
//  User Registry — /admin/user_registry
//
//  Standalone, first-class view of the suggested-accounts queue that
//  services/user_type_rules.py's scheduled scan fills in (emails found in
//  shipment data, in a field flagged "User management", with no matching
//  profile yet). Same data/API as System Settings -> User Type Rules ->
//  Suggested accounts — this page just makes it a normal part of User
//  Management instead of something buried in Settings, since "go create
//  this person's account" is a day-to-day task, not a configuration one.
// =============================================================

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, RefreshCw } from "lucide-react";
import { T, solidBtn, outlineBtn } from "@/styles/tokens";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", superuser: "Super User", operationuser: "Operation User", salesuser: "Sales User",
};

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type Suggestion = {
  id: string;
  email: string;
  detected_role: string | null;
  candidates?: Array<{ role: string; matched_via?: Array<{ table_name: string; column_name: string }> }>;
  first_seen_at: string;
  last_seen_at: string;
  status: string;
};

export default function UserRegistryPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    fetch(`${API}/api/user-type-rules/suggestions?status=${showResolved ? "" : "pending"}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => setSuggestions(j.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [showResolved]);

  useEffect(() => { load(); }, [load]);

  const dismiss = async (s: Suggestion) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/user-type-rules/suggestions/${s.id}/dismiss`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not dismiss");
      load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const runScanNow = async () => {
    setScanning(true); setScanMsg(""); setError(null);
    try {
      const res = await fetch(`${API}/api/user-type-rules/scan`, { method: "POST", headers: authHeaders() });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Scan failed");
      const conflictsQueued = j.data.conflicts_queued || 0;
      const emailed = j.data.notified?.sent || 0;
      setScanMsg(
        `Scanned ${j.data.scanned} email(s) — queued ${j.data.queued} new suggestion(s)` +
        (conflictsQueued ? `, flagged ${conflictsQueued} role conflict(s)` : "") +
        (emailed ? `, emailed ${emailed} admin(s).` : ".")
      );
      load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setScanning(false); }
  };

  const pendingCount = suggestions.filter(s => s.status === "pending").length;

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <div style={{ maxWidth: "920px", margin: "0 auto", padding: "30px 24px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <UserPlus size={22} color={T.gray700} />
          <h1 style={{ fontSize: "23px", fontWeight: 800, color: T.gray900, margin: 0, letterSpacing: "-0.02em" }}>User Registry</h1>
        </div>
        <p style={{ fontSize: "13px", color: T.gray500, margin: "0 0 22px", lineHeight: 1.6 }}>
          Emails the sync found in shipment data — in a field flagged &quot;User management&quot; under Field
          Registry — with no matching account yet. Register one to create their login (pre-filled from what
          was detected), or dismiss it if this address doesn&apos;t need an account.
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: T.gray700 }}>
            {loading ? "Loading…" : `${pendingCount} pending`}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: T.gray500, cursor: "pointer" }}>
              <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} />
              Show dismissed / already registered
            </label>
            <button onClick={runScanNow} disabled={scanning}
              style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), padding: "8px 14px", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "6px" }}>
              <RefreshCw size={13} /> {scanning ? "Scanning…" : "Scan now"}
            </button>
          </div>
        </div>

        {scanMsg && <div style={{ fontSize: "12px", color: T.green, marginBottom: "14px" }}>{scanMsg}</div>}
        {error && (
          <div style={{ padding: "10px 13px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "8px", color: T.red, fontSize: "13px", marginBottom: "16px" }}>{error}</div>
        )}

        {!loading && suggestions.length === 0 && (
          <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: "12px", padding: "40px 20px", textAlign: "center", color: T.gray400, fontSize: "13px" }}>
            Nothing pending — every email the sync has seen already has an account.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {suggestions.map(s => {
            const via = s.candidates?.[0]?.matched_via?.[0];
            return (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", flexWrap: "wrap",
                background: T.cardBg, border: T.cardBorder, borderRadius: "12px",
                opacity: s.status === "pending" ? 1 : 0.55,
              }}>
                <div style={{ flex: 1, minWidth: "180px" }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.gray900 }}>{s.email}</div>
                  <div style={{ fontSize: "11.5px", color: T.gray500, marginTop: "3px" }}>
                    First seen {timeAgo(s.first_seen_at)}
                    {via && <> · via {via.table_name}.{via.column_name}</>}
                    {s.status !== "pending" && <> · {s.status}</>}
                  </div>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: T.blue, whiteSpace: "nowrap" }}>
                  {s.detected_role ? (ROLE_LABEL[s.detected_role] || s.detected_role) : "role unclear"}
                </span>
                {s.status === "pending" && (
                  <>
                    <button
                      onClick={() => router.push(`/admin/create_user?email=${encodeURIComponent(s.email)}&role=${encodeURIComponent(s.detected_role || "")}`)}
                      style={{ ...solidBtn(T.blue, "#fff"), padding: "7px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <UserPlus size={13} /> Register
                    </button>
                    <button onClick={() => dismiss(s)} disabled={busy}
                      style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "7px 14px", fontSize: "12px" }}>
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
