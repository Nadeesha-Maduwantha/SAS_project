'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid, Truck, Bell, Settings,
  ChevronDown, MapPin, TableProperties, Menu,
} from 'lucide-react';
import { useNav } from '@/contexts/NavContext';
// Reuse admin nav CSS — same classes, same behaviour
import '@/styles/ComponentStyles/AdminLeftNavBar.css';

function CollapseTooltip({ text }: { text: string }) {
  return <span className="nav-collapse-tooltip">{text}</span>;
}

function IconBtn({ icon, tooltip, onClick }: {
  icon: React.ReactNode; tooltip: string; onClick: () => void;
}) {
  return (
    <button className="nav-icon-btn" onClick={onClick} title={tooltip}>
      {icon}
      <CollapseTooltip text={tooltip} />
    </button>
  );
}

function Section({ icon, label, isOpen, onToggle, children }: {
  icon: React.ReactNode; label: string;
  isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="nav-section">
      <button className="nav-section-header" onClick={onToggle}>
        {icon}<span>{label}</span>
        <ChevronDown className={`chevron-icon ${isOpen ? 'expanded' : ''}`} />
      </button>
      {isOpen && <div className="nav-section-content">{children}</div>}
    </div>
  );
}

function NavItem({ label, isActive, onClick }: {
  label: string; isActive: boolean; onClick: () => void;
}) {
  return <button className={`nav-item ${isActive ? 'active' : ''}`} onClick={onClick}>{label}</button>;
}

export default function SalesLeftNavBar({ topOffset = 57 }: { topOffset?: number }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { expanded, toggle, expand } = useNav();

  const [open, setOpen] = useState({ milestones: false, customTables: false, settings: false });
  const tog = (k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] }));
  const go  = (path: string) => router.push(path);
  const active = (path: string) => !!pathname && (pathname === path || pathname.startsWith(path + '/'));

  const ip = { size: 19, strokeWidth: 1.8 };
  const containerStyle: React.CSSProperties = { top: topOffset, height: `calc(100vh - ${topOffset}px)` };

  // ── Collapsed ────────────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="admin-nav-container collapsed" style={containerStyle}>
        <button className="nav-toggle-btn" onClick={toggle} title="Expand sidebar">
          <Menu size={18} /><CollapseTooltip text="Expand sidebar" />
        </button>
        <div className="nav-collapsed-divider" />
        <IconBtn icon={<LayoutGrid      {...ip} />} tooltip="My Dashboard"   onClick={expand} />
        <IconBtn icon={<Truck           {...ip} />} tooltip="My Shipments"   onClick={expand} />
        <IconBtn icon={<Bell            {...ip} />} tooltip="My Alerts"      onClick={expand} />
        <IconBtn icon={<MapPin          {...ip} />} tooltip="Milestones"     onClick={expand} />
        <IconBtn icon={<TableProperties {...ip} />} tooltip="Custom Tables"  onClick={expand} />
        <IconBtn icon={<Settings        {...ip} />} tooltip="Settings"       onClick={expand} />
      </div>
    );
  }

  // ── Expanded ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-nav-container expanded" style={containerStyle}>
      <div className="nav-top-row">
        <button className="nav-toggle-btn-expanded" onClick={toggle} title="Collapse sidebar">
          <Menu size={18} />
        </button>
      </div>

      <button className={`nav-dashboard-btn ${active('/sales_user/dashboard') ? 'active' : ''}`} onClick={() => go('/sales_user/dashboard')}>
        <LayoutGrid className="nav-icon" /><span>My Dashboard</span>
      </button>

      <button className={`nav-section-header ${active('/sales_user/shipments') ? 'active' : ''}`} onClick={() => go('/sales_user/shipments')}>
        <Truck className="nav-icon" /><span>My Shipments</span>
      </button>

      <button className={`nav-section-header ${active('/sales_user/alerts') ? 'active' : ''}`} onClick={() => go('/sales_user/alerts')}>
        <Bell className="nav-icon" /><span>My Alerts</span>
      </button>

      <Section icon={<MapPin className="nav-icon" />} label="Milestones" isOpen={open.milestones} onToggle={() => tog('milestones')}>
        <NavItem label="Current Milestones" isActive={active('/sales_user/current_milestone')} onClick={() => go('/sales_user/current_milestone')} />
      </Section>

      <Section icon={<TableProperties className="nav-icon" />} label="Custom Tables" isOpen={open.customTables} onToggle={() => tog('customTables')}>
        <NavItem label="My Tables" isActive={active('/sales_user/custom_tables')} onClick={() => go('/sales_user/custom_tables')} />
      </Section>

      <Section icon={<Settings className="nav-icon" />} label="Settings" isOpen={open.settings} onToggle={() => tog('settings')}>
        <NavItem label="My Profile" isActive={active('/sales_user/profile')} onClick={() => go('/sales_user/profile')} />
      </Section>
    </div>
  );
}