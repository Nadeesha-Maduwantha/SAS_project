'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid, Users, Building2, Truck, Bell,
  ShieldCheck, ChevronDown, RefreshCw,
  MapPin, TableProperties, Menu, Settings,
} from 'lucide-react';
import { useNav } from '@/contexts/NavContext';
import '@/styles/ComponentStyles/AdminLeftNavBar.css';

// ── Tooltip shown beside icon when nav is collapsed ────────────────────────────
function CollapseTooltip({ text }: { text: string }) {
  return <span className="nav-collapse-tooltip">{text}</span>;
}

// ── Icon-only button for collapsed state ───────────────────────────────────────
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

// ── Expandable section ─────────────────────────────────────────────────────────
// showLabel controls whether text is visible — delayed until animation completes
function Section({ icon, label, isOpen, onToggle, children, showLabel }: {
  icon:      React.ReactNode;
  label:     string;
  isOpen:    boolean;
  onToggle:  () => void;
  children:  React.ReactNode;
  showLabel: boolean;
}) {
  return (
    <div className="nav-section">
      <button className="nav-section-header" onClick={onToggle}>
        {icon}
        {showLabel && <span>{label}</span>}
        {showLabel && (
          <ChevronDown className={`chevron-icon ${isOpen ? 'expanded' : ''}`} />
        )}
      </button>
      {isOpen && showLabel && (
        <div className="nav-section-content">{children}</div>
      )}
    </div>
  );
}

// ── Single nav item ────────────────────────────────────────────────────────────
function NavItem({ label, isActive, onClick }: {
  label: string; isActive: boolean; onClick: () => void;
}) {
  return (
    <button className={`nav-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AdminLeftNavBar({ topOffset = 57 }: { topOffset?: number }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { expanded, toggle, expand } = useNav();

  // ── Show text labels only after the slide animation finishes ──────────────
  // Prevents labels from wrapping to 2 lines while width is still animating.
  // 340ms matches the 0.35s CSS transition on .admin-nav-container.
  const [fullyExpanded, setFullyExpanded] = useState(false);

  useEffect(() => {
    if (expanded) {
      const t = setTimeout(() => setFullyExpanded(true), 340);
      return () => clearTimeout(t);
    } else {
      setFullyExpanded(false); // hide text immediately when collapsing
    }
  }, [expanded]);

  // ── Section open/close state ───────────────────────────────────────────────
  const [open, setOpen] = useState({
    userManagement:       false,
    departmentManagement: false,
    shipments:            false,
    alerts:               false,
    customTables:         false,
    milestones:           false,
    securityAudit:        false,
  });

  // Close all sections when nav collapses so they don't re-open mid-animation
  useEffect(() => {
    if (!expanded) {
      setOpen({
        userManagement:       false,
        departmentManagement: false,
        shipments:            false,
        alerts:               false,
        customTables:         false,
        milestones:           false,
        securityAudit:        false,
      });
    }
  }, [expanded]);

  const toggleSec = (k: keyof typeof open) =>
    setOpen(p => ({ ...p, [k]: !p[k] }));

  const go = (path: string) => router.push(path);

  const active = (path: string, exact = false) => {
    if (!pathname) return false;
    return exact
      ? pathname === path
      : pathname === path || pathname.startsWith(path + '/');
  };

  const ip = { size: 19, strokeWidth: 1.8 };

  // Nav sits below topbar — inline style sets top + height
  const containerStyle: React.CSSProperties = {
    top:    topOffset,
    height: `calc(100vh - ${topOffset}px)`,
  };

  // ── Collapsed view ─────────────────────────────────────────────────────────
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
        <IconBtn icon={<Settings        {...ip} />} tooltip="System Settings" onClick={expand} />
        <IconBtn icon={<ShieldCheck     {...ip} />} tooltip="Security & Audit" onClick={expand} />
      </div>
    );
  }

  // ── Expanded view ──────────────────────────────────────────────────────────
  return (
    <div className="admin-nav-container expanded" style={containerStyle}>

      {/* Collapse toggle */}
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
        {fullyExpanded && <span>My Dashboard</span>}
      </button>

      {/* User Management */}
      <Section
        icon={<Users className="nav-icon" />}
        label="User Management"
        isOpen={open.userManagement}
        onToggle={() => toggleSec('userManagement')}
        showLabel={fullyExpanded}
      >
        <NavItem label="Add New User"  isActive={active('/admin/create_user')} onClick={() => go('/admin/create_user')} />
        <NavItem label="Edit User"     isActive={active('/admin/edit-user')}   onClick={() => go('/admin/edit-user')} />
        <NavItem label="Activity Logs" isActive={active('/admin/access-logs')} onClick={() => go('/admin/access-logs')} />
      </Section>

      {/* Department Management */}
      <Section
        icon={<Building2 className="nav-icon" />}
        label="Department Management"
        isOpen={open.departmentManagement}
        onToggle={() => toggleSec('departmentManagement')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="Departments"
          isActive={active('/admin/department_overview')}
          onClick={() => go('/admin/department_overview')}
        />
      </Section>

      {/* All Shipments */}
      <Section
        icon={<Truck className="nav-icon" />}
        label="All Shipments"
        isOpen={open.shipments}
        onToggle={() => toggleSec('shipments')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="Active Shipments"
          isActive={pathname === '/admin/shipments'}
          onClick={() => go('/admin/shipments')}
        />
        <NavItem
          label="Delayed Shipments"
          isActive={active('/admin/shipments/delayed')}
          onClick={() => go('/admin/shipments/delayed')}
        />
        <NavItem
          label="Archive"
          isActive={active('/admin/shipments/archive')}
          onClick={() => go('/admin/shipments/archive')}
        />
      </Section>

      {/* All Alerts */}
      <Section
        icon={<Bell className="nav-icon" />}
        label="All Alerts"
        isOpen={open.alerts}
        onToggle={() => toggleSec('alerts')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="All Alerts"
          isActive={active('/admin/alerts')}
          onClick={() => go('/admin/alerts')}
        />
        <NavItem
          label="Sales Digest Emails"
          isActive={active('/admin/sales-digest')}
          onClick={() => go('/admin/sales-digest')}
        />
      </Section>

      {/* Custom Tables */}
      <Section
        icon={<TableProperties className="nav-icon" />}
        label="Custom Tables"
        isOpen={open.customTables}
        onToggle={() => toggleSec('customTables')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="My Tables"
          isActive={active('/admin/custom_tables')}
          onClick={() => go('/admin/custom_tables')}
        />
      </Section>

      {/* Milestones */}
      <Section
        icon={<MapPin className="nav-icon" />}
        label="Milestones"
        isOpen={open.milestones}
        onToggle={() => toggleSec('milestones')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="Milestone Library"
          isActive={active('/admin/milestone_library')}
          onClick={() => go('/admin/milestone_library')}
        />
        <NavItem
          label="Templates List"
          isActive={active('/admin/milestone_templates_list')}
          onClick={() => go('/admin/milestone_templates_list')}
        />
        <NavItem
          label="Create Template"
          isActive={active('/admin/milestone_template_create')}
          onClick={() => go('/admin/milestone_template_create')}
        />
        <NavItem
          label="Current Milestones"
          isActive={active('/admin/current_milestone')}
          onClick={() => go('/admin/current_milestone')}
        />
        <NavItem
          label="Field Registry"
          isActive={active('/admin/field_registry')}
          onClick={() => go('/admin/field_registry')}
        />
      </Section>

      {/* Sync — single link, no dropdown */}
      <div className="nav-section">
        <button
          className={`nav-section-header ${active('/admin/sync', true) ? 'active' : ''}`}
          onClick={() => go('/admin/sync')}
        >
          <RefreshCw className="nav-icon" />
          {fullyExpanded && <span>Sync</span>}
        </button>
      </div>

      {/* System Settings — single link, no dropdown */}
      <div className="nav-section">
        <button
          className={`nav-section-header ${active('/admin/system_settings', true) ? 'active' : ''}`}
          onClick={() => go('/admin/system_settings')}
        >
          <Settings className="nav-icon" />
          {fullyExpanded && <span>System Settings</span>}
        </button>
      </div>

      {/* Security & Audit */}
      <Section
        icon={<ShieldCheck className="nav-icon" />}
        label="Security & Audit"
        isOpen={open.securityAudit}
        onToggle={() => toggleSec('securityAudit')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="Audit Logs"
          isActive={active('/admin/audit-trail')}
          onClick={() => go('/admin/audit-trail')}
        />
        <NavItem
          label="Security Settings"
          isActive={active('/admin/security-settings')}
          onClick={() => go('/admin/security-settings')}
        />
      </Section>

    </div>
  );
}