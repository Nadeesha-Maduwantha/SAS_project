'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Users,
  Building2,
  Truck,
  Bell,
  SlidersHorizontal,
  Shield,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

import '../../styles/ComponentStyles/AdminLeftNavBar.css';

export default function AdminLeftNavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const [expandedSections, setExpandedSections] = useState({
    userManagement: false,
    departmentManagement: false,
    shipments: false,
    alerts: false,
    systemConfig: false,
    securityAudit: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActiveRoute = (path: string) => {
    if (!pathname) return false;
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <div className="admin-nav-container">
      {/* Header */}
      <div className="nav-header">
        <div className="nav-logo" onClick={() => handleNavigation('/admin/dashboard')}>
          <Shield className="logo-icon" />
          <div className="logo-textWrap">
            <span className="logo-text">SAS SYSTEM</span>
            <span className="logo-subtext">MANAGEMENT</span>
          </div>
        </div>
      </div>

      {/* My Dashboard */}
      <button
        className={`nav-dashboard-btn ${isActiveRoute('/admin/dashboard') ? 'active' : ''}`}
        onClick={() => handleNavigation('/admin/dashboard')}
      >
        <LayoutGrid className="nav-icon" />
        <span>My Dashboard</span>
      </button>

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
              className={`nav-item ${isActiveRoute('/admin/users/edit-user') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/users/edit-user')}
            >
              Edit User
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

      {/* Department Management */}
      <div className="nav-section">
        <button
          className="nav-section-header"
          onClick={() => toggleSection('departmentManagement')}
        >
          <Building2 className="nav-icon" />
          <span>Department Management</span>
          <ChevronDown
            className={`chevron-icon ${expandedSections.departmentManagement ? 'expanded' : ''}`}
          />
        </button>

        {expandedSections.departmentManagement && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/admin/departments') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/departments')}
            >
              Departments
            </button>

            <button
              className={`nav-item ${isActiveRoute('/admin/departments/assign') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/departments/assign')}
            >
              Assign Managers
            </button>
          </div>
        )}
      </div>

      {/* All Shipments */}
      <div className="nav-section">
        <button className="nav-section-header" onClick={() => toggleSection('shipments')}>
          <Truck className="nav-icon" />
          <span>All Shipments</span>
          <ChevronDown className={`chevron-icon ${expandedSections.shipments ? 'expanded' : ''}`} />
        </button>

        {expandedSections.shipments && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${
                isActiveRoute('/admin/shipments') &&
                !pathname.includes('/delayed') &&
                !pathname.includes('/archive')
                  ? 'active'
                  : ''
              }`}
              onClick={() => handleNavigation('/admin/shipments')}
            >
              Active Shipments
            </button>

            <button
              className={`nav-item ${isActiveRoute('/admin/shipments/delayed') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/shipments/delayed')}
            >
              Delayed shipment
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

      {/* All Alerts */}
      <div className="nav-section">
        <button className="nav-section-header" onClick={() => toggleSection('alerts')}>
          <Bell className="nav-icon" />
          <span>All Alerts</span>
          <ChevronDown className={`chevron-icon ${expandedSections.alerts ? 'expanded' : ''}`} />
        </button>

        {expandedSections.alerts && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${
                isActiveRoute('/admin/alerts') &&
                !pathname.includes('/urgent') &&
                !pathname.includes('/resolved')
                  ? 'active'
                  : ''
              }`}
              onClick={() => handleNavigation('/admin/alerts')}
            >
              All Alerts
            </button>

            <button
              className={`nav-item ${isActiveRoute('/admin/alerts/urgent') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/alerts/urgent')}
            >
              Urgent Alerts
            </button>

            <button
              className={`nav-item ${isActiveRoute('/admin/alerts/resolved') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/alerts/resolved')}
            >
              Resolved Alerts
            </button>
          </div>
        )}
      </div>

      {/* System Configuration */}
      <div className="nav-section">
        <button className="nav-section-header" onClick={() => toggleSection('systemConfig')}>
          <SlidersHorizontal className="nav-icon" />
          <span>System Configuration</span>
          <ChevronDown className={`chevron-icon ${expandedSections.systemConfig ? 'expanded' : ''}`} />
        </button>

        {expandedSections.systemConfig && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/admin/config') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/config')}
            >
              Settings
            </button>

            <button
              className={`nav-item ${isActiveRoute('/admin/config/rules') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/config/rules')}
            >
              Alert Rules
            </button>
          </div>
        )}
      </div>

      {/* Security & Audit */}
      <div className="nav-section">
        <button className="nav-section-header" onClick={() => toggleSection('securityAudit')}>
          <ShieldCheck className="nav-icon" />
          <span>Security &amp; Audit</span>
          <ChevronDown className={`chevron-icon ${expandedSections.securityAudit ? 'expanded' : ''}`} />
        </button>

        {expandedSections.securityAudit && (
          <div className="nav-section-content">
            <button
              className={`nav-item ${isActiveRoute('/admin/audit') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/audit')}
            >
              Audit Logs
            </button>

            <button
              className={`nav-item ${isActiveRoute('/admin/audit/access') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/audit/access')}
            >
              Access Control
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
