import React from "react";
import { AccessLogFilters } from "@/types/access-logs";

interface AccessLogsFiltersProps {
  filters: AccessLogFilters;
  onFilterChange: (filters: AccessLogFilters) => void;
}

const AccessLogsFilters: React.FC<AccessLogsFiltersProps> = ({ filters, onFilterChange }) => {
  const handleChange = (key: keyof AccessLogFilters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6">

      {/* User Filter */}
      <div className="relative">
        <select
          value={filters.user}
          onChange={(e) => handleChange("user", e.target.value)}
          className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">All Users</option>
          <option value="admin">Admin</option>
          <option value="sales">Sales</option>
          <option value="operation">Operation</option>
        </select>
        <svg className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {/* Action Filter */}
      <div className="relative">
        <select
          value={filters.action}
          onChange={(e) => handleChange("action", e.target.value)}
          className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">All Actions</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="view">View</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="export">Export</option>
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
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last7days">Last 7 Days</option>
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

export default AccessLogsFilters;