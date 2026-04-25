import React from 'react';
import AdminLeftNavBar from '@/components/AdminUser/AdminLeftNavBar';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminLeftNavBar />
      <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminTopBar />
        <main style={{ flex: 1, background: '#f9fafb', padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}