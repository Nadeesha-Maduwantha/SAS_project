'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Truck,
  Clock,
  Settings,
  ChevronDown,
  Shield,
  User,
  Bell,
  LogOut,
} from 'lucide-react';

import '../../styles/ComponentStyles/SalesLeftNavBar.css';

type Props = {
  userName?: string;
  roleLabel?: string;
};

export default function SalesLeftNavBar({
  userName = 'Alex Morgan',
  roleLabel = 'SALES USER',
}: Props) {
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
    <aside className="sales-nav-container">
      {/* Top */}
      <div className="sales-nav-top">
        {/* Header */}
        <div className="nav-header">
          <div className="nav-logo" onClick={() => handleNavigation('/sales_user/dashboard')}>
            <Shield className="logo-icon" />
            <span className="logo-text">SAS Alert</span>
          </div>
        </div>

        {/* My Dashboard */}
        <button
          className={`nav-dashboard-btn ${isActiveRoute('/sales_user/dashboard') ? 'active' : ''}`}
          onClick={() => handleNavigation('/sales_user/dashboard')}
        >
          <LayoutGrid className="nav-icon" />
          <span>My Dashboard</span>
        </button>

        {/* My Shipments (single) */}
        <button
          className={`nav-single-btn ${isActiveRoute('/sales_user/shipments') ? 'active' : ''}`}
          onClick={() => handleNavigation('/sales_user/shipments')}
        >
          <Truck className="nav-icon" />
          <span>My Shipments</span>
        </button>

        {/* History (label-like single item) */}
        <button
          className={`nav-history-btn ${isActiveRoute('/sales_user/history') ? 'active' : ''}`}
          onClick={() => handleNavigation('/sales_user/history')}
        >
          <Clock className="nav-icon" />
          <span className="nav-history-text">HISTORY</span>
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
                className={`nav-item ${isActiveRoute('/sales_user/settings/profile') ? 'active' : ''}`}
                onClick={() => handleNavigation('/sales_user/settings/profile')}
              >
                <User className="nav-item-icon" />
                <span>My Profile</span>
              </button>

              <button
                className={`nav-item ${isActiveRoute('/sales_user/settings/notifications') ? 'active' : ''}`}
                onClick={() => handleNavigation('/sales_user/settings/notifications')}
              >
                <Bell className="nav-item-icon" />
                <span>Notification Preferences</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </aside>
  );
}