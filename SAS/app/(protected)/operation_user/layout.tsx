'use client';

import React from 'react';
import OperationLeftNavBar from '@/components/OperationUser/OperationLeftNavBar';
import RouterLoadingOverlay from '@/components/shared/RouterLoadingOverlay';
import { NavProvider } from '@/contexts/NavContext';
// ↓ Re-use your existing operations topbar — update it to match AdminTopBar:
//   remove any hamburger button, add company logo image, set z-index: 102
import OperationDashboardHeader from '@/components/OperationUser/OperationDashboardHeader';

const TOPBAR_H = 57;

function OperationLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RouterLoadingOverlay />
      <OperationLeftNavBar topOffset={TOPBAR_H} />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <OperationDashboardHeader />
        <main style={{ flex: 1, background: '#f9fafb', padding: '24px' }}>
          <div style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default function OperationLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavProvider>
      <OperationLayoutInner>{children}</OperationLayoutInner>
    </NavProvider>
  );
}