'use client';

// =============================================================
//  RouterLoadingOverlay.tsx
//  Path: components/shared/RouterLoadingOverlay.tsx
//
//  Shows the blue loading screen for a minimum of 1 second
//  on every route change, including the initial mount
//  (which covers the login → dashboard redirect).
// =============================================================

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function RouterLoadingOverlay() {
  const pathname       = usePathname();
  const [visible, setVisible] = useState(true);   // true on first mount = login redirect
  const [bar,     setBar]     = useState(0);       // progress bar 0–100
  const timerRef   = useRef<NodeJS.Timeout | null>(null);
  const barRef     = useRef<NodeJS.Timeout | null>(null);
  const prevPath   = useRef(pathname);

  const showLoading = () => {
    setVisible(true);
    setBar(0);

    // Animate bar to 90% quickly then hold
    let pct = 0;
    barRef.current = setInterval(() => {
      pct += pct < 70 ? 8 : pct < 88 ? 2 : 0.3;
      setBar(Math.min(pct, 90));
      if (pct >= 90) clearInterval(barRef.current!);
    }, 60);

    // After 1 second minimum: finish bar then hide
    timerRef.current = setTimeout(() => {
      clearInterval(barRef.current!);
      setBar(100);
      setTimeout(() => setVisible(false), 280); // slight pause at 100%
    }, 1000);
  };

  // Show on first mount (covers login → dashboard)
  useEffect(() => {
    showLoading();
    return () => {
      clearTimeout(timerRef.current!);
      clearInterval(barRef.current!);
    };
  }, []);

  // Show on every subsequent route change
  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    clearTimeout(timerRef.current!);
    clearInterval(barRef.current!);
    showLoading();

    return () => {
      clearTimeout(timerRef.current!);
      clearInterval(barRef.current!);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      zIndex:         9999,
      background:     '#1E2FBE',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      transition:     'opacity 0.25s',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 44 }}>
        <img
          src="/images/company-logo.png"
          alt="Logo"
          width={72}
          height={72}
          style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.92 }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1 }}>
            SAS SYSTEM
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '3px', marginTop: 4 }}>
            MANAGEMENT
          </div>
        </div>
      </div>

      {/* Progress bar track */}
      <div style={{ width: 200, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
        <div style={{
          height:           '100%',
          borderRadius:     99,
          background:       '#fff',
          width:            `${bar}%`,
          transition:       bar === 0 ? 'none' : 'width 0.12s ease-out',
        }} />
      </div>

      {/* Label */}
      <div style={{ marginTop: 14, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Loading
      </div>

    </div>
  );
}