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
  MapPin,
} from 'lucide-react';

import '../../styles/ComponentStyles/OperationLeftNavBar.css';

type Props = {
  alertsCount?: number;
};

export default function OperationLeftNavBar({ alertsCount = 0 }: Props) {
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

      {/* My Shipments */}
      <button
        className={`nav-section-header ${isActiveRoute('/operation_user/shipments') ? 'active' : ''}`}
        onClick={() => handleNavigation('/operation_user/shipments')}
      >
        <Package className="nav-icon" />
        <span>My Shipments</span>
      </button>

      {/* My Alerts */}
      <button
        className={`nav-section-header ${isActiveRoute('/operation_user/alerts') ? 'active' : ''}`}
        onClick={() => handleNavigation('/operation_user/alerts')}
      >
        <Bell className="nav-icon" />
        <span>My Alerts{alertsCount > 0 ? ` (${alertsCount})` : ''}</span>
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
              className={`nav-item ${isActiveRoute('/operation_user/shipment_milestones') ? 'active' : ''}`}
              onClick={() => handleNavigation('/operation_user/shipment_milestones')}
            >
              Shipment Milestones
            </button>
            <button
              className={`nav-item ${isActiveRoute('/operation_user/milestone_detail') ? 'active' : ''}`}
              onClick={() => handleNavigation('/operation_user/milestone_detail')}
            >
              Milestone Detail
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
              className={`nav-item ${isActiveRoute('/operation_user/profile') ? 'active' : ''}`}
              onClick={() => handleNavigation('/operation_user/profile')}
            >
              <span>My Profile</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}