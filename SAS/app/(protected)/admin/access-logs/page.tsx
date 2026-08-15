"use client";

import React, { useState, useMemo, useEffect } from "react";
import AccessLogsStats from "@/components/AdminUser/AccessLogs/AccessLogsStats";
import AccessLogsFilters from "@/components/AdminUser/AccessLogs/AccessLogsFilters";
import AccessLogsTable from "@/components/AdminUser/AccessLogs/AccessLogsTable";
import { AccessLog, AccessLogFilters } from "@/types/access-logs";

export default function AccessLogsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<AccessLogFilters>({
    user: "all",
    action: "all",
    dateRange: "today",
  });

  // 1. Fetch live data from your Flask Backend
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        // Replace localhost:5000 with your actual backend URL/environment variable if different
        const response = await fetch("http://127.0.0.1:5000/api/access-logs");
        const json = await response.json();
        
        if (json.success) {
          setLogs(json.data);
        } else {
          setError(json.error || "Failed to fetch logs");
        }
      } catch (err) {
        setError("Error connecting to the server");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // Filter logs based on selected filters
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Filter by user role/email
    if (filters.user !== "all") {
      result = result.filter((log) => {
        const role = log.user.role?.toLowerCase() || "";
        const email = log.user.email.toLowerCase();
        return role === filters.user || email.includes(filters.user);
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
  }, [filters, logs]);

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
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleExport = () => {
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
    ].map(row => row.join(",")).join("\n");

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

        {/* Loading and Error States */}
        {isLoading && <p className="text-gray-500 mb-4">Loading access logs...</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Stats */}
        {!isLoading && !error && (
            <>
                <AccessLogsStats stats={filteredStats} />
                <AccessLogsFilters filters={filters} onFilterChange={setFilters} />
                <AccessLogsTable
                  logs={filteredLogs}
                  currentPage={currentPage}
                  totalResults={filteredLogs.length}
                  resultsPerPage={8}
                  onPageChange={setCurrentPage}
                />
            </>
        )}
      </div>
    </div>
  );
}