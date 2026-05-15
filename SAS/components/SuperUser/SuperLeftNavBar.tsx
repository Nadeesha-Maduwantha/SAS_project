'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid, FileText, Bell, Settings,
  ChevronDown, Shield, Users, MapPin,
} from 'lucide-react';

import '../../styles/ComponentStyles/SuperLeftNavBar.css';

type Props = {
  alertsCount?: number;
};

export default function SuperLeftNavBar({ alertsCount = 0 }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [expandedSections, setExpandedSections] = useState({
    shipments: false,
    alerts: false,
    milestones: false,
    userManagement: false,
    settings: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleNavigation = (path: string) => router.push(path);

  const isActiveRoute = (path: string) => {
    if (!pathname) return false;
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <div className="super-nav-container">

      {/* Header */}
      <div className="nav-header">
        <div className="nav-logo" onClick={() => handleNavigation('/Super_user/dashboard')}>
          <Shield className="logo-icon" />
          <span className="logo-text">SAS Alert</span>
        </div>
      </div>

      {/* Dashboard */}
      <button
        className={`nav-dashboard-btn ${isActiveRoute('/Super_user/dashboard') ? 'active' : ''}`}
        onClick={() => handleNavigation('/Super_user/dashboard')}
      >
        <LayoutGrid className="nav-icon" />
        <span>My Dashboard</span>
      </button>

      {/* Shipments */}
      <div className="nav-section">
        <button className="nav-section-header" onClick={() => toggleSection('shipments')}>
          <FileText className="nav-icon" />
          <span>Shipments</span>
          <ChevronDown className={`chevron-icon ${expandedSections.shipments ? 'expanded' : ''}`} />
        </button>
        {expandedSections.shipments && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/Super_user/shipments') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/shipments')}
            >
              Active Shipments
            </button>
          </div>
        )}
      </div>

      {/* Alerts */}
      <div className="nav-section">
        <button className="nav-section-header" onClick={() => toggleSection('alerts')}>
          <Bell className="nav-icon" />
          <span>Alerts{alertsCount > 0 ? ` (${alertsCount})` : ''}</span>
          <ChevronDown className={`chevron-icon ${expandedSections.alerts ? 'expanded' : ''}`} />
        </button>
        {expandedSections.alerts && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/Super_user/alerts') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/alerts')}
            >
              All Alerts
            </button>
          </div>
        )}
      </div>

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
              className={`nav-item ${isActiveRoute('/Super_user/milestone_templates_list') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/milestone_templates_list')}
            >
              Templates List
            </button>
            <button
              className={`nav-item ${isActiveRoute('/Super_user/milestone_template_create') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/milestone_template_create')}
            >
              Create Template
            </button>
            <button
              className={`nav-item ${isActiveRoute('/Super_user/current_milestone') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/current_milestone')}
            >
              Current Milestones
            </button>

          </div>
        )}
      </div>

      {/* User Management */}
      <div className="nav-section">
        <button className="nav-section-header" onClick={() => toggleSection('userManagement')}>
          <Users className="nav-icon" />
          <span>User Management</span>
          <ChevronDown className={`chevron-icon ${expandedSections.userManagement ? 'expanded' : ''}`} />
        </button>
        {expandedSections.userManagement && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/Super_user/create-user') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/create-user')}
            >
              Add New User
            </button>
            <button
              className={`nav-item ${isActiveRoute('/Super_user/edit-user') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/edit-user')}
            >
              Edit User
            </button>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="nav-section">
        <button className="nav-section-header" onClick={() => toggleSection('settings')}>
          <Settings className="nav-icon" />
          <span>Settings</span>
          <ChevronDown className={`chevron-icon ${expandedSections.settings ? 'expanded' : ''}`} />
        </button>
        {expandedSections.settings && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/Super_user/profile') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/profile')}
            >
              My Profile
            </button>
          </div>
        )}
      </div>

    </div>
  );
}