'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid, Truck, Bell, Settings,
  ChevronDown, MapPin, TableProperties, Menu,
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

export default function SalesLeftNavBar({ topOffset = 57 }: { topOffset?: number }) {
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
    milestones: false, customTables: false, settings: false,
  });

  // Reset all sections when nav collapses
  useEffect(() => {
    if (!expanded) {
      setOpen({ milestones: false, customTables: false, settings: false });
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
        <IconBtn icon={<LayoutGrid      {...ip} />} tooltip="My Dashboard"  onClick={expand} />
        <IconBtn icon={<Truck           {...ip} />} tooltip="My Shipments"  onClick={expand} />
        <IconBtn icon={<Bell            {...ip} />} tooltip="My Alerts"     onClick={expand} />
        <IconBtn icon={<MapPin          {...ip} />} tooltip="Milestones"    onClick={expand} />
        <IconBtn icon={<TableProperties {...ip} />} tooltip="Custom Tables" onClick={expand} />
        <IconBtn icon={<Settings        {...ip} />} tooltip="Settings"      onClick={expand} />
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
        className={`nav-dashboard-btn ${active('/sales_user/dashboard') ? 'active' : ''}`}
        onClick={() => go('/sales_user/dashboard')}
      >
        <LayoutGrid className="nav-icon" />
        {fullyExpanded && <span>My Dashboard</span>}
      </button>

      {/* My Shipments — single link */}
      <div className="nav-section">
        <button
          className={`nav-section-header ${active('/sales_user/shipments') ? 'active' : ''}`}
          onClick={() => go('/sales_user/shipments')}
        >
          <Truck className="nav-icon" />
          {fullyExpanded && <span>My Shipments</span>}
        </button>
      </div>

      {/* My Alerts — single link */}
      <div className="nav-section">
        <button
          className={`nav-section-header ${active('/sales_user/alerts') ? 'active' : ''}`}
          onClick={() => go('/sales_user/alerts')}
        >
          <Bell className="nav-icon" />
          {fullyExpanded && <span>My Alerts</span>}
        </button>
      </div>

      {/* Milestones */}
      <Section
        icon={<MapPin className="nav-icon" />}
        label="Milestones"
        isOpen={open.milestones}
        onToggle={() => tog('milestones')}
        showLabel={fullyExpanded}
      >
        <NavItem
          label="Current Milestones"
          isActive={active('/sales_user/current_milestone')}
          onClick={() => go('/sales_user/current_milestone')}
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
          isActive={active('/sales_user/custom_tables')}
          onClick={() => go('/sales_user/custom_tables')}
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
          isActive={active('/sales_user/profile')}
          onClick={() => go('/sales_user/profile')}
        />
      </Section>
    </div>
  );
}
