'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid, FileText, Bell, Settings,
  ChevronDown, MapPin, Users, TableProperties, Menu,
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
      {icon}<CollapseTooltip text={tooltip} />
    </button>
  );
}

function Section({ icon, label, isOpen, onToggle, children, showLabel }: {
  icon: React.ReactNode; label: string;
  isOpen: boolean; onToggle: () => void; children: React.ReactNode;
  showLabel: boolean;
}) {
  return (
    <div className="nav-section">
      <button className="nav-section-header" onClick={onToggle}>
        {icon}
        {showLabel && <span>{label}</span>}
        {showLabel && <ChevronDown className={`chevron-icon ${isOpen ? 'expanded' : ''}`} />}
      </button>
      {isOpen && showLabel && <div className="nav-section-content">{children}</div>}
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

export default function SuperLeftNavBar({ topOffset = 57, alertsCount = 0 }: {
  topOffset?: number; alertsCount?: number;
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const { expanded, toggle, expand, collapse } = useNav();

  // Collapse the expanded nav when the user clicks anywhere outside it.
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) collapse();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [expanded, collapse]);

  // Show labels only after slide animation completes (340ms = 0.35s CSS transition)
  const [fullyExpanded, setFullyExpanded] = useState(false);

  useEffect(() => {
    if (expanded) {
      const t = setTimeout(() => setFullyExpanded(true), 340);
      return () => clearTimeout(t);
    } else {
      setFullyExpanded(false);
    }
  }, [expanded]);

  const [open, setOpen] = useState({
    shipments: false, alerts: false, milestones: false,
    userManagement: false, customTables: false, settings: false,
  });

  // Reset all sections when nav collapses
  useEffect(() => {
    if (!expanded) {
      setOpen({
        shipments: false, alerts: false, milestones: false,
        userManagement: false, customTables: false, settings: false,
      });
    }
  }, [expanded]);

  const tog    = (k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] }));
  const go     = (path: string) => router.push(path);
  const active = (path: string) =>
    !!pathname && (pathname === path || pathname.startsWith(path + '/'));

  const ip = { size: 19, strokeWidth: 1.8 };
  const containerStyle: React.CSSProperties = {
    top: topOffset, height: `calc(100vh - ${topOffset}px)`,
  };

  // ── Collapsed ────────────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="admin-nav-container collapsed" style={containerStyle}>
        <button className="nav-toggle-btn" onClick={toggle} title="Expand sidebar">
          <Menu size={18} /><CollapseTooltip text="Expand sidebar" />
        </button>
        <div className="nav-collapsed-divider" />
        <IconBtn icon={<LayoutGrid      {...ip} />} tooltip="My Dashboard"    onClick={expand} />
        <IconBtn icon={<FileText        {...ip} />} tooltip="Shipments"       onClick={expand} />
        <IconBtn icon={<Bell            {...ip} />} tooltip="Alerts"          onClick={expand} />
        <IconBtn icon={<MapPin          {...ip} />} tooltip="Milestones"      onClick={expand} />
        <IconBtn icon={<Users           {...ip} />} tooltip="User Management" onClick={expand} />
        <IconBtn icon={<TableProperties {...ip} />} tooltip="Custom Tables"   onClick={expand} />
        <IconBtn icon={<Settings        {...ip} />} tooltip="Settings"        onClick={expand} />
      </div>
    );
  }

  // ── Expanded ─────────────────────────────────────────────────────────────────
  return (
    <div ref={navRef} className="admin-nav-container expanded" style={containerStyle}>
      <div className="nav-top-row">
        <button className="nav-toggle-btn-expanded" onClick={toggle} title="Collapse sidebar">
          <Menu size={18} />
        </button>
      </div>

      {/* Dashboard */}
      <button
        className={`nav-dashboard-btn ${active('/Super_user/dashboard') ? 'active' : ''}`}
        onClick={() => go('/Super_user/dashboard')}
      >
        <LayoutGrid className="nav-icon" />
        {fullyExpanded && <span>My Dashboard</span>}
      </button>

      {/* Shipments */}
      <Section
        icon={<FileText className="nav-icon" />}
        label="Shipments"
        isOpen={open.shipments}
        onToggle={() => tog('shipments')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="Active Shipments"
          isActive={pathname === '/Super_user/shipments'}
          onClick={() => go('/Super_user/shipments')}
        />
        <NavItem
          label="Archive Shipments"
          isActive={active('/Super_user/shipments/archive')}
          onClick={() => go('/Super_user/shipments/archive')}
        />
      </Section>

      {/* Alerts */}
      <Section
        icon={<Bell className="nav-icon" />}
        label={`Alerts${alertsCount > 0 ? ` (${alertsCount})` : ''}`}
        isOpen={open.alerts}
        onToggle={() => tog('alerts')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="All Alerts"
          isActive={active('/Super_user/alerts')}
          onClick={() => go('/Super_user/alerts')}
        />
      </Section>

      {/* Milestones */}
      <Section
        icon={<MapPin className="nav-icon" />}
        label="Milestones"
        isOpen={open.milestones}
        onToggle={() => tog('milestones')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="Templates List"
          isActive={active('/Super_user/milestone_templates_list')}
          onClick={() => go('/Super_user/milestone_templates_list')}
        />
        <NavItem
          label="Create Template"
          isActive={active('/Super_user/milestone_template_create')}
          onClick={() => go('/Super_user/milestone_template_create')}
        />
        <NavItem
          label="Current Milestones"
          isActive={active('/Super_user/current_milestone')}
          onClick={() => go('/Super_user/current_milestone')}
        />
      </Section>

      {/* User Management */}
      <Section
        icon={<Users className="nav-icon" />}
        label="User Management"
        isOpen={open.userManagement}
        onToggle={() => tog('userManagement')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="Add New User"
          isActive={active('/Super_user/create-user')}
          onClick={() => go('/Super_user/create-user')}
        />
        <NavItem
          label="Edit User"
          isActive={active('/Super_user/edit-user')}
          onClick={() => go('/Super_user/edit-user')}
        />
      </Section>

      {/* Custom Tables */}
      <Section
        icon={<TableProperties className="nav-icon" />}
        label="Custom Tables"
        isOpen={open.customTables}
        onToggle={() => tog('customTables')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="My Tables"
          isActive={active('/Super_user/custom_tables')}
          onClick={() => go('/Super_user/custom_tables')}
        />
      </Section>

      {/* Settings */}
      <Section
        icon={<Settings className="nav-icon" />}
        label="Settings"
        isOpen={open.settings}
        onToggle={() => tog('settings')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="My Profile"
          isActive={active('/Super_user/profile')}
          onClick={() => go('/Super_user/profile')}
        />
      </Section>
    </div>
  );
}
