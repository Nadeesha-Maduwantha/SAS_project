'use client';

// =============================================================
//  DonutChart.tsx
//  Path: components/shared/DonutChart.tsx
//
//  Dependency-free SVG donut for the dashboard stat cards.
//  Sized to fit inside the ~85px card body next to a legend.
//
//  Uses the r = 15.9155 trick so the circumference is exactly 100,
//  which lets each slice be expressed directly as a percentage.
// =============================================================

import { useEffect, useState } from 'react';

const RADIUS = 15.9154943092; // circumference = 2πr = 100

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export default function DonutChart({
  slices,
  size = 76,
  thickness = 7,
  centerValue,
  centerLabel,
  emptyText = 'No data',
}: {
  slices:       DonutSlice[];
  size?:        number;
  thickness?:   number;
  centerValue?: number | string;
  centerLabel?: string;
  emptyText?:   string;
}) {
  // Grow the slices in on mount — starts at 0 and transitions to the real value.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const total = slices.reduce((sum, s) => sum + (s.value || 0), 0);

  // Running offset so each slice starts where the previous one ended.
  // The +25 shifts the start point from 3 o'clock to 12 o'clock.
  let cumulative = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 42 42" width={size} height={size} role="img"
           aria-label={total === 0 ? emptyText : slices.map(s => `${s.label}: ${s.value}`).join(', ')}>
        {/* Track — also the empty state when there is nothing to show */}
        <circle
          cx="21" cy="21" r={RADIUS}
          fill="transparent" stroke="var(--c-border-light)" strokeWidth={thickness}
        />

        {total > 0 && slices.map(slice => {
          const pct    = ((slice.value || 0) / total) * 100;
          const offset = 25 - cumulative;
          cumulative  += pct;

          if (pct <= 0) return null;

          return (
            <circle
              key={slice.label}
              cx="21" cy="21" r={RADIUS}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={drawn ? `${pct} ${100 - pct}` : '0 100'}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          );
        })}
      </svg>

      {/* Center readout */}
      {(centerValue !== undefined || centerLabel) && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {centerValue !== undefined && (
            <span style={{
              fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-bold)' as any,
              color: 'var(--c-text-strong)',
              lineHeight: 1, letterSpacing: 'var(--ls-tight)', fontVariantNumeric: 'tabular-nums',
            }}>
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span style={{
              fontSize: 'var(--fs-xs)', color: 'var(--c-text-subtle)', marginTop: 2,
            }}>
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Legend row — colored dot + label on the left, value on the right ───────────
export function DonutLegendRow({
  color, label, value,
}: {
  color: string; label: string; value: number | string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 8, padding: '2.5px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{
          width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0,
        }} />
        <span style={{
          fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {label}
        </span>
      </div>
      <span style={{
        fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-medium)' as any,
        color: 'var(--c-text)',
        fontVariantNumeric: 'tabular-nums', flexShrink: 0,
      }}>
        {value}
      </span>
    </div>
  );
}
