'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Package,
  Bell,
  Settings,
  ChevronDown,
  Shield,
  User,
} from 'lucide-react';

import '../../styles/ComponentStyles/OperationLeftNavBar.css';

type Props = {
  alertsCount?: number;
};

export default function OperationLeftNavBar({ alertsCount = 0 }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [expandedSections, setExpandedSections] = useState({
    settings: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActiveRoute = (path: string) => {
    if (!pathname) return false;
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <div className="op-nav-container">
      {/* Header */}
      <div className="nav-header">
        <div className="nav-logo" onClick={() => handleNavigation('/operation_user/dashboard')}>
          <Shield className="logo-icon" />
          <span className="logo-text">SAS ALERT</span>
        </div>
      </div>

      {/* My Dashboard */}
      <button
        className={`nav-dashboard-btn ${isActiveRoute('/operation_user/dashboard') ? 'active' : ''}`}
        onClick={() => handleNavigation('/operation_user/dashboard')}
      >
        <LayoutGrid className="nav-icon" />
        <span>My Dashboard</span>
      </button>

      {/* My Shipments (NO dropdown) */}
      <button
        className={`nav-single-btn ${isActiveRoute('/operation_user/shipments') ? 'active' : ''}`}
        onClick={() => handleNavigation('/operation_user/shipments')}
      >
        <Package className="nav-icon" />
        <span>My Shipments</span>
      </button>

      {/* My Alerts (NO dropdown) */}
      <button
        className={`nav-single-btn ${isActiveRoute('/operation_user/alerts') ? 'active' : ''}`}
        onClick={() => handleNavigation('/operation_user/alerts')}
      >
        <Bell className="nav-icon" />
        <span>My Alerts{alertsCount > 0 ? ` (${alertsCount})` : ''}</span>
      </button>

      {/* History (single) */}
      <button
        className={`nav-single-btn ${isActiveRoute('/operation_user/history') ? 'active' : ''}`}
        onClick={() => handleNavigation('/operation_user/history')}
      >
        <span className="nav-history-label">HISTORY</span>
      </button>

      {/* Settings (dropdown) */}
      <div className="nav-section">
        <button
          className="nav-section-header"
          onClick={() => toggleSection('settings')}
        >
          <Settings className="nav-icon" />
          <span>Settings</span>
          <ChevronDown
            className={`chevron-icon ${expandedSections.settings ? 'expanded' : ''}`}
          />
        </button>

        {expandedSections.settings && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/operation_user/settings/profile') ? 'active' : ''}`}
              onClick={() => handleNavigation('/operation_user/settings/profile')}
            >
              <User className="nav-item-icon" />
              <span>My Profile</span>
            </button>

            <button
              className={`nav-item ${isActiveRoute('/operation_user/settings/notifications') ? 'active' : ''}`}
              onClick={() => handleNavigation('/operation_user/settings/notifications')}
            >
              <Bell className="nav-item-icon" />
              <span>Notification Preferences</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}