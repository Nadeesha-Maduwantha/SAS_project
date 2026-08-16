"use client";

// =============================================================
//  Field Registry — /admin/field_registry
//
//  Admin data-quality page for milestone field mapping:
//   • see field-naming mismatches (expected vs. what the API sends) and resolve
//     them by mapping the real field
//   • add an expected / future field to the registry
//   • deactivate mappings
// =============================================================

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Check, RefreshCw, Plus, X } from "lucide-react";
import { T, solidBtn, outlineBtn } from "@/styles/tokens";
import { humanizeError } from "@/lib/humanizeError";

const API = "http://localhost:5000";

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
  const [mismatches, setMismatches] = useState([]);
  const [registry,   setRegistry]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [checking,   setChecking]   = useState(false);
  const [error,      setError]      = useState(null);
  const [busyKey,    setBusyKey]    = useState(null);
  const [resolveVal, setResolveVal] = useState({});          // per-mismatch typed field
  const [newMap,     setNewMap]     = useState({ milestone_key: "", api_field: "" });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [mRes, rRes] = await Promise.all([
        fetch(`${API}/api/field-map/mismatches`, { headers: authHeaders() }).then(r => r.json().then(j => ({ ok: r.ok, j }))),
        fetch(`${API}/api/field-map?active=false`, { headers: authHeaders() }).then(r => r.json().then(j => ({ ok: r.ok, j }))),
      ]);
      if (!mRes.ok) throw new Error(mRes.j.error || "Failed to load mismatches");
      if (!rRes.ok) throw new Error(rRes.j.error || "Failed to load registry");
      setMismatches(mRes.j.data ?? []);
      setRegistry(rRes.j.data ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const checkNow = async () => {
    setChecking(true); setError(null);
    try {
      const res = await fetch(`${API}/api/field-map/detect`, { method: "POST", headers: authHeaders() });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Detection failed");
      await load();
    } catch (e) { setError(e.message); }
    finally { setChecking(false); }
  };

  const mapField = async (milestone_key, api_field, source = "api_discovery") => {
    if (!api_field || !api_field.trim()) return;
    setBusyKey(`${milestone_key}:${api_field}`);
    try {
      const res = await fetch(`${API}/api/field-map`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ milestone_key, api_field: api_field.trim(), source }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Mapping failed");
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusyKey(null); }
  };

  const deactivate = async (row) => {
    setBusyKey(row.id);
    try {
      const res = await fetch(`${API}/api/field-map/${row.id}/deactivate`, { method: "PATCH", headers: authHeaders() });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed");
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusyKey(null); }
  };

  const addMapping = async () => {
    if (!newMap.milestone_key.trim() || !newMap.api_field.trim()) return;
    await mapField(newMap.milestone_key.trim(), newMap.api_field.trim(), "predefined");
    setNewMap({ milestone_key: "", api_field: "" });
  };

  const card = { background: T.cardBg, border: T.cardBorder, borderRadius: "12px", padding: "18px 20px" };
  const inp = { background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "8px 11px", fontSize: "13px", color: T.gray900, outline: "none", fontFamily: T.font };

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "30px 24px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "22px" }}>
          <div>
            <h1 style={{ fontSize: "23px", fontWeight: "800", color: T.gray900, margin: 0, letterSpacing: "-0.02em" }}>Field Registry</h1>
            <p style={{ fontSize: "13px", color: T.gray500, marginTop: "4px" }}>
              Which CargoWise fields feed which milestones — and any field-naming mismatches to resolve.
            </p>
          </div>
          <button onClick={checkNow} disabled={checking}
            style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), padding: "9px 15px" }}>
            <RefreshCw size={14} /> {checking ? "Checking…" : "Check now"}
          </button>
        </div>

        {error && (
          <div title={error} style={{ padding: "11px 14px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "10px", color: T.red, fontSize: "13px", marginBottom: "16px" }}>{humanizeError(error)}</div>
        )}

        {/* ── Mismatches ── */}
        <div style={{ marginBottom: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <AlertTriangle size={16} color={mismatches.length ? T.amber : T.green} />
            <h2 style={{ fontSize: "15px", fontWeight: "700", color: T.gray900, margin: 0 }}>
              Naming mismatches {mismatches.length > 0 && <span style={{ color: T.amber }}>({mismatches.length})</span>}
            </h2>
          </div>

          {loading ? (
            <p style={{ fontSize: "13px", color: T.gray500 }}>Loading…</p>
          ) : mismatches.length === 0 ? (
            <div style={{ ...card, display: "flex", alignItems: "center", gap: "10px", color: T.green }}>
              <Check size={18} /> <span style={{ fontSize: "13px", fontWeight: "600" }}>No mismatches — every expected field is present in the feed.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {mismatches.map((m, i) => {
                const val = resolveVal[i] ?? m.suggested_field;
                return (
                  <div key={`${m.milestone_key}-${m.expected_field}`} style={{ ...card, borderLeft: `3px solid ${T.amber}` }}>
                    <div style={{ fontSize: "13px", color: T.gray700, marginBottom: "8px", lineHeight: "1.5" }}>
                      Milestone <strong style={{ fontFamily: T.mono, color: T.gray900 }}>{m.milestone_key}</strong> expects{" "}
                      <strong style={{ fontFamily: T.mono, color: T.red }}>{m.expected_field}</strong>, which the feed doesn't have.
                      Closest field: <strong style={{ fontFamily: T.mono, color: T.blue }}>{m.suggested_field}</strong>{" "}
                      <span style={{ color: T.gray400 }}>({Math.round((m.score || 0) * 100)}% match)</span>.
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "12px", color: T.gray500 }}>Map the real field:</span>
                      <input value={val} onChange={e => setResolveVal(p => ({ ...p, [i]: e.target.value }))} style={{ ...inp, width: "220px", fontFamily: T.mono }} />
                      <button onClick={() => mapField(m.milestone_key, val)} disabled={busyKey === `${m.milestone_key}:${val}`}
                        style={{ ...solidBtn(T.blue, "#fff"), padding: "8px 14px" }}>
                        <Check size={14} /> Map &amp; resolve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Registry ── */}
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: T.gray900, margin: "0 0 10px" }}>Registered fields</h2>

          {/* Add expected / future field */}
          <div style={{ ...card, marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: T.gray500 }}>Add expected / future field:</span>
            <input placeholder="milestone_key" value={newMap.milestone_key}
              onChange={e => setNewMap(p => ({ ...p, milestone_key: e.target.value }))} style={{ ...inp, width: "180px", fontFamily: T.mono }} />
            <input placeholder="api_field (e.g. first_transit_date)" value={newMap.api_field}
              onChange={e => setNewMap(p => ({ ...p, api_field: e.target.value }))} style={{ ...inp, width: "240px", fontFamily: T.mono }} />
            <button onClick={addMapping} style={{ ...solidBtn(T.blue, "#fff"), padding: "8px 14px" }}><Plus size={14} /> Add</button>
          </div>

          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 0.8fr 0.6fr 0.5fr", padding: "10px 16px", background: T.gray50, borderBottom: `1px solid ${T.gray200}`, fontSize: "11px", fontWeight: "700", color: T.gray500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <span>Milestone key</span><span>API field</span><span>Source</span><span>Active</span><span></span>
            </div>
            {registry.length === 0 ? (
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
                      <button onClick={() => deactivate(row)} disabled={busyKey === row.id} title="Deactivate"
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

      </div>
    </div>
  );
}
