// =============================================================
//  SAS Project — Shared Design Tokens
//  Path: styles/tokens.js
//
//  Import in any page or component:
//    import { T, solidBtn, outlineBtn, ghostBtn, inp, lbl } from "@/styles/tokens";
// =============================================================

export const T = {

  // --- Page & surface -------------------------------------------
  pageBg:           "#F0F2F5",
  cardBg:           "#FFFFFF",
  cardBorder:       "1px solid #E5E7EB",
  cardRadius:       "14px",
  cardShadow:       "0 1px 6px rgba(0,0,0,0.07)",
  cardShadowHover:  "0 4px 16px rgba(0,0,0,0.10)",

  // --- Primary blue ---------------------------------------------
  blue:             "#2563EB",
  blueMid:          "#3B82F6",
  blueBg:           "#EFF6FF",
  blueBorder:       "#BFDBFE",

  // --- Danger red -----------------------------------------------
  red:              "#EF4444",
  redBg:            "#FEF2F2",
  redBorder:        "#FECACA",

  // --- Warning amber --------------------------------------------
  amber:            "#D97706",
  amberBg:          "#FFFBEB",
  amberBorder:      "#FDE68A",

  // --- Success green --------------------------------------------
  green:            "#059669",
  greenBg:          "#ECFDF5",
  greenBorder:      "#A7F3D0",

  // --- Neutral greys --------------------------------------------
  gray900:          "#111827",
  gray700:          "#374151",
  gray500:          "#6B7280",
  gray400:          "#9CA3AF",
  gray300:          "#D1D5DB",
  gray200:          "#E5E7EB",
  gray100:          "#F3F4F6",
  gray50:           "#F9FAFB",

  // --- Typography -----------------------------------------------
  font:             "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono:             "'IBM Plex Mono', 'Fira Code', monospace",
};

// --- Button style helpers -----------------------------------------

export const solidBtn = (bg, fg) => ({
  background:     bg,
  color:          fg,
  border:         "none",
  borderRadius:   "8px",
  fontWeight:     "600",
  fontSize:       "13px",
  cursor:         "pointer",
  fontFamily:     T.font,
  transition:     "opacity 0.15s",
  display:        "inline-flex",
  alignItems:     "center",
  gap:            "7px",
});

export const outlineBtn = (fg, border, bg) => ({
  background:     bg || "transparent",
  color:          fg,
  border:         `1.5px solid ${border}`,
  borderRadius:   "8px",
  fontWeight:     "600",
  fontSize:       "13px",
  cursor:         "pointer",
  fontFamily:     T.font,
  padding:        "9px 18px",
  display:        "inline-flex",
  alignItems:     "center",
  gap:            "7px",
  transition:     "background 0.15s",
});

export const ghostBtn = {
  background:     "none",
  border:         "none",
  cursor:         "pointer",
  color:          "#9CA3AF",
  padding:        "6px",
  borderRadius:   "6px",
  display:        "inline-flex",
  alignItems:     "center",
  justifyContent: "center",
  transition:     "background 0.15s, color 0.15s",
};

export const inp = {
  width:          "100%",
  background:     "#F9FAFB",
  border:         "1px solid #E5E7EB",
  borderRadius:   "8px",
  padding:        "9px 13px",
  color:          "#111827",
  fontSize:       "13px",
  outline:        "none",
  fontFamily:     "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  transition:     "border-color 0.15s, box-shadow 0.15s",
  boxSizing:      "border-box",
};

export const lbl = {
  display:        "block",
  fontSize:       "11px",
  fontWeight:     "600",
  color:          "#6B7280",
  marginBottom:   "6px",
  letterSpacing:  "0.05em",
  textTransform:  "uppercase",
};