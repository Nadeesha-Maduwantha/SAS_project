import React from 'react';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';
import SalesLeftNavBar from '@/components/SalesUser/SalesLeftNavBar';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AdminTopBar />
      <div style={{ display: 'flex', flex: 1 }}>
        <SalesLeftNavBar />
        <main style={{ flex: 1, padding: '24px', background: '#f9fafb' }}>
          {children}
        </main>
      </div>
    </div>
  );
}