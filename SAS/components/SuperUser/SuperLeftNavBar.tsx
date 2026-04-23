'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid,
  FileText,
  Bell,
  Clock,
  Settings,
  ChevronDown,
  Shield,
  Users,
  Plus,
} from 'lucide-react';

import '../../styles/ComponentStyles/SuperLeftNavBar.css';

type Props = {
  alertsCount?: number;
};

export default function SuperLeftNavBar({ alertsCount = 0 }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [expandedSections, setExpandedSections] = useState({
    shipments: true,
    alerts: true,
    userManagement: false,
    history: false,
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
    <div className="super-nav-container">
      {/* Header */}
      <div className="nav-header">
        <div className="nav-logo" onClick={() => handleNavigation('/super_user/dashboard')}>
          <Shield className="logo-icon" />
          <span className="logo-text">SAS Alert</span>
        </div>
      </div>

      {/* Dashboard */}
      <button
        className={`nav-dashboard-btn ${isActiveRoute('/super_user/dashboard') ? 'active' : ''}`}
        onClick={() => handleNavigation('/super_user/dashboard')}
      >
        <LayoutGrid className="nav-icon" />
        <span>My Dashboard</span>
      </button>

      {/* Shipments */}
      <div className="nav-section">
        <button
          className="nav-section-header"
          onClick={() => toggleSection('shipments')}
        >
          <FileText className="nav-icon" />
          <span>Shipments</span>
          <ChevronDown
            className={`chevron-icon ${expandedSections.shipments ? 'expanded' : ''}`}
          />
        </button>

        {expandedSections.shipments && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/Super_user/shipments') && !pathname.includes('/archive') && !pathname.includes('/delayed') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/shipments')}
            >
              Active Shipments
            </button>

            <button
              className={`nav-item ${isActiveRoute('/Super_user/shipments/delayed') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/shipments/delayed')}
            >
              Critical Milestones
            </button>

            <button
              className={`nav-item ${isActiveRoute('/Super_user/shipments/archive') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/shipments/archive')}
            >
              Archive
            </button>
          </div>
        )}
      </div>
      


      {/* Alerts */}
      <div className="nav-section">
        <button
          className="nav-section-header"
          onClick={() => toggleSection('alerts')}
        >
          <Bell className="nav-icon" />
          <span>Alerts{alertsCount > 0 ? ` (${alertsCount})` : ''}</span>
          <ChevronDown
            className={`chevron-icon ${expandedSections.alerts ? 'expanded' : ''}`}
          />
        </button>

        {expandedSections.alerts && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/Super_user/alerts') && !pathname.includes('/my-alerts') && !pathname.includes('/resolved') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/alerts')}
            >
              All Alerts
            </button>

            <button
              className={`nav-item ${isActiveRoute('/Super_user/alerts/my-alerts') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/alerts/my-alerts')}
            >
              My Alerts
            </button>

            <button
              className={`nav-item ${isActiveRoute('/Super_user/alerts/resolved') ? 'active' : ''}`}
              onClick={() => handleNavigation('/Super_user/alerts/resolved')}
            >
              Resolved
            </button>
          </div>
        )}
      </div>
      {/* User Management */}
<div className="nav-section">
  <button
    className="nav-section-header"
    onClick={() => toggleSection('userManagement')}
  >
    <Users className="nav-icon" />
    <span>User Management</span>
    <ChevronDown
      className={`chevron-icon ${expandedSections.userManagement ? 'expanded' : ''}`}
    />
  </button>

  {expandedSections.userManagement && (
    <div className="nav-section-content">
      <button
        className={`nav-item ${isActiveRoute('/super_user/users') && !pathname.includes('add-user') && !pathname.includes('activity') ? 'active' : ''}`}
        onClick={() => handleNavigation('/super_user/users')}
      >
        All Users
      </button>

      {/* ✅ NEW ITEM */}
      <button
        className={`nav-item ${isActiveRoute('/super_user/users/add-user') ? 'active' : ''}`}
        onClick={() => handleNavigation('/super_user/users/add-user')}
      >
        Add New User
      </button>

      <button
        className={`nav-item ${isActiveRoute('/super_user/users/activity') ? 'active' : ''}`}
        onClick={() => handleNavigation('/super_user/users/activity')}
      >
        Activity Logs
      </button>
    </div>
  )}
</div>

      

      {/* History */}
      <div className="nav-section">
        <button
          className="nav-section-header"
          onClick={() => toggleSection('history')}
        >
          <Clock className="nav-icon" />
          <span>History</span>
          <ChevronDown
            className={`chevron-icon ${expandedSections.history ? 'expanded' : ''}`}
          />
        </button>

        {expandedSections.history && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/super_user/history/department') ? 'active' : ''}`}
              onClick={() => handleNavigation('/super_user/history/department')}
            >
              Department History
            </button>

            <button
              className={`nav-item ${isActiveRoute('/super_user/history/team-activity') ? 'active' : ''}`}
              onClick={() => handleNavigation('/super_user/history/team-activity')}
            >
              Team Activity
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
              className={`nav-item ${isActiveRoute('/super_user/settings/profile') ? 'active' : ''}`}
              onClick={() => handleNavigation('/super_user/settings/profile')}
            >
              My Profile
            </button>

            <button
              className={`nav-item ${isActiveRoute('/super_user/settings/notifications') ? 'active' : ''}`}
              onClick={() => handleNavigation('/super_user/settings/notifications')}
            >
              Notification Preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
}