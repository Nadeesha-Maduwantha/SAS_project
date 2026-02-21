'use client';

import { Bell, HelpCircle, Search } from 'lucide-react';

export default function Topbar() {
    return (
        <header style={{
            height: '56px',
            background: 'white',
            borderBottom: '1px solid #e8ecf0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '28px',
                    height: '28px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                }}>
                    🚚
                </div>
                <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a2e', letterSpacing: '-0.3px' }}>
                    Dart Global Logistic SAS System
                </span>
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Search */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#f5f7fa',
                    border: '1px solid #e8ecf0',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    width: '220px',
                }}>
                    <Search size={14} color="#9ca3af" />
                    <input
                        placeholder="Search alerts, IDs..."
                        style={{
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            fontSize: '13px',
                            color: '#374151',
                            width: '100%',
                        }}
                    />
                </div>

                {/* Bell */}
                <div style={{ position: 'relative', cursor: 'pointer' }}>
                    <Bell size={18} color="#6b7280" />
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        width: '8px',
                        height: '8px',
                        background: '#ef4444',
                        borderRadius: '50%',
                        border: '1.5px solid white',
                    }} />
                </div>

                {/* Help */}
                <HelpCircle size={18} color="#6b7280" style={{ cursor: 'pointer' }} />

                {/* User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e' }}>Amal perera</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>Super Admin</div>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                        }}>
                            AP
                        </div>
                        <span style={{
                            position: 'absolute',
                            bottom: '1px',
                            right: '1px',
                            width: '8px',
                            height: '8px',
                            background: '#22c55e',
                            borderRadius: '50%',
                            border: '1.5px solid white',
                        }} />
                    </div>
                </div>
            </div>
        </header>
    );
}
