import React from "react";
import { AuditFilters } from "@/types/audit-trail";

interface AuditTrailFiltersProps {
  filters: AuditFilters;
  onFilterChange: (filters: AuditFilters) => void;
}

const AuditTrailFilters: React.FC<AuditTrailFiltersProps> = ({ filters, onFilterChange }) => {
  const handleChange = (key: keyof AuditFilters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Module Filter */}
      <div className="relative">
        <select
          value={filters.module}
          onChange={(e) => handleChange("module", e.target.value)}
          className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">All Modules</option>
          <option value="user_management">User Management</option>
          <option value="security_settings">Security Settings</option>
          <option value="shipment_management">Shipment Management</option>
          <option value="alert_management">Alert Management</option>
          <option value="department_management">Department Management</option>
          <option value="system_configuration">System Configuration</option>
        </select>
        <svg className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {/* Severity Filter */}
      <div className="relative">
        <select
          value={filters.severity}
          onChange={(e) => handleChange("severity", e.target.value)}
          className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <svg className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {/* Date Range Filter */}
      <div className="relative">
        <select
          value={filters.dateRange}
          onChange={(e) => handleChange("dateRange", e.target.value)}
          className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="last7days">Last 7 Days</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last30days">Last 30 Days</option>
          <option value="thisMonth">This Month</option>
        </select>
        <svg className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </div>
  );
};

export default AuditTrailFilters;