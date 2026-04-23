import React from "react";
import { AccessLogFilters } from "@/types/access-logs";

interface AccessLogsFiltersProps {
  filters: AccessLogFilters;
  onFilterChange: (filters: AccessLogFilters) => void;
}

export default function AccessLogsFilters({
  filters,
  onFilterChange,
}: AccessLogsFiltersProps) {
  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, user: e.target.value });
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, action: e.target.value });
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, dateRange: e.target.value });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap gap-4">
        {/* User Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User Type
          </label>
          <select
            value={filters.user}
            onChange={handleUserChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Users</option>
            <option value="admin">Admin</option>
            <option value="sales">Sales</option>
            <option value="operation">Operation</option>
          </select>
        </div>

        {/* Action Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action
          </label>
          <select
            value={filters.action}
            onChange={handleActionChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Actions</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="view">View</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="export">Export</option>
            <option value="modify">Modify</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={handleDateRangeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>
    </div>
  );
}