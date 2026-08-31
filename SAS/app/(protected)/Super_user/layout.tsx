'use client';

import React from 'react';
// Same design tokens the admin dashboard uses — one type scale, one palette.
import '@/styles/AdminStyles/theme.css';
import SuperLeftNavBar from '@/components/SuperUser/SuperLeftNavBar';
import RouterLoadingOverlay from '@/components/shared/RouterLoadingOverlay';
import { NavProvider } from '@/contexts/NavContext';
// ↓ Re-use your existing super topbar — update it to match AdminTopBar:
//   remove any hamburger button, add company logo image, set z-index: 102
import SuperTopBar from '@/components/SuperUser/SuperTopBar';

const TOPBAR_H = 57;

function SuperLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RouterLoadingOverlay />
      <SuperLeftNavBar topOffset={TOPBAR_H} />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <SuperTopBar />
        <main style={{ flex: 1, background: '#f9fafb', padding: '24px' }}>
          <div style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavProvider>
      <SuperLayoutInner>{children}</SuperLayoutInner>
    </NavProvider>
  );
}