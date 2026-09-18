"use client";

// =============================================================
//  TakeActionModal.jsx
//  Path: app/(protected)/admin/shipment_milestones/components/TakeActionModal.jsx
//
//  Pre-fills an email draft based on the viewer's role.
//  No sending logic — user copies or opens in their email client.
//
//  Role behaviour:
//    admin / super_user  → email TO the responsible operations user
//    operations_user     → email TO the shipping line / carrier contact
//    sales_user          → email TO the shipment client
// =============================================================

import { useState } from "react";
import { T, solidBtn, outlineBtn, ghostBtn, inp, lbl } from "@/styles/tokens";

// ── Icons ─────────────────────────────────────────────────────

const IcoX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IcoMail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IcoCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IcoExternalLink = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ── Role config ───────────────────────────────────────────────

function buildEmailDraft({ role, milestone, shipment, contacts }) {
  const base = {
    shipmentId:    shipment.id,
    milestoneName: milestone.name,
    expectedDate:  milestone.expectedDate,
  };

  if (role === "admin" || role === "super_user") {
    return {
      to:      contacts.operationsUser?.email ?? "",
      toLabel: contacts.operationsUser?.name  ?? "Operations User",
      subject: `[SAS] Action Required — ${base.milestoneName} | ${base.shipmentId}`,
      body:
`Hi ${contacts.operationsUser?.name ?? "Team"},

Please review the following milestone which requires attention for shipment ${base.shipmentId}.

Milestone:      ${base.milestoneName}
Expected Date:  ${base.expectedDate}
Client:         ${shipment.client}
Route:          ${shipment.route}

Could you please check on the status and update CargoWise accordingly? Let me know if you need any assistance.

Thank you,
[Your Name]`,
      contextNote: "This email will be sent from your own email account to the responsible operations user.",
    };
  }

  if (role === "operations_user") {
    return {
      to:      contacts.carrier?.email ?? "",
      toLabel: contacts.carrier?.name  ?? "Carrier / Shipping Line",
      subject: `Shipment Update Request — ${base.shipmentId} | ${base.milestoneName}`,
      body:
`Dear ${contacts.carrier?.name ?? "Sir/Madam"},

We are writing regarding the following shipment and would like to request an update on the milestone status.

Shipment Reference: ${base.shipmentId}
Client:             ${shipment.client}
Route:              ${shipment.route}
Milestone:          ${base.milestoneName}
Expected Date:      ${base.expectedDate}

Please provide an update at your earliest convenience so we can keep our records up to date.

Best regards,
[Your Name]
Dart Global Logistics`,
      contextNote: "This email will be sent from your own email account to the carrier / shipping line contact.",
    };
  }

  if (role === "sales_user") {
    return {
      to:      contacts.client?.email ?? "",
      toLabel: contacts.client?.name  ?? "Client",
      subject: `Shipment Status Update — ${base.shipmentId}`,
      body:
`Dear ${contacts.client?.name ?? "Valued Client"},

We would like to provide you with an update on your shipment.

Shipment Reference: ${base.shipmentId}
Route:              ${shipment.route}
Current Milestone:  ${base.milestoneName}
Expected Date:      ${base.expectedDate}

Your shipment is currently progressing through the above milestone. We will continue to keep you updated as it advances. Please do not hesitate to contact us if you have any questions.

Kind regards,
[Your Name]
Dart Global Logistics`,
      contextNote: "This email will be sent from your own email account directly to the client.",
    };
  }

  return { to: "", toLabel: "", subject: "", body: "", contextNote: "" };
}

// ── Role label ────────────────────────────────────────────────

const ROLE_LABELS = {
  admin:            "Admin",
  super_user:       "Super User",
  operations_user:  "Operations User",
  sales_user:       "Sales User",
};

const ROLE_COLORS = {
  admin:            { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  super_user:       { color: T.blue,    bg: T.blueBg,  border: T.blueBorder },
  operations_user:  { color: T.green,   bg: T.greenBg, border: T.greenBorder },
  sales_user:       { color: T.amber,   bg: T.amberBg, border: T.amberBorder },
};

// ── Component ─────────────────────────────────────────────────

export default function TakeActionModal({ role, milestone, shipment, contacts, onClose }) {
  const draft = buildEmailDraft({ role, milestone, shipment, contacts });

  const [to,      setTo]      = useState(draft.to);
  const [subject, setSubject] = useState(draft.subject);
  const [body,    setBody]    = useState(draft.body);
  const [copied,  setCopied]  = useState(false);

  const onFocus = (e) => { e.target.style.borderColor = T.blue;    e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; };
  const onBlur  = (e) => { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; };

  const handleCopy = () => {
    const text = `To: ${to}\nSubject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Open in default mail client via mailto:
  const handleOpenMailClient = () => {
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
  };

  const rc = ROLE_COLORS[role] || ROLE_COLORS.admin;

  return (
    <div style={{
      position:       "fixed",
      inset:          0,
      zIndex:         1000,
      background:     "rgba(17,24,39,0.45)",
      backdropFilter: "blur(4px)",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      padding:        "20px",
    }}>
      <div style={{
        background:   T.cardBg,
        border:       `1px solid ${T.gray200}`,
        borderRadius: "16px",
        width:        "600px",
        maxWidth:     "100%",
        maxHeight:    "90vh",
        overflowY:    "auto",
        boxShadow:    "0 20px 60px rgba(0,0,0,0.18)",
        animation:    "scaleIn 0.18s ease",
      }}>

        {/* Header */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "20px 24px 0",
          marginBottom:   "6px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width:          "34px",
              height:         "34px",
              borderRadius:   "9px",
              background:     T.blueBg,
              border:         `1px solid ${T.blueBorder}`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              color:          T.blue,
            }}>
              <IcoMail />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: T.gray900 }}>
                Take Action — Draft Email
              </div>
              <div style={{ fontSize: "11px", color: T.gray500, marginTop: "1px" }}>
                Review and send from your own email client
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ ...ghostBtn, color: T.gray400 }}>
            <IcoX />
          </button>
        </div>

        <div style={{ padding: "16px 24px 24px" }}>

          {/* Role + milestone context banner */}
          <div style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "10px",
            background:   T.gray50,
            border:       `1px solid ${T.gray200}`,
            borderRadius: "10px",
            padding:      "12px 14px",
            marginBottom: "18px",
            flexWrap:     "wrap",
          }}>
            <span style={{
              fontSize:     "11px",
              fontWeight:   "700",
              color:        rc.color,
              background:   rc.bg,
              border:       `1px solid ${rc.border}`,
              padding:      "2px 9px",
              borderRadius: "5px",
              letterSpacing:"0.04em",
            }}>
              {ROLE_LABELS[role]}
            </span>
            <span style={{ fontSize: "12px", color: T.gray500 }}>
              Acting on milestone:
            </span>
            <span style={{ fontSize: "12px", fontWeight: "600", color: T.gray900 }}>
              {milestone.name}
            </span>
            <span style={{ fontSize: "11px", color: T.gray400, marginLeft: "auto" }}>
              {shipment.id}
            </span>
          </div>

          {/* Context note */}
          <div style={{
            fontSize:     "12px",
            color:        T.amber,
            background:   T.amberBg,
            border:       `1px solid ${T.amberBorder}`,
            borderRadius: "8px",
            padding:      "10px 14px",
            marginBottom: "18px",
            lineHeight:   "1.55",
          }}>
            {draft.contextNote}
          </div>

          {/* To field */}
          <div style={{ marginBottom: "14px" }}>
            <label style={lbl}>
              To — {draft.toLabel}
            </label>
            <input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="recipient@example.com"
              style={inp}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Subject */}
          <div style={{ marginBottom: "14px" }}>
            <label style={lbl}>Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={inp}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: "20px" }}>
            <label style={lbl}>Email Body</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={12}
              style={{
                ...inp,
                resize:     "vertical",
                lineHeight: "1.65",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize:   "12px",
                minHeight:  "220px",
              }}
              onFocus={onFocus}
              onBlur={(e) => { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleOpenMailClient}
              style={{
                ...solidBtn(T.blue, "#fff"),
                padding:      "10px 20px",
                borderRadius: "9px",
                fontSize:     "13px",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.87"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <IcoExternalLink /> Open in Mail Client
            </button>

            <button
              onClick={handleCopy}
              style={{
                ...outlineBtn(T.gray700, T.gray200, T.gray50),
                padding:  "10px 20px",
                fontSize: "13px",
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.gray100}
              onMouseLeave={e => e.currentTarget.style.background = T.gray50}
            >
              <IcoCopy /> {copied ? "Copied!" : "Copy Email"}
            </button>

            <button
              onClick={onClose}
              style={{
                ...outlineBtn(T.gray500, T.gray200, "transparent"),
                padding:     "10px 16px",
                fontSize:    "13px",
                marginLeft:  "auto",
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.gray50}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}