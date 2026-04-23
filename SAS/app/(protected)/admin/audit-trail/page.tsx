"use client";

import React, { useState, useMemo } from "react";
import AuditTrailStats from "@/components/AdminUser/AuditTrail/AuditTrailStats";
import AuditTrailFilters from "@/components/AdminUser/AuditTrail/AuditTrailFilters";
import AuditTrailTable from "@/components/AdminUser/AuditTrail/AuditTrailTable";
import { AuditTrailEvent, AuditFilters, AuditTrailStatsData } from "@/types/audit-trail";

// ─── Mock Data ───────────────────────────────────────────────────────────────
const mockEvents: AuditTrailEvent[] = [
  {
    id: "1",
    timestamp: "2026-02-25 14:32:15",
    user: {
      name: "Amal Perera",
      role: "Super Admin",
    },
    module: "User Management",
    action: "Created new user account",
    details: "Created user: john.doe@dartlogistic.com with Manager role",
    severity: "Info",
  },
  {
    id: "2",
    timestamp: "2026-02-25 14:15:42",
    user: {
      name: "Emma Williams",
      role: "Admin",
    },
    module: "Security Settings",
    action: "Updated password policy",
    details: "Changed minimum password length from 8 to 12 characters",
    severity: "Warning",
  },
  {
    id: "3",
    timestamp: "2026-02-25 13:58:33",
    user: {
      name: "Sarah Johnson",
      role: "Manager",
    },
    module: "Shipment Management",
    action: "Updated shipment status",
    details: "Changed shipment #SBP-9923 status from In Transit to Delivered",
    severity: "Info",
  },
  {
    id: "4",
    timestamp: "2026-02-25 13:45:11",
    user: {
      name: "System",
      role: "Automated",
    },
    module: "Alert Management",
    action: "Auto-resolved critical alert",
    details: "Alert #ALT-5821 automatically resolved after conditions normalized",
    severity: "Info",
  },
  {
    id: "5",
    timestamp: "2026-02-25 13:22:05",
    user: {
      name: "Michael Chen",
      role: "Operator",
    },
    module: "Department Management",
    action: "Deleted department",
    details: "Removed department: Legacy Operations (ID: DEPT-04)",
    severity: "Critical",
  },
  {
    id: "6",
    timestamp: "2026-02-25 12:58:47",
    user: {
      name: "Lisa Anderson",
      role: "Admin",
    },
    module: "User Management",
    action: "Modified user permissions",
    details: "Updated permissions for user david.martinez@dartlogistic.com",
    severity: "Warning",
  },
  {
    id: "7",
    timestamp: "2026-02-24 16:32:10",
    user: {
      name: "David Martinez",
      role: "Manager",
    },
    module: "Shipment Management",
    action: "Created new shipment",
    details: "Created shipment #SBP-9924 for client ABC Corporation",
    severity: "Info",
  },
  {
    id: "8",
    timestamp: "2026-02-24 15:20:33",
    user: {
      name: "Jessica Taylor",
      role: "Admin",
    },
    module: "Security Settings",
    action: "Updated firewall rules",
    details: "Added new IP whitelist entries for Singapore office",
    severity: "Critical",
  },
  {
    id: "9",
    timestamp: "2026-02-24 14:10:25",
    user: {
      name: "Robert Wilson",
      role: "Operator",
    },
    module: "Alert Management",
    action: "Acknowledged alert",
    details: "Acknowledged temperature alert #ALT-5822 for shipment #SBP-9920",
    severity: "Warning",
  },
  {
    id: "10",
    timestamp: "2026-02-24 13:05:18",
    user: {
      name: "Maria Garcia",
      role: "Manager",
    },
    module: "User Management",
    action: "Deactivated user account",
    details: "Deactivated user account: former.employee@dartlogistic.com",
    severity: "Info",
  },
  {
    id: "11",
    timestamp: "2026-02-23 17:45:55",
    user: {
      name: "System",
      role: "Automated",
    },
    module: "System",
    action: "Database backup completed",
    details: "Automated daily backup completed successfully (Size: 2.4GB)",
    severity: "Info",
  },
  {
    id: "12",
    timestamp: "2026-02-23 16:30:42",
    user: {
      name: "Thomas Anderson",
      role: "Super Admin",
    },
    module: "Security Settings",
    action: "Updated 2FA settings",
    details: "Made two-factor authentication mandatory for all admin users",
    severity: "Critical",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AuditTrailPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilters>({
    module: "all",
    severity: "all",
    dateRange: "Last 7 Days",
  });

  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
    let result = [...mockEvents];

    // Filter by module
    if (filters.module !== "all") {
      result = result.filter((event) => event.module === filters.module);
    }

    // Filter by severity
    if (filters.severity !== "all") {
      result = result.filter((event) => event.severity === filters.severity);
    }

    // Filter by date range
    if (filters.dateRange !== "all") {
      const now = new Date();
      result = result.filter((event) => {
        const eventDate = new Date(event.timestamp);

        if (filters.dateRange === "today") {
          return eventDate.toDateString() === now.toDateString();
        }

        if (filters.dateRange === "Last 7 Days") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return eventDate >= weekAgo;
        }

        if (filters.dateRange === "Last 30 Days") {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return eventDate >= monthAgo;
        }

        return true;
      });
    }

    return result;
  }, [filters]);

  // Calculate stats based on filtered data
  const filteredStats: AuditTrailStatsData = useMemo(() => {
    const criticalCount = filteredEvents.filter(event => event.severity === "Critical").length;
    const uniqueAdmins = new Set(
      filteredEvents
        .filter(event => event.user.role.includes("Admin"))
        .map(event => event.user.name)
    ).size;

    const today = new Date().toDateString();
    const eventsToday = filteredEvents.filter(
      event => new Date(event.timestamp).toDateString() === today
    ).length;

    return {
      totalEvents: filteredEvents.length,
      eventsToday: eventsToday,
      criticalChanges: criticalCount,
      activeAdmins: uniqueAdmins,
    };
  }, [filteredEvents]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleExport = () => {
    // Convert filtered events to CSV format
    const csvContent = [
      ["Timestamp", "User", "Role", "Module", "Action", "Details", "Severity"],
      ...filteredEvents.map(event => [
        event.timestamp,
        event.user.name,
        event.user.role,
        event.module,
        event.action,
        event.details,
        event.severity
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
        <AuditTrailStats stats={filteredStats} />

        {/* Filters */}
        <AuditTrailFilters filters={filters} onFilterChange={setFilters} />

        {/* Table */}
        <AuditTrailTable
          events={filteredEvents}
          currentPage={currentPage}
          totalResults={filteredEvents.length}
          resultsPerPage={10}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}