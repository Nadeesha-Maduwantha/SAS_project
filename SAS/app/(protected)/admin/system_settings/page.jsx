"use client";

// =============================================================
//  System Settings — /admin/system_settings
//
//  Grouped into sections; each setting is a collapsible accordion
//  (name shown first, click to expand the full controls).
// =============================================================

import { useState, useEffect } from "react";
import { Settings, MapPin, Check, BookOpen, ChevronDown } from "lucide-react";
import { T, solidBtn } from "@/styles/tokens";
import FieldDefinitionsManager from "@/components/settings/FieldDefinitionsManager";
import { humanizeError } from "@/lib/humanizeError";

const API = "http://localhost:5000";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ── Collapsible setting ───────────────────────────────────────────────────────
function Accordion({ icon, title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: "12px", overflow: "hidden", marginBottom: "12px" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", fontFamily: T.font, textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          {icon}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: T.gray900 }}>{title}</div>
            {subtitle && <div style={{ fontSize: "12px", color: T.gray500, marginTop: "2px" }}>{subtitle}</div>}
          </div>
        </div>
        <ChevronDown size={18} color={T.gray400} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && <div style={{ padding: "0 20px 20px" }}>{children}</div>}
    </div>
  );
}

export default function SystemSettingsPage() {
  const [admins,   setAdmins]   = useState([]);
  const [email,    setEmail]    = useState("");
  const [alertOn,  setAlertOn]  = useState(true);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    fetch(`${API}/api/system-settings/milestone-mismatch`, { headers: authHeaders() })
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Failed to load settings");
        setAdmins(j.admins ?? []);
        setEmail(j.mismatch_alert_email ?? "");
        setAlertOn(j.alert_on_validation !== false);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch(`${API}/api/system-settings/milestone-mismatch`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ admin_email: email || null, alert_on_validation: alertOn }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const lbl = { display: "block", fontSize: "12px", fontWeight: "600", color: T.gray600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" };
  const inp = { width: "100%", background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: T.gray900, outline: "none", fontFamily: T.font, boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "30px 24px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <Settings size={22} color={T.gray700} />
          <h1 style={{ fontSize: "23px", fontWeight: "800", color: T.gray900, margin: 0, letterSpacing: "-0.02em" }}>System Settings</h1>
        </div>
        <p style={{ fontSize: "13px", color: T.gray500, margin: "0 0 22px" }}>Configure how the SAS system behaves.</p>

        {/* ── Milestone settings section ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <MapPin size={16} color={T.blue} />
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: T.gray900, margin: 0 }}>Milestone settings</h2>
        </div>

        {/* Setting 1 — Milestone name mismatch */}
        <Accordion
          icon={<MapPin size={16} color={T.blue} />}
          title="Milestone name mismatch"
          subtitle="Who gets emailed when an expected field isn't in the feed"
        >
          <p style={{ fontSize: "12.5px", color: T.gray500, margin: "0 0 18px", lineHeight: "1.6" }}>
            When a milestone expects a CargoWise field the feed doesn't provide (a naming mismatch), the system
            emails the chosen admin so they can map the real field on the Field Registry page.
          </p>

          {error && (
            <div title={error} style={{ padding: "10px 13px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "8px", color: T.red, fontSize: "13px", marginBottom: "16px" }}>{humanizeError(error)}</div>
          )}

          {loading ? (
            <p style={{ fontSize: "13px", color: T.gray500 }}>Loading…</p>
          ) : (
            <>
              <div style={{ marginBottom: "18px" }}>
                <label style={lbl}>Alerting admin account</label>
                <select value={email} onChange={e => setEmail(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                  <option value="">— Select an admin —</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.email}>
                      {(a.full_name || "Unnamed") + " · " + a.email}
                    </option>
                  ))}
                </select>
                {admins.length === 0 && (
                  <p style={{ fontSize: "11px", color: T.amber, marginTop: "6px" }}>No admin accounts found. You can still type an email below.</p>
                )}
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="or type an email address…"
                  style={{ ...inp, marginTop: "8px" }} />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "22px" }}
                onClick={() => setAlertOn(v => !v)}>
                <div style={{ width: "38px", height: "22px", borderRadius: "99px", background: alertOn ? T.green : T.gray300, position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#fff", position: "absolute", top: "3px", left: alertOn ? "19px" : "3px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </div>
                <span style={{ fontSize: "13px", color: T.gray700 }}>Send mismatch alert emails</span>
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button onClick={save} disabled={saving} style={{ ...solidBtn(T.blue, "#fff"), padding: "10px 22px", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : "Save"}
                </button>
                {saved && <span style={{ display: "flex", alignItems: "center", gap: "5px", color: T.green, fontSize: "13px", fontWeight: "600" }}><Check size={15} /> Saved</span>}
              </div>
            </>
          )}
        </Accordion>

        {/* Setting 2 — Field definitions */}
        <Accordion
          icon={<BookOpen size={16} color={T.blue} />}
          title="Field definitions"
          subtitle="Plain-language meaning for each data field"
        >
          <p style={{ fontSize: "12.5px", color: T.gray500, margin: "0 0 18px", lineHeight: "1.6" }}>
            Give each data field a plain-language meaning. These definitions appear in the milestone builder,
            so anyone creating a milestone or template knows exactly what a field represents.
          </p>
          <FieldDefinitionsManager />
        </Accordion>
      </div>
    </div>
  );
}
