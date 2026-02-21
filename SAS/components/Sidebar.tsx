'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Building2,
    Package,
    Bell,
    AlertCircle,
    Clock,
    CheckCircle2,
    Settings,
    Shield,
    LogOut,
    ChevronDown,
    ChevronRight,
    Zap,
    LucideIcon,
} from 'lucide-react';

interface NavChild {
    label: string;
    icon: LucideIcon;
    href: string;
}

interface NavItem {
    label: string;
    icon: LucideIcon;
    href: string;
    active?: boolean;
    expandable?: boolean;
    defaultOpen?: boolean;
    children?: NavChild[];
}

const navItems: NavItem[] = [
    {
        label: 'My Dashboard',
        icon: LayoutDashboard,
        href: '/',
        active: true,
    },
    {
        label: 'User Management',
        icon: Users,
        href: '/admin/users',
        expandable: true,
    },
    {
        label: 'Department Management',
        icon: Building2,
        href: '/admin/departments',
        expandable: true,
    },
    {
        label: 'All Shipments',
        icon: Package,
        href: '/shipments',
        expandable: true,
    },
    {
        label: 'All Alerts',
        icon: Bell,
        href: '/alerts',
        expandable: true,
        defaultOpen: true,
        children: [
            { label: 'Active Alerts', icon: AlertCircle, href: '/super-user/alerts' },
            { label: 'Urgent Alerts', icon: Clock, href: '/super-user/alerts/urgent' },
            { label: 'Resolved Alerts', icon: CheckCircle2, href: '/super-user/alerts/resolved' },
        ],
    },
    {
        label: 'System Configuration',
        icon: Settings,
        href: '/admin/config',
        expandable: true,
    },
    {
        label: 'Security & Audit',
        icon: Shield,
        href: '/admin/security',
        expandable: true,
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ 'All Alerts': true });

    const toggleMenu = (label: string) => {
        setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    return (
        <aside style={{
            width: '200px',
            minWidth: '200px',
            height: '100vh',
            background: '#e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: 0,
            overflowY: 'auto',
        } as React.CSSProperties}>
            {/* Logo */}
            <div style={{
                padding: '20px 16px',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
            } as React.CSSProperties}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    background: 'linear-gradient(135deg, #4f8ef7 0%, #1d4ed8 100%)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                } as React.CSSProperties}>
                    <Zap size={18} color="white" />
                </div>
                <div>
                    <div style={{ color: '#1a1a2e', fontWeight: 700, fontSize: '11px', lineHeight: 1.2 }}>SAS SYSTEM</div>
                    <div style={{ color: '#6b7280', fontWeight: 400, fontSize: '9px' }}>MANAGEMENT</div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 0' }}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isOpen = openMenus[item.label];

                    return (
                        <div key={item.label}>
                            <button
                                onClick={() => item.expandable && toggleMenu(item.label)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 16px',
                                    background: item.active ? 'rgba(79,142,247,0.1)' : 'transparent',
                                    borderLeft: item.active ? '3px solid #4f8ef7' : '3px solid transparent',
                                    color: item.active ? '#3b82f6' : '#4b5563',
                                    cursor: 'pointer',
                                    borderTop: 'none',
                                    borderRight: 'none',
                                    borderBottom: 'none',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    fontWeight: item.active ? 600 : 500,
                                    transition: 'all 0.15s ease',
                                } as React.CSSProperties}
                            >
                                <Icon size={16} style={{ flexShrink: 0 }} />
                                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                                {item.expandable && (
                                    isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />
                                )}
                            </button>

                            {/* Children */}
                            {item.children && isOpen && (
                                <div style={{ background: 'rgba(0,0,0,0.03)' }}>
                                    {item.children.map((child) => {
                                        const ChildIcon = child.icon;
                                        return (
                                            <Link
                                                key={child.label}
                                                href={child.href}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '9px 16px 9px 36px',
                                                    color: pathname === child.href ? '#3b82f6' : '#6b7280',
                                                    background: pathname === child.href ? 'rgba(79,142,247,0.1)' : 'transparent',
                                                    fontSize: '12.5px',
                                                    fontWeight: pathname === child.href ? 600 : 500,
                                                    textDecoration: 'none',
                                                    transition: 'all 0.15s ease',
                                                } as React.CSSProperties}
                                            >
                                                <ChildIcon size={14} style={{ flexShrink: 0 }} />
                                                {child.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* User at bottom */}
            <div style={{
                padding: '14px 16px',
                borderTop: '1px solid rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
            } as React.CSSProperties}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '12px',
                    flexShrink: 0,
                } as React.CSSProperties}>
                    AM
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#1a1a2e', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Amal perera</div>
                    <div style={{ color: '#6b7280', fontSize: '10px' }}>SUPER ADMIN</div>
                </div>
                <button style={{
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                } as React.CSSProperties}>
                    <LogOut size={14} />
                </button>
            </div>
        </aside>
    );
}
