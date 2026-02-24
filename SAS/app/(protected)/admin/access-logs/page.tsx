"use client";

import React, { useState } from "react";
import AccessLogsStats from "@/components/AdminUser/AccessLogs/AccessLogsStats";
import AccessLogsFilters from "@/components/AdminUser/AccessLogs/AccessLogsFilters";
import AccessLogsTable from "@/components/AdminUser/AccessLogs/AccessLogsTable";
import { AccessLog, AccessLogFilters, AccessLogStats } from "@/types/access-logs";

// ─── Mock Data ───────────────────────────────────────────────────────────────
const mockStats: AccessLogStats = {
  totalLoginsToday: 1247,
  successfulLogins: 1239,
  failedAttempts: 8,
  activeUsers: 342,
};

const mockLogs: AccessLog[] = [
  {
    id: "1",
    timestamp: "2026-02-16 14:32:15",
    user: { name: "Amal Perera", email: "amal.perera@dartlogistic.com" },
    action: "Login",
    ipAddress: "192.168.1.185",
    location: "Colombo, Sri Lanka",
    device: "Chrome 120 on Windows",
    status: "Success",
  },
  {
    id: "2",
    timestamp: "2026-02-16 14:28:42",
    user: { name: "Sarah Johnson", email: "sarah.j@dartlogistic.com" },
    action: "View Shipment Details",
    ipAddress: "203.94.238.21",
    location: "Singapore",
    device: "Safari 17 on macOS",
    status: "Success",
  },
  {
    id: "3",
    timestamp: "2026-02-16 14:15:33",
    user: { name: "Michael Chen", email: "m.chen@dartlogistic.com" },
    action: "Update Alert Status",
    ipAddress: "118.200.145.87",
    location: "Hong Kong",
    device: "Firefox 122 on Linux",
    status: "Success",
  },
  {
    id: "4",
    timestamp: "2026-02-16 13:58:20",
    user: { name: "Unknown User", email: "attacker@malicious.com" },
    action: "Failed Login Attempt",
    ipAddress: "45.142.212.61",
    location: "Unknown",
    device: "Python Requests",
    status: "Failed",
  },
  {
    id: "5",
    timestamp: "2026-02-16 13:45:11",
    user: { name: "Emma Williams", email: "emma.w@dartlogistic.com" },
    action: "Export Report",
    ipAddress: "172.16.254.12",
    location: "London, UK",
    device: "Chrome 120 on Windows",
    status: "Success",
  },
  {
    id: "6",
    timestamp: "2026-02-16 13:22:05",
    user: { name: "James Brown", email: "j.brown@dartlogistic.com" },
    action: "Create Shipment",
    ipAddress: "10.0.1.42",
    location: "New York, USA",
    device: "Edge 120 on Windows",
    status: "Success",
  },
  {
    id: "7",
    timestamp: "2026-02-16 12:58:47",
    user: { name: "Lisa Anderson", email: "l.anderson@dartlogistic.com" },
    action: "Modify User Permissions",
    ipAddress: "192.168.50.200",
    location: "Dubai, UAE",
    device: "Chrome 120 on Android",
    status: "Success",
  },
  {
    id: "8",
    timestamp: "2026-02-16 12:30:19",
    user: { name: "David Martinez", email: "d.martinez@dartlogistic.com" },
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

  const handleExport = () => {
    alert("Exporting logs...");
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
        <AccessLogsStats stats={mockStats} />

        {/* Filters */}
        <AccessLogsFilters filters={filters} onFilterChange={setFilters} />

        {/* Table */}
        <AccessLogsTable
          logs={mockLogs}
          currentPage={currentPage}
          totalResults={1247}
          resultsPerPage={8}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}