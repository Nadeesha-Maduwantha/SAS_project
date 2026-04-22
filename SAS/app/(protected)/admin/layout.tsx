import React from 'react';
import AdminLeftNavBar from '@/components/AdminUser/AdminLeftNavBar';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AdminTopBar />
      <div style={{ display: 'flex', flex: 1 }}>
        <AdminLeftNavBar />
        <main style={{ flex: 1, padding: '24px', background: '#f9fafb' }}>
          {children}
        </main>
      </div>
    </div>
  );
}