import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import AdminApprovalPage from './AdminApprovalPage';
import ManagerApprovalPage from '../ManagerApproval/ManagerApprovalPage';
import ReportingManagerApprovalPage from '../Reportingmanger/ReportingManagerApprovalPage';
import FormSelect from '../../../components/forms/FormSelect';
import Button from '../../../components/Button/Button';
import ReviewedTimesheetsModal from '../ManagerApproval/ReviewedTimesheetsModal';
import useMonthScope from '../components/useMonthScope';
import MonthScopeSelect from '../components/MonthScopeSelect';

const TSAdminPanel = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('manager');
  const [showReviewedModal, setShowReviewedModal] = useState(false);

  // The Admin view's month scope lives up here because its control sits in this
  // toolbar, left of Reviewed Logs. The Manager and Reporting Manager views keep
  // their own scope, since their controls sit inside their own headers.
  const adminMonthScope = useMonthScope();
  const [adminLoading, setAdminLoading] = useState(false);
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
      {/* Reviewed Logs sits to the left of "View as"; when the role toggle
          isn't available it falls back to the far right on its own. */}
      <div className="mb-0 flex justify-end items-center gap-4">
        {activeView === 'admin' && isAdmin && (
          <MonthScopeSelect
            options={adminMonthScope.options}
            value={adminMonthScope.monthKey}
            onChange={adminMonthScope.setMonthKey}
            disabled={adminLoading}
          />
        )}

        <Button
          variant="primary"
          size="medium"
          className="h-8"
          onClick={() => setShowReviewedModal(true)}
        >
          Reviewed Logs
        </Button>

        {showToggle && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-gray-700">View as:</span>
            {/* Sized to the widest option ("Reporting Manager") rather than to
                content, so the control does not resize as you switch views. */}
            <div className="w-48">
              <FormSelect
                name="adminView"
                value={activeView}
                options={viewOptions}
                onChange={(e) => handleViewChange(e.target.value)}
                optionRowClassName="min-w-0"
              />
            </div>
          </div>
        )}
      </div>

      <ReviewedTimesheetsModal
        isOpen={showReviewedModal}
        onClose={() => setShowReviewedModal(false)}
      />

      {/* --- Main Content Area --- */}
      <div>
        {activeView === 'manager' && <ManagerApprovalPage />}
        {activeView === 'reportingManager' && isReportingManager && (
          <ReportingManagerApprovalPage />
        )}
        {activeView === 'admin' && isAdmin && (
          <AdminApprovalPage
            monthScope={adminMonthScope}
            onLoadingChange={setAdminLoading}
          />
        )}
      </div>
    </div>
  );
};

export default TSAdminPanel;
