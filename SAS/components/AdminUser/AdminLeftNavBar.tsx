'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid,
  FileText,
  Bell,
  Users,
  Clock,
  Settings,
  ChevronDown,
  Shield,
  Plus,
} from 'lucide-react';
import '../../styles/ComponentStyles/AdminLeftNavBar.css';


export default function AdminLeftNavBar() {
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
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <div className="admin-nav-container">
      {/* Header */}
      <div className="nav-header">
        <div className="nav-logo">
          <Shield className="logo-icon" />
          <span className="logo-text">SAS Alert</span>
        </div>
      </div>

      {/* My Dashboard */}
      <button
        className={`nav-dashboard-btn ${isActiveRoute('/admin') && pathname === '/admin/dashboard' ? 'active' : ''}`}
        onClick={() => handleNavigation('/admin/dashboard')}
      >
        <LayoutGrid className="nav-icon" />
        <span>My Dashboard</span>
      </button>

      {/* Department Shipments */}
      <div className="nav-section">
        <button
          className="nav-section-header"
          onClick={() => toggleSection('shipments')}
        >
          <FileText className="nav-icon" />
          <span>Department Shipments</span>
          <ChevronDown
            className={`chevron-icon ${expandedSections.shipments ? 'expanded' : ''}`}
          />
        </button>
        {expandedSections.shipments && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/admin/shipments') && !pathname.includes('archive') && !pathname.includes('delayed') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/shipments')}
            >
              Active Shipments
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/shipments/delayed') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/shipments/delayed')}
            >
              Critical Milestones
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/shipments/archive') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/shipments/archive')}
            >
              Archive
            </button>
          </div>
        )}
      </div>

      {/* Create Template */}
      <button
        className="nav-create-btn"
        onClick={() => handleNavigation('/admin/templates')}
      >
        <Plus className="nav-icon" />
        <span>Create Template</span>
      </button>

      {/* Department Alerts */}
      <div className="nav-section">
        <button
          className="nav-section-header"
          onClick={() => toggleSection('alerts')}
        >
          <Bell className="nav-icon" />
          <span>Department Alerts</span>
          <ChevronDown
            className={`chevron-icon ${expandedSections.alerts ? 'expanded' : ''}`}
          />
        </button>
        {expandedSections.alerts && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/admin/alerts') && !pathname.includes('my-alerts') && !pathname.includes('resolved') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/alerts')}
            >
              All Team Alerts
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/alerts/my-alerts') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/alerts/my-alerts')}
            >
              My Alerts
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/alerts/resolved') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/alerts/resolved')}
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
              className={`nav-item ${isActiveRoute('/admin/users') && !pathname.includes('add-user') && !pathname.includes('activity') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/users')}
            >
              All Users
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/users/add-user') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/users/add-user')}
            >
              Add New User
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/users/activity') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/users/activity')}
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
              className={`nav-item ${isActiveRoute('/admin/history/department') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/history/department')}
            >
              Department History
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/history/team-activity') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/history/team-activity')}
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
              className={`nav-item ${isActiveRoute('/admin/settings/profile') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/settings/profile')}
            >
              My Profile
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/settings/notifications') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/settings/notifications')}
            >
              Notification Preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
