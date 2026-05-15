'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid, Users, Building2, Truck, Bell,
  ShieldCheck, ChevronDown, RefreshCw,
  MapPin, TableProperties, Menu,
} from 'lucide-react';
import { useNav } from '@/contexts/NavContext';
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
        {icon}
        <span>{label}</span>
        <ChevronDown className={`chevron-icon ${isOpen ? 'expanded' : ''}`} />
      </button>
      {isOpen && <div className="nav-section-content">{children}</div>}
    </div>
  );
}

function NavItem({ label, isActive, onClick }: {
  label: string; isActive: boolean; onClick: () => void;
}) {
  return (
    <button className={`nav-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AdminLeftNavBar({ topOffset = 57 }: { topOffset?: number }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { expanded, toggle, expand } = useNav();

  const [open, setOpen] = useState({
    userManagement: false, departmentManagement: false,
    shipments: false, alerts: false, customTables: false,
    milestones: false, securityAudit: false,
  });

  const toggleSec = (k: keyof typeof open) =>
    setOpen(p => ({ ...p, [k]: !p[k] }));

  const go = (path: string) => router.push(path);

  const active = (path: string, exact = false) => {
    if (!pathname) return false;
    return exact ? pathname === path : pathname === path || pathname.startsWith(path + '/');
  };

  const ip = { size: 19, strokeWidth: 1.8 };

  // Inline style sets top + height so nav starts below topbar
  const containerStyle: React.CSSProperties = {
    top:    topOffset,
    height: `calc(100vh - ${topOffset}px)`,
  };

  // ── Collapsed ───────────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="admin-nav-container collapsed" style={containerStyle}>
        <button className="nav-toggle-btn" onClick={toggle} title="Expand sidebar">
          <Menu size={18} />
          <CollapseTooltip text="Expand sidebar" />
        </button>
        <div className="nav-collapsed-divider" />
        <IconBtn icon={<LayoutGrid      {...ip} />} tooltip="My Dashboard"     onClick={expand} />
        <IconBtn icon={<Users           {...ip} />} tooltip="User Management"  onClick={expand} />
        <IconBtn icon={<Building2       {...ip} />} tooltip="Department Mgmt"  onClick={expand} />
        <IconBtn icon={<Truck           {...ip} />} tooltip="All Shipments"    onClick={expand} />
        <IconBtn icon={<Bell            {...ip} />} tooltip="All Alerts"       onClick={expand} />
        <IconBtn icon={<TableProperties {...ip} />} tooltip="Custom Tables"    onClick={expand} />
        <IconBtn icon={<MapPin          {...ip} />} tooltip="Milestones"       onClick={expand} />
        <IconBtn icon={<RefreshCw       {...ip} />} tooltip="Sync"             onClick={expand} />
        <IconBtn icon={<ShieldCheck     {...ip} />} tooltip="Security & Audit" onClick={expand} />
      </div>
    );
  }

  // ── Expanded ────────────────────────────────────────────────────────────────
  return (
    <div className="admin-nav-container expanded" style={containerStyle}>

      {/* Collapse button at top */}
      <div className="nav-top-row">
        <button className="nav-toggle-btn-expanded" onClick={toggle} title="Collapse sidebar">
          <Menu size={18} />
        </button>
      </div>

      {/* Dashboard */}
      <button
        className={`nav-dashboard-btn ${active('/admin/dashboard', true) ? 'active' : ''}`}
        onClick={() => go('/admin/dashboard')}
      >
        <LayoutGrid className="nav-icon" />
        <span>My Dashboard</span>
      </button>

      <Section icon={<Users className="nav-icon" />} label="User Management"
        isOpen={open.userManagement} onToggle={() => toggleSec('userManagement')}>
        <NavItem label="Add New User"  isActive={active('/admin/create_user')} onClick={() => go('/admin/create_user')} />
        <NavItem label="Edit User"     isActive={active('/admin/edit-user')}   onClick={() => go('/admin/edit-user')} />
        <NavItem label="Activity Logs" isActive={active('/admin/access-logs')} onClick={() => go('/admin/access-logs')} />
      </Section>

      <Section icon={<Building2 className="nav-icon" />} label="Department Management"
        isOpen={open.departmentManagement} onToggle={() => toggleSec('departmentManagement')}>
        <NavItem label="Departments" isActive={active('/admin/department_overview')} onClick={() => go('/admin/department_overview')} />
      </Section>

      <Section icon={<Truck className="nav-icon" />} label="All Shipments"
        isOpen={open.shipments} onToggle={() => toggleSec('shipments')}>
        <NavItem label="Active Shipments"  isActive={pathname === '/admin/shipments'}    onClick={() => go('/admin/shipments')} />
        <NavItem label="Delayed Shipments" isActive={active('/admin/shipments/delayed')} onClick={() => go('/admin/shipments/delayed')} />
        <NavItem label="Archive"           isActive={active('/admin/shipments/archive')} onClick={() => go('/admin/shipments/archive')} />
      </Section>

      <Section icon={<Bell className="nav-icon" />} label="All Alerts"
        isOpen={open.alerts} onToggle={() => toggleSec('alerts')}>
        <NavItem label="All Alerts" isActive={active('/admin/alerts')} onClick={() => go('/admin/alerts')} />
      </Section>

      <Section icon={<TableProperties className="nav-icon" />} label="Custom Tables"
        isOpen={open.customTables} onToggle={() => toggleSec('customTables')}>
        <NavItem label="My Tables" isActive={active('/admin/custom_tables')} onClick={() => go('/admin/custom_tables')} />
      </Section>

      <Section icon={<MapPin className="nav-icon" />} label="Milestones"
        isOpen={open.milestones} onToggle={() => toggleSec('milestones')}>
        <NavItem label="Templates List"     isActive={active('/admin/milestone_templates_list')}  onClick={() => go('/admin/milestone_templates_list')} />
        <NavItem label="Create Template"    isActive={active('/admin/milestone_template_create')} onClick={() => go('/admin/milestone_template_create')} />
        <NavItem label="Current Milestones" isActive={active('/admin/current_milestones')}        onClick={() => go('/admin/current_milestones')} />
      </Section>

      <div className="nav-section">
        <button className={`nav-section-header ${active('/admin/sync', true) ? 'active' : ''}`} onClick={() => go('/admin/sync')}>
          <RefreshCw className="nav-icon" />
          <span>Sync</span>
        </button>
      </div>

      <Section icon={<ShieldCheck className="nav-icon" />} label="Security & Audit"
        isOpen={open.securityAudit} onToggle={() => toggleSec('securityAudit')}>
        <NavItem label="Audit Logs"        isActive={active('/admin/audit-trail')}       onClick={() => go('/admin/audit-trail')} />
        <NavItem label="Security Settings" isActive={active('/admin/security-settings')} onClick={() => go('/admin/security-settings')} />
      </Section>

    </div>
  );
}