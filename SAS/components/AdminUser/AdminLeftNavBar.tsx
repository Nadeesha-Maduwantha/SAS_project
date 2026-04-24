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
  RefreshCw,
  MapPin,
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
    milestones: false,
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
              className={`nav-item ${isActiveRoute('/admin/create_user') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/create_user')}
            >
              Add New User
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/edit-user') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/edit-user')}
            >
              Edit User
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/access-logs') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/access-logs')}
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
              className={`nav-item ${isActiveRoute('/admin/department_overview') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/department_overview')}
            >
              Departments
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
              Delayed Shipments
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
              className={`nav-item ${isActiveRoute('/admin/alerts') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/alerts')}
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
              className={`nav-item ${isActiveRoute('/admin/milestone_templates_list') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/milestone_templates_list')}
            >
              Templates List
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/milestone_template_create') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/milestone_template_create')}
            >
              Create Template
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/shipment_milestones') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/shipment_milestones')}
            >
              Shipment Milestones
            </button>
          </div>
        )}
      </div>

      {/* Sync */}
      <div className="nav-section">
        <button
          className={`nav-section-header ${isActiveRoute('/admin/sync') ? 'active' : ''}`}
          onClick={() => handleNavigation('/admin/sync')}
        >
          <RefreshCw className="nav-icon" />
          <span>Sync</span>
        </button>
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
              className={`nav-item ${isActiveRoute('/admin/audit-trail') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/audit-trail')}
            >
              Audit Logs
            </button>
            <button
              className={`nav-item ${isActiveRoute('/admin/security-settings') ? 'active' : ''}`}
              onClick={() => handleNavigation('/admin/security-settings')}
            >
              Security Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}