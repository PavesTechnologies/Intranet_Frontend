import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

import AdminPanel from './AdminPanel';
import HRManageTools from './HRManageTools';
import HRAdminPanel from './HRAdminPanel';
import EmployeeDashboard from './EmployeeDashboard';

const EmployeePanel = () => {
  const employee = useAuth();
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('employeePanelActiveView') || 'employee';
  });

  const { hasRole } = employee;

  const employeeId = employee.user?.user_id;

  const isAdmin = hasRole(['Super_Admin']);
  const permission = hasRole(['Super_Admin', 'Admin']);
  const isManager = hasRole(['Reporting_Manager']) || isAdmin;
  const isHR = hasRole(['HR']) || isAdmin;
  const isHRAdministrator = hasRole(['Hr_Manager']) || isAdmin || permission;

  // Default view logic
  useEffect(() => {
    const savedView = localStorage.getItem('employeePanelActiveView');
    if (savedView) {
      const isAuthorized =
        savedView === 'employee' ||
        (savedView === 'admin' && isManager) ||
        (savedView === 'hr' && isHR) ||
        (savedView === 'hr_manager' && isHRAdministrator);

      if (isAuthorized) {
        setActiveView(savedView);
        return;
      }
    }

    if (isAdmin) {
      setActiveView('employee'); // super admin starts on employee view, can switch to any
    } else if (isHRAdministrator && !isManager) {
      setActiveView('hr_manager');
    } else if (isManager) {
      setActiveView('admin');
    } else if (isHR) {
      setActiveView('hr');
    } else {
      setActiveView('employee');
    }
  }, [isAdmin, isManager, isHR, isHRAdministrator]);

  const showToggle = isManager || isHR || isHRAdministrator || isAdmin;

  const handleViewChange = (view) => {
    if (view === 'admin' && !isManager) return;
    if (view === 'hr' && !isHR) return;
    if (view === 'hr_manager' && !isHRAdministrator) return;
    setActiveView(view);
    localStorage.setItem('employeePanelActiveView', view);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {showToggle && (
        <div className="mb-6 flex justify-end">
          <div className="inline-flex bg-gray-200 rounded-lg p-1 shadow-inner">

            {/* Employee View — always visible */}
            <button
              onClick={() => handleViewChange('employee')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeView === 'employee'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-700 hover:bg-white'
                }`}
            >
              Employee View
            </button>

            {/* Manager View */}
            {isManager && (
              <button
                onClick={() => handleViewChange('admin')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeView === 'admin'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-700 hover:bg-white'
                  }`}
              >
                Manager View
              </button>
            )}

            {/* HR Admin View */}
            {!permission && (
              isHRAdministrator && (
                <button
                  onClick={() => handleViewChange('hr_manager')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeView === 'hr_manager'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-700 hover:bg-white'
                    }`}
                >
                  HR-Admin View
                </button>
              )
            )}

            {/* HR Tools View */}
            {isHR && (
              <button
                onClick={() => handleViewChange('hr')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeView === 'hr'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-700 hover:bg-white'
                  }`}
              >
                HR Tools
              </button>
            )}

          </div>

          {/* Super Admin badge */}
          {isAdmin && (
            <span className="ml-3 self-center px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300">
              Super Admin
            </span>
          )}
        </div>
      )}

      <div>
        {activeView === 'employee' && (
          <EmployeeDashboard employeeId={employeeId} />
        )}
        {activeView === 'admin' && isManager && (
          <AdminPanel employeeId={employeeId} />
        )}
        {activeView === 'hr' && isHR && (
          <HRManageTools employeeId={employeeId} />
        )}
        {activeView === 'hr_manager' && isHRAdministrator && (
          <HRAdminPanel />
        )}
      </div>
    </div>
  );
};

export default EmployeePanel;