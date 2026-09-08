'use client';

// =============================================================
//  File: hooks/useDarkMode.ts
//  Place at: hooks/useDarkMode.ts
//
//  Use this in any component that has hardcoded inline styles.
//  It gives you a isDark boolean + a color helper.
//
//  Usage:
//    import { useDarkMode, dc } from '@/hooks/useDarkMode';
//
//    const { isDark } = useDarkMode();
//
//    // dc = "dark color" — picks first arg in dark, second in light
//    <div style={{ background: dc(isDark, '#1E293B', '#fff') }}>
//
//  Or use the theme object directly:
//    const { theme } = useDarkMode();
//    <div style={{ background: theme.cardBg, color: theme.text }}>
// =============================================================

import { useTheme } from '@/contexts/ThemeContext';

// ── Color picker helper ───────────────────────────────────────
// dc(isDark, darkValue, lightValue)
export function dc(isDark: boolean, darkVal: string, lightVal: string): string {
  return isDark ? darkVal : lightVal;
}

// ── Pre-built theme token object ──────────────────────────────
// Use these instead of hardcoding '#fff' or '#1E293B'
export function buildTheme(isDark: boolean) {
  return {
    // Page / layout
    pageBg:        isDark ? '#0F172A'  : '#F9FAFB',
    cardBg:        isDark ? '#1E293B'  : '#FFFFFF',
    cardBgAlt:     isDark ? '#243447'  : '#F9FAFB',
    cardBorder:    isDark ? '#334155'  : '#E5E7EB',
    sidebarBg:     isDark ? '#0F172A'  : '#FFFFFF',

    // Text
    text:          isDark ? '#F1F5F9'  : '#111827',
    textMuted:     isDark ? '#94A3B8'  : '#6B7280',
    textFaint:     isDark ? '#475569'  : '#9CA3AF',

    // Input
    inputBg:       isDark ? '#1E293B'  : '#FFFFFF',
    inputBorder:   isDark ? '#334155'  : '#E5E7EB',
    inputText:     isDark ? '#F1F5F9'  : '#111827',

    // Table
    tableHead:     isDark ? '#1E293B'  : '#F9FAFB',
    tableRow:      isDark ? '#1E293B'  : '#FFFFFF',
    tableRowAlt:   isDark ? '#243447'  : '#F9FAFB',
    tableRowHover: isDark ? '#2D3F55'  : '#F0F4FF',
    tableBorder:   isDark ? '#1E293B'  : '#F3F4F6',

    // Borders
    border:        isDark ? '#334155'  : '#E5E7EB',
    borderSubtle:  isDark ? '#1E293B'  : '#F3F4F6',

    // Toolbar / header sections
    toolbarBg:     isDark ? '#1E293B'  : '#F9FAFB',
    sectionBg:     isDark ? '#243447'  : '#FAFAFA',
  };
}

// ── Main hook ─────────────────────────────────────────────────
export function useDarkMode() {
  const { isDark, toggleTheme } = useTheme();
  const theme = buildTheme(isDark);

  return { isDark, toggleTheme, theme, dc: (d: string, l: string) => dc(isDark, d, l) };
}