import React from 'react';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';
import SalesLeftNavBar from '@/components/SalesUser/SalesLeftNavBar';

export default function OperationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SalesLeftNavBar/>
      <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminTopBar/>
        <main style={{ flex: 1, background: '#f9fafb', padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}