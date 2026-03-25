"use client";

import React, { useState, useMemo } from "react";
import AccessLogsStats from "@/components/AdminUser/AccessLogs/AccessLogsStats";
import AccessLogsFilters from "@/components/AdminUser/AccessLogs/AccessLogsFilters";
import AccessLogsTable from "@/components/AdminUser/AccessLogs/AccessLogsTable";
import { AccessLog, AccessLogFilters, AccessLogStats } from "@/types/access-logs";

// ─── Mock Data ───────────────────────────────────────────────────────────────
const mockLogs: AccessLog[] = [
  {
    id: "1",
    timestamp: "2026-02-16T14:32:15Z",
    user: { 
      name: "Amal Perera", 
      email: "amal.perera@dartlogistic.com",
      role: "admin"
    },
    action: "Login",
    ipAddress: "192.168.1.185",
    location: "Colombo, Sri Lanka",
    device: "Chrome 120 on Windows",
    status: "Success",
  },
  {
    id: "2",
    timestamp: "2026-02-16T14:28:42Z",
    user: { 
      name: "Sarah Johnson", 
      email: "sarah.j@dartlogistic.com",
      role: "sales"
    },
    action: "View Shipment Details",
    ipAddress: "203.94.238.21",
    location: "Singapore",
    device: "Safari 17 on macOS",
    status: "Success",
  },
  {
    id: "3",
    timestamp: "2026-02-16T14:15:33Z",
    user: { 
      name: "Michael Chen", 
      email: "m.chen@dartlogistic.com",
      role: "operation"
    },
    action: "Update Alert Status",
    ipAddress: "118.200.145.87",
    location: "Hong Kong",
    device: "Firefox 122 on Linux",
    status: "Success",
  },
  {
    id: "4",
    timestamp: "2026-02-16T13:58:20Z",
    user: { 
      name: "Unknown User", 
      email: "attacker@malicious.com"
    },
    action: "Failed Login Attempt",
    ipAddress: "45.142.212.61",
    location: "Unknown",
    device: "Python Requests",
    status: "Failed",
  },
  {
    id: "5",
    timestamp: "2026-02-16T13:45:11Z",
    user: { 
      name: "Emma Williams", 
      email: "emma.w@dartlogistic.com",
      role: "admin"
    },
    action: "Export Report",
    ipAddress: "172.16.254.12",
    location: "London, UK",
    device: "Chrome 120 on Windows",
    status: "Success",
  },
  {
    id: "6",
    timestamp: "2026-02-16T13:22:05Z",
    user: { 
      name: "James Brown", 
      email: "j.brown@dartlogistic.com",
      role: "sales"
    },
    action: "Create Shipment",
    ipAddress: "10.0.1.42",
    location: "New York, USA",
    device: "Edge 120 on Windows",
    status: "Success",
  },
  {
    id: "7",
    timestamp: "2026-02-16T12:58:47Z",
    user: { 
      name: "Lisa Anderson", 
      email: "l.anderson@dartlogistic.com",
      role: "admin"
    },
    action: "Modify User Permissions",
    ipAddress: "192.168.50.200",
    location: "Dubai, UAE",
    device: "Chrome 120 on Android",
    status: "Success",
  },
  {
    id: "8",
    timestamp: "2026-02-16T12:30:19Z",
    user: { 
      name: "David Martinez", 
      email: "d.martinez@dartlogistic.com",
      role: "operation"
    },
    action: "Delete Document",
    ipAddress: "198.51.100.45",
    location: "Madrid, Spain",
    device: "Firefox 122 on macOS",
    status: "Success",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AccessLogsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AccessLogFilters>({
    user: "all",
    action: "all",
    dateRange: "today",
  });

  // Filter logs based on selected filters
  const filteredLogs = useMemo(() => {
    let result = [...mockLogs];

    // Filter by user role
    if (filters.user !== "all") {
      result = result.filter((log) => {
        const role = log.user.role?.toLowerCase() || "";
        const email = log.user.email.toLowerCase();
        
        return role === filters.user || 
               email.includes(filters.user);
      });
    }

    // Filter by action type
    if (filters.action !== "all") {
      result = result.filter((log) => {
        const action = log.action.toLowerCase();
        return action.includes(filters.action.toLowerCase());
      });
    }

    // Filter by date range
    if (filters.dateRange !== "today" && filters.dateRange !== "all") {
      const now = new Date();
      result = result.filter((log) => {
        const logDate = new Date(log.timestamp);
        
        if (filters.dateRange === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return logDate >= weekAgo;
        }
        
        if (filters.dateRange === "month") {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return logDate >= monthAgo;
        }
        
        return true;
      });
    }

    return result;
  }, [filters]);

  // Calculate stats based on filtered data
  const filteredStats = useMemo(() => {
    const successCount = filteredLogs.filter(log => log.status === "Success").length;
    const failedCount = filteredLogs.filter(log => log.status === "Failed").length;
    const uniqueUsers = new Set(filteredLogs.map(log => log.user.email)).size;

    return {
      totalLoginsToday: filteredLogs.length,
      successfulLogins: successCount,
      failedAttempts: failedCount,
      activeUsers: uniqueUsers,
    };
  }, [filteredLogs]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleExport = () => {
    // Escape a CSV field: wrap in quotes, escape internal quotes, and prefix
    // formula-injection characters (=, +, -, @) with a single quote.
    const escapeCSVField = (value: string): string => {
      const str = String(value ?? "");
      const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
      const escaped = safe.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    // Convert filtered logs to CSV format
    const csvContent = [
      ["Timestamp", "User", "Email", "Action", "IP Address", "Location", "Device", "Status"],
      ...filteredLogs.map(log => [
        log.timestamp,
        log.user.name,
        log.user.email,
        log.action,
        log.ipAddress,
        log.location,
        log.device,
        log.status
      ])
    ].map(row => row.map(escapeCSVField).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `access-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Access Logs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor all user access activities and system login attempts.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export Logs
          </button>
        </div>

        {/* Stats */}
        <AccessLogsStats stats={filteredStats} />

        {/* Filters */}
        <AccessLogsFilters filters={filters} onFilterChange={setFilters} />

        {/* Table */}
        <AccessLogsTable
          logs={filteredLogs}
          currentPage={currentPage}
          totalResults={filteredLogs.length}
          resultsPerPage={8}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}