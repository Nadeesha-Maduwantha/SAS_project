import React from 'react';
<<<<<<< HEAD
import SalesLeftNavBar from '@/components/SalesUser/SalesLeftNavBar';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SalesLeftNavBar />
      <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminTopBar/>
        <main style={{ flex: 1, background: '#f9fafb' }}>
=======
import AdminTopBar from '@/components/AdminUser/AdminTopBar';
import SalesLeftNavBar from '@/components/SalesUser/SalesLeftNavBar';

export default function OperationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SalesLeftNavBar/>
      <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminTopBar/>
        <main style={{ flex: 1, background: '#f9fafb', padding: '24px' }}>
>>>>>>> 00b1f12198237ee758264d19ff4a22469f101a48
          {children}
        </main>
      </div>
    </div>
  );
}