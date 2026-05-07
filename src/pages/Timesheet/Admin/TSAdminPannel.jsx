import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import AdminApprovalPage from './AdminApprovalPage';
import ManagerApprovalPage from '../ManagerApproval/ManagerApprovalPage';
import ReportingManagerApprovalPage from '../Reportingmanger/ReportingManagerApprovalPage';

const TSAdminPanel = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('manager');
  const isAdmin = user?.permissions?.includes("TIMESHEET_ADMIN");
  const isReportingManager = user?.permissions?.includes(
    "REVIEW_INTERNAL_TIMESHEET",
  );

  useEffect(() => {
    if (isAdmin) {
      setActiveView('admin');
    } else if (isReportingManager) {
      setActiveView('reportingManager');
    } else {
      setActiveView('manager');
    }
  }, [isAdmin, isReportingManager]);

  const showToggle = isAdmin || isReportingManager;

  const handleViewChange = (view) => {
    if (view === 'admin' && !isAdmin) return;
    if (view === 'reportingManager' && !isReportingManager) return;
    setActiveView(view);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* The toggle UI remains exactly the same */}
      {showToggle && (
        <div className="mb-6 flex justify-end">
          <div className="inline-flex bg-gray-200 rounded-lg p-1 shadow-inner">
            <button
              onClick={() => handleViewChange('manager')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeView === 'manager' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-white'
              }`}
            >
              Manager View
            </button>
            {isReportingManager && (
              <button
                onClick={() => handleViewChange('reportingManager')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeView === 'reportingManager' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-white'
                }`}
              >
                Reporting Manager
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => handleViewChange('admin')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeView === 'admin' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-white'
                }`}
              >
                Admin View
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- Main Content Area --- */}
      <div>
        {activeView === 'manager' && <ManagerApprovalPage />}
        {activeView === 'reportingManager' && isReportingManager && (
          <ReportingManagerApprovalPage />
        )}
        {activeView === 'admin' && isAdmin && <AdminApprovalPage />}
      </div>
    </div>
  );
};

export default TSAdminPanel;
