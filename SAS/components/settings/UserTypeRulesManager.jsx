"use client";

// =============================================================
//  UserTypeRulesManager
//  Admin-editable "how do we know someone's role" registry
//  (services/user_type_rules.py) + the suggested-accounts queue
//  the scheduled scan fills in. Lives in System Settings -> User
//  Type Rules. Mirrors the milestone field-registry's shape
//  (FieldDefinitionsManager) but for role identification.
// =============================================================

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, RefreshCw, UserPlus } from "lucide-react";
import { T, solidBtn, outlineBtn } from "@/styles/tokens";

const API = "http://127.0.0.1:5000";
function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const ROLE_LABEL = { admin: "Admin", superuser: "Super User", operationuser: "Operation User", salesuser: "Sales User" };
const ROLE_OPTIONS = Object.keys(ROLE_LABEL);

export default function UserTypeRulesManager() {
  const [rules, setRules] = useState([]);
  const [allowedTables, setAllowedTables] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  // new-rule draft
  const [draftRole, setDraftRole] = useState("salesuser");
  const [draftTable, setDraftTable] = useState("");
  const [draftColumn, setDraftColumn] = useState("");
  const [draftDesc, setDraftDesc] = useState("");

  // conflict policy (skip already-assigned users vs. flag them for review)
  const [conflictPolicy, setConflictPolicy] = useState("skip");
  const [savedConflictPolicy, setSavedConflictPolicy] = useState(null);
  const [conflictOptions, setConflictOptions] = useState([]);
  const [conflictPolicyLoading, setConflictPolicyLoading] = useState(true);
  const [conflictPolicySaving, setConflictPolicySaving] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setConflictPolicyLoading(true);
    try {
      const [r, t, s, cp, c] = await Promise.all([
        fetch(`${API}/api/user-type-rules`, { headers: authHeaders() }).then(res => res.json()),
        fetch(`${API}/api/user-type-rules/allowed-tables`, { headers: authHeaders() }).then(res => res.json()),
        fetch(`${API}/api/user-type-rules/suggestions?status=pending`, { headers: authHeaders() }).then(res => res.json()),
        fetch(`${API}/api/system-settings/user-type-conflict-policy`, { headers: authHeaders() }).then(res => res.json()),
        fetch(`${API}/api/user-type-rules/conflicts?status=pending`, { headers: authHeaders() }).then(res => res.json()),
      ]);
      setRules(r.data || []);
      setAllowedTables(t.data || {});
      setSuggestions(s.data || []);
      setConflictOptions(cp.options || []);
      setConflictPolicy(cp.user_type_conflict_policy || "skip");
      setSavedConflictPolicy(cp.user_type_conflict_policy || "skip");
      setConflicts(c.data || []);
      setDraftTable(prev => {
        const tables = Object.keys(t.data || {});
        if (prev && tables.includes(prev)) return prev;
        const first = tables[0] || "";
        setDraftColumn(((t.data || {})[first] || [])[0] || "");
        return first;
      });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setConflictPolicyLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveConflictPolicy = async () => {
    setConflictPolicySaving(true); setError(null);
    try {
      const res = await fetch(`${API}/api/system-settings/user-type-conflict-policy`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ user_type_conflict_policy: conflictPolicy }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not save policy");
      setSavedConflictPolicy(conflictPolicy);
    } catch (e) { setError(e.message); }
    finally { setConflictPolicySaving(false); }
  };

  const dismissConflict = async (c) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/user-type-rules/conflicts/${c.id}/dismiss`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not dismiss");
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const replaceConflict = async (c) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/user-type-rules/conflicts/${c.id}/replace`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not replace role");
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const addRule = async () => {
    if (!draftTable || !draftColumn) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/user-type-rules`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ role: draftRole, table_name: draftTable, column_name: draftColumn, description: draftDesc || null }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not add rule");
      setDraftDesc("");
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const toggleActive = async (rule) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/user-type-rules/${rule.id}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify({ is_active: !rule.is_active }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not update rule");
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const removeRule = async (rule) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/user-type-rules/${rule.id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not remove rule");
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const dismissSuggestion = async (s) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/user-type-rules/suggestions/${s.id}/dismiss`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not dismiss");
      load();
    } catch (e) { setError(e.message); }
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
    } catch (e) { setError(e.message); }
    finally { setScanning(false); }
  };

  const columnsForTable = allowedTables[draftTable] || [];
  const lbl = { display: "block", fontSize: "11px", fontWeight: "600", color: T.gray500, marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.04em" };
  const inp = { width: "100%", background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "8px 10px", fontSize: "12.5px", color: T.gray900, outline: "none", fontFamily: T.font, boxSizing: "border-box" };

  if (loading) return <p style={{ fontSize: "13px", color: T.gray500 }}>Loading…</p>;

  return (
    <div>
      {error && <div style={{ padding: "9px 12px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "8px", color: T.red, fontSize: "12.5px", marginBottom: "14px" }}>{error}</div>}

      {/* ── Rules list ── */}
      <div style={{ fontSize: "12px", fontWeight: "700", color: T.gray600, marginBottom: "8px" }}>Identification rules</div>
      <p style={{ fontSize: "12px", color: T.gray500, margin: "0 0 10px", lineHeight: "1.5" }}>
        Which table + column identifies each role — e.g. an email in shipments.sales_user_email counts as a Sales User.
        A role can have more than one rule; any match qualifies.
      </p>
      {rules.length === 0 ? (
        <p style={{ fontSize: "12.5px", color: T.gray400, marginBottom: "14px" }}>No rules yet — add one below.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
          {rules.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px",
              background: r.is_active ? T.cardBg : T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", opacity: r.is_active ? 1 : 0.6 }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: T.blue, width: "110px", flexShrink: 0 }}>{ROLE_LABEL[r.role] || r.role}</span>
              <span style={{ fontFamily: T.mono, fontSize: "11.5px", color: T.gray700, flex: 1 }}>{r.table_name}.{r.column_name}</span>
              {r.description && <span style={{ fontSize: "11px", color: T.gray400 }}>{r.description}</span>}
              <button onClick={() => toggleActive(r)} disabled={busy}
                style={{ ...outlineBtn(r.is_active ? T.gray500 : T.green, T.gray200, T.gray50), padding: "4px 9px", fontSize: "11px" }}>
                {r.is_active ? "Disable" : "Enable"}
              </button>
              <button onClick={() => removeRule(r)} disabled={busy}
                title="Remove rule" style={{ background: "transparent", border: "none", cursor: "pointer", color: T.red, padding: "4px" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Add rule ── */}
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
        <div>
          <label style={lbl}>Role</label>
          <select value={draftRole} onChange={e => setDraftRole(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Table</label>
          <select value={draftTable} onChange={e => { setDraftTable(e.target.value); setDraftColumn((allowedTables[e.target.value] || [])[0] || ""); }}
            style={{ ...inp, cursor: "pointer" }}>
            {Object.keys(allowedTables).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Column</label>
          <select value={draftColumn} onChange={e => setDraftColumn(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
            {columnsForTable.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "22px" }}>
        <input value={draftDesc} onChange={e => setDraftDesc(e.target.value)} placeholder="Optional note (why this identifies the role)…" style={{ ...inp, flex: 1 }} />
        <button onClick={addRule} disabled={busy || !draftTable || !draftColumn}
          style={{ ...solidBtn(T.blue, "#fff"), padding: "8px 16px", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "5px", opacity: busy ? 0.7 : 1 }}>
          <Plus size={13} /> Add rule
        </button>
      </div>

      {/* ── Suggested accounts ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: T.gray600 }}>
          Suggested accounts{suggestions.length ? ` (${suggestions.length})` : ""}
        </div>
        <button onClick={runScanNow} disabled={scanning}
          style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), padding: "6px 12px", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "5px" }}>
          <RefreshCw size={12} /> {scanning ? "Scanning…" : "Scan now"}
        </button>
      </div>
      <p style={{ fontSize: "12px", color: T.gray500, margin: "0 0 10px", lineHeight: "1.5" }}>
        Emails found in shipment data with no matching account yet, and the role the rules above detected for them.
        Runs automatically twice an hour — nothing here creates an account on its own.
      </p>
      {scanMsg && <div style={{ fontSize: "11.5px", color: T.green, marginBottom: "10px" }}>{scanMsg}</div>}

      {suggestions.length === 0 ? (
        <p style={{ fontSize: "12.5px", color: T.gray400 }}>Nothing pending.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {suggestions.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px",
              background: T.cardBg, border: `1px solid ${T.gray200}`, borderRadius: "8px" }}>
              <span style={{ fontSize: "12.5px", color: T.gray900, flex: 1 }}>{s.email}</span>
              <span style={{ fontSize: "11px", fontWeight: "700", color: T.blue }}>
                {s.detected_role ? (ROLE_LABEL[s.detected_role] || s.detected_role) : "role unclear"}
              </span>
              <a href={`/admin/create_user?email=${encodeURIComponent(s.email)}&role=${encodeURIComponent(s.detected_role || "")}`}
                style={{ ...solidBtn(T.blue, "#fff"), padding: "5px 11px", fontSize: "11px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <UserPlus size={12} /> Create user
              </a>
              <button onClick={() => dismissSuggestion(s)} disabled={busy}
                style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "5px 11px", fontSize: "11px" }}>
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Conflict handling policy ── */}
      <div style={{ fontSize: "12px", fontWeight: "700", color: T.gray600, margin: "26px 0 8px" }}>
        When a scanned email already has a profile with a different role
      </div>
      <p style={{ fontSize: "12px", color: T.gray500, margin: "0 0 10px", lineHeight: "1.5" }}>
        The scan above only ever suggests new accounts automatically — this controls what happens when it
        finds someone who already HAS an account whose role no longer matches what the rules detect.
      </p>

      {conflictPolicyLoading ? (
        <p style={{ fontSize: "13px", color: T.gray500 }}>Loading…</p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
            {conflictOptions.map(opt => (
              <label
                key={opt.value}
                onClick={() => setConflictPolicy(opt.value)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer",
                  padding: "10px 12px", borderRadius: "8px",
                  background: conflictPolicy === opt.value ? T.blueBg : T.gray50,
                  border: `1px solid ${conflictPolicy === opt.value ? T.blueBorder : T.gray200}`,
                }}
              >
                <input type="radio" checked={conflictPolicy === opt.value} onChange={() => setConflictPolicy(opt.value)} style={{ marginTop: "3px" }} />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: T.gray900 }}>{opt.label}</div>
                  <div style={{ fontSize: "12px", color: T.gray500, marginTop: "2px", lineHeight: "1.5" }}>{opt.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ marginBottom: "14px", fontSize: "12px", color: savedConflictPolicy ? T.green : T.amber }}>
            {savedConflictPolicy
              ? <>Currently saved — <strong>{conflictOptions.find(o => o.value === savedConflictPolicy)?.label || savedConflictPolicy}</strong>.</>
              : <>Not saved yet — pick an option and click Save.</>}
            {conflictPolicy !== (savedConflictPolicy ?? "") && <span style={{ color: T.gray400 }}> (unsaved changes)</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
            <button onClick={saveConflictPolicy} disabled={conflictPolicySaving || conflictPolicy === savedConflictPolicy}
              style={{ ...solidBtn(T.blue, "#fff"), padding: "8px 18px", fontSize: "12.5px", opacity: (conflictPolicySaving || conflictPolicy === savedConflictPolicy) ? 0.7 : 1 }}>
              {conflictPolicySaving ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}

      {/* ── Role conflicts queue (only meaningful once policy = replace, but shown either way) ── */}
      <div style={{ fontSize: "12px", fontWeight: "700", color: T.gray600, marginBottom: "8px" }}>
        Role conflicts{conflicts.length ? ` (${conflicts.length})` : ""}
      </div>
      <p style={{ fontSize: "12px", color: T.gray500, margin: "0 0 10px", lineHeight: "1.5" }}>
        {savedConflictPolicy === "replace"
          ? "Existing accounts the scan found with a role that no longer matches the identification rules. Nothing changes until you replace it."
          : "Empty while the policy above is set to skip — switch it to \"Flag role mismatches for review\" and run a scan to populate this."}
      </p>

      {conflicts.length === 0 ? (
        <p style={{ fontSize: "12.5px", color: T.gray400 }}>Nothing pending.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {conflicts.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px",
              background: T.cardBg, border: `1px solid ${T.gray200}`, borderRadius: "8px" }}>
              <span style={{ fontSize: "12.5px", color: T.gray900, flex: 1 }}>{c.email}</span>
              <span style={{ fontSize: "11px", color: T.gray500 }}>
                currently <strong style={{ color: T.gray700 }}>{ROLE_LABEL[c.current_role] || c.current_role}</strong>
              </span>
              <span style={{ fontSize: "11px", color: T.gray400 }}>→</span>
              <span style={{ fontSize: "11px", fontWeight: "700", color: T.blue }}>
                {ROLE_LABEL[c.detected_role] || c.detected_role}
              </span>
              <button onClick={() => replaceConflict(c)} disabled={busy}
                style={{ ...solidBtn(T.blue, "#fff"), padding: "5px 11px", fontSize: "11px" }}>
                Replace role
              </button>
              <button onClick={() => dismissConflict(c)} disabled={busy}
                style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "5px 11px", fontSize: "11px" }}>
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
