import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import AdminApprovalPage from './AdminApprovalPage';
import ManagerApprovalPage from '../ManagerApproval/ManagerApprovalPage';
import ReportingManagerApprovalPage from '../Reportingmanger/ReportingManagerApprovalPage';
import FormSelect from '../../../components/forms/FormSelect';

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

  const viewOptions = [
    { value: 'manager', label: 'Manager View' },
    ...(isReportingManager ? [{ value: 'reportingManager', label: 'Reporting Manager' }] : []),
    ...(isAdmin ? [{ value: 'admin', label: 'Admin View' }] : []),
  ];

  const handleViewChange = (view) => {
    if (view === 'admin' && !isAdmin) return;
    if (view === 'reportingManager' && !isReportingManager) return;
    setActiveView(view);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {showToggle && (
        <div className="mb-6 flex justify-end items-center gap-2">
          <span className="text-lg font-medium text-gray-700">View as:</span>
          <div className="w-56">
            <FormSelect
              name="adminView"
              value={activeView}
              options={viewOptions}
              onChange={(e) => handleViewChange(e.target.value)}
            />
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
