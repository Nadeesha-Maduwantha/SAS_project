<<<<<<< HEAD
import AdminLeftNavBar from "@/components/AdminUser/AdminLeftNavBar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Navigation Bar */}
      <AdminLeftNavBar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
=======
import React from 'react';
import AdminLeftNavBar from '@/components/AdminUser/AdminLeftNavBar';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminLeftNavBar />
      {/* 260px matches the fixed nav width */}
      <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminTopBar />
        <main style={{ flex: 1, background: '#f9fafb' }}>
          {children}
        </main>
      </div>
    </div>
  );
>>>>>>> 21f793f1dab44f11c2278ee83fb129acbd8148ce
}