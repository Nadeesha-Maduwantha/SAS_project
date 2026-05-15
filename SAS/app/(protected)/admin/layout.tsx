'use client';

import React from 'react';
import AdminLeftNavBar from '@/components/AdminUser/AdminLeftNavBar';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';
import RouterLoadingOverlay from '@/components/shared/RouterLoadingOverlay';
import { NavProvider, useNav } from '@/contexts/NavContext';

// ── Topbar height — nav starts below this so toggle button is visible ──────────
const TOPBAR_H = 57; // px — matches AdminTopBar padding/content height

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RouterLoadingOverlay />

      {/*
        Nav is a fixed overlay — sits on top of content, never pushes it.
        Starts below the topbar so the toggle button is always visible.
      */}
      <AdminLeftNavBar topOffset={TOPBAR_H} />

      {/*
        Content column — always full viewport width.
        No marginLeft = content never shifts when nav opens/closes.
        Nav simply covers the left portion when expanded (user-approved).
      */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Topbar — z-index 102 so it always renders above the nav overlay */}
        <AdminTopBar />

        <main style={{
          flex:       1,
          background: '#f9fafb',
          padding:    '24px',
        }}>
          {/*
            maxWidth + margin auto = content is always centered in the
            available viewport width regardless of nav state.
          */}
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