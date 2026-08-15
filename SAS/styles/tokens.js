// =============================================================
//  SAS Project — Shared Design Tokens
//  Path: styles/tokens.js
//
//  Colors are CSS variables (defined in app/globals.css for light
//  and html.dark). Every inline style built from these tokens flips
//  automatically in dark mode — no per-component work needed.
//
//  Import in any page or component:
//    import { T, solidBtn, outlineBtn, ghostBtn, inp, lbl } from "@/styles/tokens";
// =============================================================

export const T = {

  // ── Page & surface ────────────────────────────────────────
  pageBg:          "var(--page-bg)",
  cardBg:          "var(--card-bg)",
  cardBorder:      "1px solid var(--card-border-color)",
  cardRadius:      "14px",
  cardShadow:      "var(--card-shadow)",
  cardShadowHover: "var(--card-shadow-hover)",

  // ── Primary blue ──────────────────────────────────────────
  blue:        "var(--blue)",
  blueMid:     "var(--blue-mid)",
  blueBg:      "var(--blue-bg)",
  blueBorder:  "var(--blue-border)",
  blueDark:    "var(--blue-dark)",

  // ── Danger red ────────────────────────────────────────────
  red:         "var(--red)",
  redBg:       "var(--red-bg)",
  redBorder:   "var(--red-border)",

  // ── Warning amber ─────────────────────────────────────────
  amber:       "var(--amber)",
  amberBg:     "var(--amber-bg)",
  amberBorder: "var(--amber-border)",

  // ── Success green ─────────────────────────────────────────
  green:        "var(--green)",
  greenBg:      "var(--green-bg)",
  greenBorder:  "var(--green-border)",

  // ── Neutral grays (role-preserving in dark mode) ──────────
  gray900: "var(--gray-900)",
  gray800: "var(--gray-800)",
  gray700: "var(--gray-700)",
  gray600: "var(--gray-600)",
  gray500: "var(--gray-500)",
  gray400: "var(--gray-400)",
  gray300: "var(--gray-300)",
  gray200: "var(--gray-200)",
  gray100: "var(--gray-100)",
  gray50:  "var(--gray-50)",

  // ── Typography ────────────────────────────────────────────
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
  color:          "var(--gray-400)",
  padding:        "6px",
  borderRadius:   "8px",
  display:        "inline-flex",
  alignItems:     "center",
  justifyContent: "center",
  transition:     "background 0.15s, color 0.15s",
};

export const inp = {
  width:        "100%",
  background:   "var(--card-bg)",
  border:       "1px solid var(--card-border-color)",
  borderRadius: "10px",
  padding:      "9px 13px",
  color:        "var(--gray-900)",
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
  color:         "var(--gray-600)",
  marginBottom:  "6px",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  fontFamily:    "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};
