"use client";

// =============================================================
//  Field Registry — /admin/field_registry
//
//  Two tabs:
//   • Add Fields      — add-field form on top, then the registered-field table.
//   • Resolve Conflicts — naming mismatches deduped & grouped by template.
//     The same mismatch is solved ONCE for every shipment it affects
//     ("if one is correct, the rest are too").
// =============================================================

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Check, RefreshCw, Plus, X, ChevronRight } from "lucide-react";
import { T, solidBtn, outlineBtn } from "@/styles/tokens";
import { humanizeError } from "@/lib/humanizeError";

const API = "http://127.0.0.1:5001";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const SOURCE_META = {
  predefined:    { label: "Predefined", color: T.blue,  bg: T.blueBg  },
  builder:       { label: "Builder",    color: T.green, bg: T.greenBg },
  api_discovery: { label: "Discovered", color: T.amber, bg: T.amberBg },
};

export default function FieldRegistryPage() {
  const [tab, setTab] = useState("add");           // 'add' | 'conflicts'

  const [registry,  setRegistry]  = useState([]);
  const [conflicts, setConflicts] = useState([]);  // [{ template_id, template_name, conflicts:[...] }]
  const [loading,   setLoading]   = useState(true);
  const [scanning,  setScanning]  = useState(false);
  const [checking,  setChecking]  = useState(false);
  const [notice,    setNotice]    = useState(null);
  const [error,     setError]     = useState(null);
  const [busy,      setBusy]      = useState(null);
  const [realVal,   setRealVal]   = useState({});  // per-conflict typed real field
  const [newMap,    setNewMap]    = useState({ milestone_key: "", api_field: "" });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [rRes, cRes] = await Promise.all([
        fetch(`${API}/api/field-map?active=false`, { headers: authHeaders() }).then(r => r.json().then(j => ({ ok: r.ok, j }))),
        fetch(`${API}/api/field-watch/conflicts`, { headers: authHeaders() }).then(r => r.json().then(j => ({ ok: r.ok, j }))),
      ]);
      if (!rRes.ok) throw new Error(rRes.j.error || "Failed to load registry");
      if (!cRes.ok) throw new Error(cRes.j.error || "Failed to load conflicts");
      setRegistry(rRes.j.data ?? []);
      setConflicts(cRes.j.data ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const rescan = async () => {
    setScanning(true); setError(null); setNotice(null);
    try {
      const res = await fetch(`${API}/api/field-watch/scan`, { headers: authHeaders() });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Scan failed");
      const emailed = j.result?.emailed ?? 0;
      setNotice(`Field Watch scan done — ${emailed} email${emailed !== 1 ? "s" : ""} sent.`);
      await load();
    } catch (e) { setError(e.message); }
    finally { setScanning(false); }
  };

  // Run the milestone field-mismatch detector and email the digest (the same
  // path the :15 scheduled job uses). Lets you test the mismatch email on demand.
  const runMismatchCheck = async () => {
    setChecking(true); setError(null); setNotice(null);
    try {
      const res = await fetch(`${API}/api/field-map/detect`, { method: "POST", headers: authHeaders() });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Detection failed");
      const n = j.notified || {};
      setNotice(
        n.sent > 0
          ? `Found ${j.count} mismatch(es) — emailed ${n.recipients?.join(", ")}.`
          : `Found ${j.count} mismatch(es) — no email sent (${n.reason || "check recipient / SMTP"}).`
      );
      await load();
    } catch (e) { setError(e.message); }
    finally { setChecking(false); }
  };

  const addMapping = async () => {
    const mk = newMap.milestone_key.trim(), af = newMap.api_field.trim();
    if (!mk || !af) return;
    setBusy("add");
    try {
      const res = await fetch(`${API}/api/field-map`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ milestone_key: mk, api_field: af, source: "predefined" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Mapping failed");
      setNewMap({ milestone_key: "", api_field: "" });
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };

  const deactivate = async (row) => {
    setBusy(row.id);
    try {
      const res = await fetch(`${API}/api/field-map/${row.id}/deactivate`, { method: "PATCH", headers: authHeaders() });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed");
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };

  const resolve = async (c, everywhere = false) => {
    const real = (realVal[`${c.template_id}:${c.milestone_key}:${c.expected_field}`] ?? c.suggested_field ?? "").trim();
    if (!real) return;
    const bk = `${c.milestone_key}:${c.expected_field}`;
    setBusy(bk);
    try {
      const res = await fetch(`${API}/api/field-watch/resolve`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          expected_field: c.expected_field,
          real_field: real,
          milestone_key: everywhere ? undefined : c.milestone_key,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Resolve failed");
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };

  const totalConflicts = conflicts.reduce((n, g) => n + (g.conflicts?.length ?? 0), 0);

  const card = { background: T.cardBg, border: T.cardBorder, borderRadius: "12px", padding: "18px 20px" };
  const inp  = { background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "8px 11px", fontSize: "13px", color: T.gray900, outline: "none", fontFamily: T.font };

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <div style={{ maxWidth: "1040px", margin: "0 auto", padding: "30px 24px" }}>

        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <h1 style={{ fontSize: "23px", fontWeight: "800", color: T.gray900, margin: 0, letterSpacing: "-0.02em" }}>Field Registry</h1>
            <p style={{ fontSize: "13px", color: T.gray500, marginTop: "4px" }}>
              Add the CargoWise fields that feed milestones, and resolve any field-naming mismatches.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={runMismatchCheck} disabled={checking} style={{ ...outlineBtn(T.amber, T.amberBg, T.amberBg), padding: "9px 15px" }}>
              <AlertTriangle size={14} /> {checking ? "Checking…" : "Run mismatch check"}
            </button>
            <button onClick={rescan} disabled={scanning} style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), padding: "9px 15px" }}>
              <RefreshCw size={14} /> {scanning ? "Scanning…" : "Rescan"}
            </button>
          </div>
        </div>

        {notice && (
          <div style={{ padding: "11px 14px", background: T.blueBg, border: `1px solid ${T.blueBorder}`, borderRadius: "10px", color: T.blue, fontSize: "13px", marginBottom: "16px", fontWeight: "600" }}>{notice}</div>
        )}
        {error && (
          <div title={error} style={{ padding: "11px 14px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "10px", color: T.red, fontSize: "13px", marginBottom: "16px" }}>{humanizeError(error)}</div>
        )}

        {/* tabs */}
        <div style={{ display: "flex", gap: "4px", borderBottom: `1px solid ${T.gray200}`, marginBottom: "20px" }}>
          {[
            { key: "add",       label: "Add Fields" },
            { key: "conflicts", label: "Resolve Conflicts", count: totalConflicts },
          ].map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 16px", background: "none", border: "none",
                  borderBottom: `2px solid ${active ? T.blue : "transparent"}`, marginBottom: "-1px",
                  fontSize: "13px", fontWeight: active ? "700" : "500", color: active ? T.blue : T.gray500, cursor: "pointer", fontFamily: T.font }}>
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "1px 7px", borderRadius: "99px", background: active ? T.amberBg : T.gray100, color: active ? T.amber : T.gray400 }}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB: Add Fields ── */}
        {tab === "add" && (
          <div>
            {/* Add-field form — ON TOP */}
            <div style={{ ...card, marginBottom: "16px", borderLeft: `3px solid ${T.blue}` }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: T.gray900, marginBottom: "10px" }}>Add an expected / future field</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <input placeholder="milestone_key" value={newMap.milestone_key}
                  onChange={e => setNewMap(p => ({ ...p, milestone_key: e.target.value }))} style={{ ...inp, width: "200px", fontFamily: T.mono }} />
                <input placeholder="api_field (e.g. first_transit_date)" value={newMap.api_field}
                  onChange={e => setNewMap(p => ({ ...p, api_field: e.target.value }))} style={{ ...inp, width: "260px", fontFamily: T.mono }} />
                <button onClick={addMapping} disabled={busy === "add"} style={{ ...solidBtn(T.blue, "#fff"), padding: "8px 14px" }}>
                  <Plus size={14} /> Add
                </button>
              </div>
              <p style={{ fontSize: "12px", color: T.gray400, marginTop: "8px" }}>
                The field can be one the API doesn&apos;t send yet — it stays harmless until it appears.
              </p>
            </div>

            {/* Registered fields */}
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 0.8fr 0.6fr 0.5fr", padding: "10px 16px", background: T.gray50, borderBottom: `1px solid ${T.gray200}`, fontSize: "11px", fontWeight: "700", color: T.gray500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <span>Milestone key</span><span>API field</span><span>Source</span><span>Active</span><span></span>
              </div>
              {loading ? (
                <div style={{ padding: "20px", fontSize: "13px", color: T.gray500 }}>Loading…</div>
              ) : registry.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: T.gray400 }}>No mappings yet.</div>
              ) : registry.map((row, i) => {
                const meta = SOURCE_META[row.source] || SOURCE_META.predefined;
                return (
                  <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 0.8fr 0.6fr 0.5fr", padding: "10px 16px", borderTop: i > 0 ? `1px solid ${T.gray100}` : "none", alignItems: "center", fontSize: "12px", opacity: row.is_active ? 1 : 0.5 }}>
                    <span style={{ fontFamily: T.mono, color: T.gray900 }}>{row.milestone_key}</span>
                    <span style={{ fontFamily: T.mono, color: T.gray700 }}>{row.api_field}</span>
                    <span><span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "99px", background: meta.bg, color: meta.color }}>{meta.label}</span></span>
                    <span style={{ color: row.is_active ? T.green : T.gray400, fontWeight: "600" }}>{row.is_active ? "Yes" : "No"}</span>
                    <span style={{ textAlign: "right" }}>
                      {row.is_active && (
                        <button onClick={() => deactivate(row)} disabled={busy === row.id} title="Deactivate"
                          style={{ background: "none", border: "none", cursor: "pointer", color: T.red, display: "inline-flex", padding: "4px" }}>
                          <X size={14} />
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB: Resolve Conflicts ── */}
        {tab === "conflicts" && (
          <div>
            {loading ? (
              <p style={{ fontSize: "13px", color: T.gray500 }}>Loading…</p>
            ) : totalConflicts === 0 ? (
              <div style={{ ...card, display: "flex", alignItems: "center", gap: "10px", color: T.green }}>
                <Check size={18} /> <span style={{ fontSize: "13px", fontWeight: "600" }}>No conflicts — every expected field is present in the feed.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ fontSize: "12px", color: T.gray500, margin: "0 0 2px" }}>
                  Each row is one mismatch across all the shipments it affects. Resolving it maps the real field and clears every one of them at once.
                </p>
                {conflicts.map(g => (
                  <ConflictGroup key={g.template_id || "none"} group={g}
                    realVal={realVal} setRealVal={setRealVal} busy={busy} onResolve={resolve} inp={inp} card={card} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Template group of conflicts ─────────────────────────────────────────────────
function ConflictGroup({ group, realVal, setRealVal, busy, onResolve, inp, card }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: "12px", overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "13px 18px", background: T.gray50, border: "none", borderBottom: open ? `1px solid ${T.gray200}` : "none", cursor: "pointer", fontFamily: T.font, textAlign: "left" }}>
        <span style={{ display: "inline-flex", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", color: T.gray500 }}><ChevronRight size={15} /></span>
        <span style={{ fontSize: "14px", fontWeight: "700", color: T.gray900 }}>{group.template_name}</span>
        <span style={{ fontSize: "11px", fontWeight: "700", color: T.amber, background: T.amberBg, padding: "2px 8px", borderRadius: "99px" }}>
          {group.conflicts.length} conflict{group.conflicts.length !== 1 ? "s" : ""}
        </span>
      </button>
      {open && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {group.conflicts.map(c => {
            const rk = `${c.template_id}:${c.milestone_key}:${c.expected_field}`;
            const val = realVal[rk] ?? c.suggested_field ?? "";
            const bk = `${c.milestone_key}:${c.expected_field}`;
            return (
              <div key={rk} style={{ ...card, borderLeft: `3px solid ${T.amber}`, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: T.gray900 }}>{c.milestone_name}</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: T.gray500, background: T.gray100, padding: "2px 8px", borderRadius: "99px" }}>
                    {c.affected_count} shipment{c.affected_count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: T.gray700, marginBottom: "10px", lineHeight: "1.5" }}>
                  Expects <strong style={{ fontFamily: T.mono, color: T.red }}>{c.expected_field}</strong>, which the feed doesn&apos;t have.
                  {c.suggested_field
                    ? <> Closest field: <strong style={{ fontFamily: T.mono, color: T.blue }}>{c.suggested_field}</strong> <span style={{ color: T.gray400 }}>({Math.round((c.score || 0) * 100)}% match)</span>.</>
                    : <> No close field found — enter the real one.</>}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: T.gray500 }}>Real field:</span>
                  <input value={val} onChange={e => setRealVal(p => ({ ...p, [rk]: e.target.value }))} style={{ ...inp, width: "220px", fontFamily: T.mono }} />
                  <button onClick={() => onResolve(c, false)} disabled={busy === bk}
                    style={{ ...solidBtn(T.blue, "#fff"), padding: "8px 14px" }}>
                    <Check size={14} /> Resolve all {c.affected_count}
                  </button>
                  <button onClick={() => onResolve(c, true)} disabled={busy === bk} title="Also map this field everywhere it appears, across every template"
                    style={{ ...outlineBtn(T.gray600 || T.gray500, T.gray200, T.gray50), padding: "8px 12px" }}>
                    Everywhere
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
