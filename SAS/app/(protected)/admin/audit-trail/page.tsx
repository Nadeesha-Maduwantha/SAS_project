"use client";

import React, { useState, useMemo, useEffect } from "react";
import AuditTrailStats from "@/components/AdminUser/AuditTrail/AuditTrailStats";
import AuditTrailFilters from "@/components/AdminUser/AuditTrail/AuditTrailFilters";
import AdminLeftNavBar from '@/components/AdminUser/AdminLeftNavBar';
import AuditTrailTable from "@/components/AdminUser/AuditTrail/AuditTrailTable";
import { AuditTrailEvent, AuditFilters, AuditTrailStatsData } from "@/types/audit-trail";

export default function AuditTrailPage() {
  const [events, setEvents] = useState<AuditTrailEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilters>({
    module: "all",
    severity: "all",
    dateRange: "Last 7 Days",
  });

  // Fetch real data from the Flask API
  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setIsLoading(true);
        // Replace with your actual backend URL if different
        const response = await fetch('http://localhost:5000/api/audit-trail/');
        
        if (!response.ok) {
          throw new Error('Failed to fetch audit logs');
        }
        
        const json = await response.json();
        if (json.data) {
          setEvents(json.data);
        }
      } catch (error) {
        console.error("Error fetching audit logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
    let result = [...events];

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
  }, [events, filters]);

  // Calculate stats based on filtered data
  const filteredStats: AuditTrailStatsData = useMemo(() => {
    const criticalCount = filteredEvents.filter(event => event.severity === "Critical").length;
    const uniqueAdmins = new Set(
        filteredEvents
            .filter(event => event.user && event.user.role && event.user.role.includes("Admin"))
            .map(event => event.user && event.user.name)
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
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleExport = () => {
    // Convert filtered events to CSV format
    const csvContent = [
      ["Timestamp", "User", "Role", "Module", "Action", "Details", "Severity"],
      ...filteredEvents.map(event => [
        event.timestamp,
        event.user?.name || "Unknown",
        event.user?.role || "Unknown",
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

        {isLoading ? (
          <div className="text-center py-10 text-gray-500">Loading audit trail...</div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}