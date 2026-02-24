import React from "react";
import { AuditStats } from "@/types/audit-trail";

interface AuditTrailStatsProps {
  stats: AuditStats;
}

const AuditTrailStats: React.FC<AuditTrailStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Events */}
      <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 border border-gray-100">
        <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{stats.totalEvents.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-0.5">Total Events</p>
        </div>
      </div>

      {/* Events Today */}
      <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 border border-gray-100">
        <div className="bg-yellow-100 text-yellow-600 p-3 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{stats.eventsToday.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-0.5">Events Today</p>
        </div>
      </div>

      {/* Critical Changes */}
      <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 border border-gray-100">
        <div className="bg-red-100 text-red-600 p-3 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{stats.criticalChanges.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-0.5">Critical Changes</p>
        </div>
      </div>

      {/* Active Admins */}
      <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 border border-gray-100">
        <div className="bg-purple-100 text-purple-600 p-3 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{stats.activeAdmins.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-0.5">Active Admins</p>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailStats;