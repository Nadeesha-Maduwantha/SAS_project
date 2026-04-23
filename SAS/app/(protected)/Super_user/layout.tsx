import React from 'react';
import SuperLeftNavBar from '@/components/SuperUser/SuperLeftNavBar';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';

export default function OperationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SuperLeftNavBar/>
      <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminTopBar/>
        <main style={{ flex: 1, background: '#f9fafb' }}>
          {children}
        </main>
      </div>
    </div>
  );
}