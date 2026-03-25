import React from "react";
import { AuditFilters } from "@/types/audit-trail";

interface AuditTrailFiltersProps {
  filters: AuditFilters;
  onFilterChange: (filters: AuditFilters) => void;
}

export default function AuditTrailFilters({
  filters,
  onFilterChange,
}: AuditTrailFiltersProps) {
  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, module: e.target.value });
  };

  const handleSeverityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, severity: e.target.value });
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, dateRange: e.target.value });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap gap-4">
        {/* Module Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Module
          </label>
          <select
            value={filters.module}
            onChange={handleModuleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Modules</option>
            <option value="Security Settings">Security Settings</option>
            <option value="User Management">User Management</option>
            <option value="Shipment Management">Shipment Management</option>
            <option value="Alert Management">Alert Management</option>
            <option value="Department Management">Department Management</option>
            <option value="System">System</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Severity
          </label>
          <select
            value={filters.severity}
            onChange={handleSeverityChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Severity</option>
            <option value="Info">Info</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Period
          </label>
          <select
            value={filters.dateRange}
            onChange={handleDateRangeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>
    </div>
  );
}