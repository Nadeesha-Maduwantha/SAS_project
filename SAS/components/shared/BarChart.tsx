'use client';

// =============================================================
//  BarChart.tsx
//  Path: components/shared/BarChart.tsx
//
//  Dependency-free horizontal bar chart.
//
//  Horizontal rather than vertical because the categories are text
//  labels (branch codes) — they read straight across without being
//  rotated, and the list grows downward instead of getting cramped.
// =============================================================

import { useEffect, useState } from 'react';

export interface BarRow {
  label:    string;
  value:    number;
  /** Small muted text on the right, e.g. the raw counts behind a percentage. */
  caption?: string;
  color?:   string;
}

export default function BarChart({
  rows,
  max = 100,
  unit = '',
  labelWidth = 62,
  barHeight = 8,
}: {
  rows:        BarRow[];
  /** Fixed axis top. Keep at 100 for percentages so bar length is comparable. */
  max?:        number;
  unit?:       string;
  labelWidth?: number;
  barHeight?:  number;
}) {
  // Grow bars from zero on mount, same as DonutChart.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!rows.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%' }}>
      {rows.map(row => {
        const pct = max > 0 ? Math.min(100, (row.value / max) * 100) : 0;

        return (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: labelWidth, flexShrink: 0,
              fontSize: 'var(--fs-sm)', color: 'var(--c-text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {row.label}
            </span>

            <div style={{
              flex: 1, minWidth: 0, height: barHeight,
              background: 'var(--c-border-light)',
              borderRadius: barHeight / 2,
              overflow: 'hidden',
            }}>
              <div style={{
                width: drawn ? `${pct}%` : 0,
                height: '100%',
                background: row.color ?? 'var(--c-chart-1)',
                borderRadius: barHeight / 2,
                transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </div>

            <span style={{
              width: 44, flexShrink: 0, textAlign: 'right',
              fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)' as any,
              color: 'var(--c-text-strong)', fontVariantNumeric: 'tabular-nums',
            }}>
              {row.value}{unit}
            </span>

            {row.caption !== undefined && (
              <span style={{
                width: 46, flexShrink: 0, textAlign: 'right',
                fontSize: 'var(--fs-xs)', color: 'var(--c-text-subtle)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {row.caption}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
