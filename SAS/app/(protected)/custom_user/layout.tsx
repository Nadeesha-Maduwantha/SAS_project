'use client';

import React from 'react';
// Same design tokens the admin, super user and operation dashboards use.
import '@/styles/AdminStyles/theme.css';
import CustomUserLeftNavBar from '@/components/CustomUser/CustomUserLeftNavBar';
import RouterLoadingOverlay from '@/components/shared/RouterLoadingOverlay';
import { NavProvider } from '@/contexts/NavContext';
// Copy of SalesUser's nav/topbar, pointed at /custom_user/... routes — see
// components/CustomUser/. Kept separate so editing the real sales_user pages
// is never required to support custom user types.
import CustomUserTopBar from '@/components/CustomUser/CustomUserTopBar';

const TOPBAR_H = 57;

function CustomUserLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RouterLoadingOverlay />
      {/* Nav is a fixed overlay — starts below topbar, never pushes content */}
      <CustomUserLeftNavBar topOffset={TOPBAR_H} />
      {/* Content is always full viewport width — centered with maxWidth */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <CustomUserTopBar />
        <main style={{ flex: 1, background: '#f9fafb', padding: '24px' }}>
          <div style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default function CustomUserLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavProvider>
      <CustomUserLayoutInner>{children}</CustomUserLayoutInner>
    </NavProvider>
  );
}