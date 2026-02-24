"use client";

import React, { useState } from "react";
import AuditTrailStats from "@/components/AdminUser/AuditTrail/AuditTrailStats";
import AuditTrailFilters from "@/components/AdminUser/AuditTrail/AuditTrailFilters";
import AuditTrailTable from "@/components/AdminUser/AuditTrail/AuditTrailTable";
import { AuditLog, AuditFilters, AuditStats } from "@/types/audit-trail";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockStats: AuditStats = {
  totalEvents: 2847,
  eventsToday: 124,
  criticalChanges: 12,
  activeAdmins: 45,
};

const mockLogs: AuditLog[] = [
  {
    id: "1",
    timestamp: "2026-02-16 14:32:15",
    user: { name: "Amal Perera", role: "Super Admin" },
    module: "User Management",
    action: "Created new user account",
    details: "Created user: john.doe@dartlogistic.com with Manager role",
    severity: "Info",
  },
  {
    id: "2",
    timestamp: "2026-02-16 14:15:42",
    user: { name: "Emma Williams", role: "Admin" },
    module: "Security Settings",
    action: "Updated password policy",
    details: "Changed minimum password length from 8 to 12 characters",
    severity: "Warning",
  },
  {
    id: "3",
    timestamp: "2026-02-16 13:58:33",
    user: { name: "Sarah Johnson", role: "Manager" },
    module: "Shipment Management",
    action: "Updated shipment status",
    details: "Changed shipment #SBP-9923 status from In Transit to Delivered",
    severity: "Info",
  },
  {
    id: "4",
    timestamp: "2026-02-16 13:45:11",
    user: { name: "System", role: "Automated" },
    module: "Alert Management",
    action: "Auto-resolved critical alert",
    details: "Alert #ALT-5821 automatically resolved after conditions normalized",
    severity: "Info",
  },
  {
    id: "5",
    timestamp: "2026-02-16 13:22:05",
    user: { name: "Michael Chen", role: "Operator" },
    module: "Department Management",
    action: "Deleted department",
    details: "Removed department: Legacy Operations (ID: DEPT-04)",
    severity: "Critical",
  },
  {
    id: "6",
    timestamp: "2026-02-16 12:58:47",
    user: { name: "Lisa Anderson", role: "Manager" },
    module: "User Management",
    action: "Modified user permissions",
    details: "Updated permissions for user david.martinez@dartlogistic.com",
    severity: "Warning",
  },
  {
    id: "7",
    timestamp: "2026-02-16 12:30:19",
    user: { name: "James Brown", role: "Admin" },
    module: "System Configuration",
    action: "Updated system settings",
    details: "Changed session timeout from 30 to 60 minutes",
    severity: "Info",
  },
  {
    id: "8",
    timestamp: "2026-02-16 11:15:22",
    user: { name: "Amal Perera", role: "Super Admin" },
    module: "Security Settings",
    action: "Enabled two-factor authentication",
    details: "Enforced 2FA for all admin users",
    severity: "Warning",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AuditTrailPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilters>({
    module: "all",
    severity: "all",
    dateRange: "last7days",
  });

  const handleExport = () => {
    alert("Exporting audit trail...");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Audit Trail</h1>
            <p className="text-sm text-gray-500 mt-1">
              Complete history of all system changes and administrative actions.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export Audit
          </button>
        </div>

        {/* Stats */}
        <AuditTrailStats stats={mockStats} />

        {/* Filters */}
        <AuditTrailFilters filters={filters} onFilterChange={setFilters} />

        {/* Table */}
        <AuditTrailTable
          logs={mockLogs}
          currentPage={currentPage}
          totalResults={2847}
          resultsPerPage={8}
          onPageChange={setCurrentPage}
        />

      </div>
    </div>
  );
}