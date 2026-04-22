import React from 'react';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';
import SuperLeftNavBar from '@/components/SuperUser/SuperLeftNavBar';

export default function SuperUserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AdminTopBar />
      <div style={{ display: 'flex', flex: 1 }}>
        <SuperLeftNavBar />
        <main style={{ flex: 1, padding: '24px', background: '#f9fafb' }}>
          {children}
        </main>
      </div>
    </div>
  );
}