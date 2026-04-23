import React from 'react';
import SalesLeftNavBar from '@/components/SalesUser/SalesLeftNavBar';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SalesLeftNavBar />
      <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminTopBar/>
        <main style={{ flex: 1, background: '#f9fafb' }}>
          {children}
        </main>
      </div>
    </div>
  );
}