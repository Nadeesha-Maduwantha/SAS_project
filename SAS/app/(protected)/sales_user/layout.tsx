'use client';

import React from 'react';
import SalesLeftNavBar from '@/components/SalesUser/SalesLeftNavBar';
import RouterLoadingOverlay from '@/components/shared/RouterLoadingOverlay';
import { NavProvider } from '@/contexts/NavContext';
// ↓ Re-use your existing sales topbar — update it to match AdminTopBar:
//   remove any hamburger button, add company logo image, set z-index: 102
import SalesTopBar from '@/components/SalesUser/SalesLeftNavBar';

const TOPBAR_H = 57;

function SalesLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RouterLoadingOverlay />
      {/* Nav is a fixed overlay — starts below topbar, never pushes content */}
      <SalesLeftNavBar topOffset={TOPBAR_H} />
      {/* Content is always full viewport width — centered with maxWidth */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <SalesTopBar />
        <main style={{ flex: 1, background: '#f9fafb', padding: '24px' }}>
          <div style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavProvider>
      <SalesLayoutInner>{children}</SalesLayoutInner>
    </NavProvider>
  );
}