import React from "react";
import { AuditLog } from "@/types/audit-trail";

interface AuditTrailTableProps {
  logs: AuditLog[];
  currentPage: number;
  totalResults: number;
  resultsPerPage: number;
  onPageChange: (page: number) => void;
}

const AuditTrailTable: React.FC<AuditTrailTableProps> = ({
  logs,
  currentPage,
  totalResults,
  resultsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  const startResult = (currentPage - 1) * resultsPerPage + 1;
  const endResult = Math.min(currentPage * resultsPerPage, totalResults);

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case "Info":     return "bg-blue-100 text-blue-600";
      case "Warning":  return "bg-yellow-100 text-yellow-600";
      case "Critical": return "bg-red-100 text-red-600";
      default:         return "bg-blue-100 text-blue-600";
    }
  };

  const getModuleClass = (module: string) => {
    switch (module) {
      case "User Management":       return "bg-blue-100 text-blue-700";
      case "Security Settings":     return "bg-green-100 text-green-700";
      case "Shipment Management":   return "bg-purple-100 text-purple-700";
      case "Alert Management":      return "bg-yellow-100 text-yellow-700";
      case "Department Management": return "bg-red-100 text-red-700";
      case "System Configuration":  return "bg-gray-100 text-gray-700";
      default:                      return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">TIMESTAMP</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">USER</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MODULE</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ACTION</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DETAILS</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SEVERITY</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr
                key={log.id}
                className={`border-b border-gray-100 transition-colors ${
                  index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <td className="px-4 py-3 text-gray-700 align-middle">{log.timestamp}</td>
                <td className="px-4 py-3 align-middle">
                  <p className="font-medium text-gray-800 text-sm">{log.user.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{log.user.role}</p>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${getModuleClass(log.module)}`}>
                    {log.module}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 align-middle">{log.action}</td>
                <td className="px-4 py-3 text-gray-500 align-middle max-w-xs truncate">{log.details}</td>
                <td className="px-4 py-3 align-middle">
                  <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${getSeverityClass(log.severity)}`}>
                    {log.severity}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle">
                  <button className="text-blue-500 text-sm font-medium hover:underline cursor-pointer">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <p className="text-sm text-gray-500">
          Showing {startResult} to {endResult} of {totalResults.toLocaleString()} results
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-600 bg-white hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                currentPage === page
                  ? "bg-blue-500 text-white border border-blue-500"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-600 bg-white hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailTable;