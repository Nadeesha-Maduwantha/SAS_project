// =============================================================
//  SAS Project — Shared Design Tokens
//  Path: styles/tokens.js
//
//  Import in any page or component:
//    import { T, solidBtn, outlineBtn, ghostBtn, inp, lbl } from "@/styles/tokens";
// =============================================================

export const T = {

  // ── Page & surface ────────────────────────────────────────
  pageBg:          "#F1F5F9",
  cardBg:          "#FFFFFF",
  cardBorder:      "1px solid #E2E8F0",
  cardRadius:      "14px",
  cardShadow:      "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
  cardShadowHover: "0 4px 6px rgba(15,23,42,0.04), 0 2px 4px rgba(15,23,42,0.04), 0 0 0 1px rgba(15,23,42,0.03)",

  // ── Primary blue ──────────────────────────────────────────
  blue:        "#2563EB",
  blueMid:     "#3B82F6",
  blueBg:      "#EFF6FF",
  blueBorder:  "#BFDBFE",
  blueDark:    "#1D4ED8",

  // ── Danger red ────────────────────────────────────────────
  red:         "#DC2626",
  redBg:       "#FFF1F2",
  redBorder:   "#FECDD3",

  // ── Warning amber ─────────────────────────────────────────
  amber:       "#D97706",
  amberBg:     "#FFFBEB",
  amberBorder: "#FDE68A",

  // ── Success green ─────────────────────────────────────────
  green:        "#16A34A",
  greenBg:      "#F0FDF4",
  greenBorder:  "#BBF7D0",

  // ── Neutral grays ─────────────────────────────────────────
  gray900: "#0F172A",
  gray800: "#1E293B",
  gray700: "#334155",
  gray600: "#475569",
  gray500: "#64748B",
  gray400: "#94A3B8",
  gray300: "#CBD5E1",
  gray200: "#E2E8F0",
  gray100: "#F1F5F9",
  gray50:  "#F8FAFC",

  // ── Typography ────────────────────────────────────────────
  // DM Sans — premium, geometric, excellent at small sizes
  // JetBrains Mono — slashed zero, perfect for IDs and codes
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

// ── Button style helpers ───────────────────────────────────────

export const solidBtn = (bg, fg) => ({
  background:   bg,
  color:        fg,
  border:       "none",
  borderRadius: "10px",
  fontWeight:   "600",
  fontSize:     "13px",
  cursor:       "pointer",
  fontFamily:   T.font,
  transition:   "all 0.18s cubic-bezier(0.4,0,0.2,1)",
  display:      "inline-flex",
  alignItems:   "center",
  gap:          "7px",
});

export const outlineBtn = (fg, border, bg) => ({
  background:   bg || "transparent",
  color:        fg,
  border:       `1px solid ${border}`,
  borderRadius: "10px",
  fontWeight:   "600",
  fontSize:     "13px",
  cursor:       "pointer",
  fontFamily:   T.font,
  padding:      "9px 18px",
  display:      "inline-flex",
  alignItems:   "center",
  gap:          "7px",
  transition:   "all 0.18s cubic-bezier(0.4,0,0.2,1)",
});

export const ghostBtn = {
  background:     "none",
  border:         "none",
  cursor:         "pointer",
  color:          "#94A3B8",
  padding:        "6px",
  borderRadius:   "8px",
  display:        "inline-flex",
  alignItems:     "center",
  justifyContent: "center",
  transition:     "background 0.15s, color 0.15s",
};

export const inp = {
  width:        "100%",
  background:   "#FFFFFF",
  border:       "1px solid #E2E8F0",
  borderRadius: "10px",
  padding:      "9px 13px",
  color:        "#0F172A",
  fontSize:     "13px",
  outline:      "none",
  fontFamily:   "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  transition:   "border-color 0.15s, box-shadow 0.15s",
  boxSizing:    "border-box",
  boxShadow:    "0 1px 2px rgba(15,23,42,0.04)",
};

export const lbl = {
  display:       "block",
  fontSize:      "11px",
  fontWeight:    "700",
  color:         "#475569",
  marginBottom:  "6px",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  fontFamily:    "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};