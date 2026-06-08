'use client';

import React from 'react';
import AdminLeftNavBar from '@/components/AdminUser/AdminLeftNavBar';
import AdminTopBar    from '@/components/AdminUser/AdminTopBar';
import RouterLoadingOverlay from '@/components/shared/RouterLoadingOverlay';
import { NavProvider, useNav } from '@/contexts/NavContext';

// ── Topbar height — nav starts below this so toggle button is visible ──────────
const TOPBAR_H = 57; // px — must match AdminTopBar height

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { expanded, collapse } = useNav();

  return (
    <>
      <RouterLoadingOverlay />

      {/* Fixed nav overlay — sits on top of content */}
      <AdminLeftNavBar topOffset={TOPBAR_H} />

      {/*
        Invisible click-catcher overlay.
        Renders only when nav is expanded.
        Sits between the nav (z-index 100) and page content (z-index 0).
        Clicking it collapses the nav without triggering page interactions.
      */}
      {expanded && (
        <div
          onClick={collapse}
          style={{
            position:   'fixed',
            inset:      0,
            zIndex:     99,
            background: 'transparent',
            cursor:     'default',
          }}
        />
      )}

      {/* Page shell — always full viewport, never shifts */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Topbar — z-index 102, always above nav overlay */}
        <AdminTopBar />

        <main style={{
          flex:       1,
          background: '#f9fafb',
          padding:    '24px',
        }}>
          <div style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>

      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </NavProvider>
  );
}