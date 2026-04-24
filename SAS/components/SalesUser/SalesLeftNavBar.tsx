'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Truck,
  Bell,
  Settings,
  ChevronDown,
  Shield,
  MapPin,
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
    milestones: false,
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

        {/* My Shipments */}
        <button
          className={`nav-section-header ${isActiveRoute('/sales_user/shipments') ? 'active' : ''}`}
          onClick={() => handleNavigation('/sales_user/shipments')}
        >
          <Truck className="nav-icon" />
          <span>My Shipments</span>
        </button>

        {/* My Alerts */}
        <button
          className={`nav-section-header ${isActiveRoute('/sales_user/alerts') ? 'active' : ''}`}
          onClick={() => handleNavigation('/sales_user/alerts')}
        >
          <Bell className="nav-icon" />
          <span>My Alerts</span>
        </button>

        {/* Milestones */}
        <div className="nav-section">
          <button className="nav-section-header" onClick={() => toggleSection('milestones')}>
            <MapPin className="nav-icon" />
            <span>Milestones</span>
            <ChevronDown className={`chevron-icon ${expandedSections.milestones ? 'expanded' : ''}`} />
          </button>
          {expandedSections.milestones && (
            <div className="nav-section-content">
              <button
              className={`nav-item ${isActiveRoute('/Super_user/current_milestone') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/current_milestone')}
            >
              Current Milestones
            </button>
            </div>
          )}
        </div>

        {/* Settings */}
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
                className={`nav-item ${isActiveRoute('/sales_user/profile') ? 'active' : ''}`}
                onClick={() => handleNavigation('/sales_user/profile')}
              >
                <span>My Profile</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
}