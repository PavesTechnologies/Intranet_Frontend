import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

import AdminPanel from './AdminPanel';
import HRManageTools from './HRManageTools';
import HRAdminPanel from './HRAdminPanel';
import EmployeeDashboard from './EmployeeDashboard';

const EmployeePanel = () => {
  const employee = useAuth();
  const [activeView, setActiveView] = useState('employee');

  let roles = employee.user?.roles || '';
  if (!Array.isArray(roles)) {
    roles = roles.split(',').map((r) => r.trim());
  }

  const employeeId = employee.user?.user_id;

  const isAdmin         = roles.includes('Super_Admin');
  const isManager       = roles.includes('Reporting_Manager') || isAdmin;
  const isHR            = roles.includes('HR') || isAdmin;
  const isHRAdministrator = roles.includes('Hr_Manager') || isAdmin;

  // Default view logic
  useEffect(() => {
    if (isAdmin) {
      setActiveView('employee'); // super admin starts on employee view, can switch to any
    } else if (isHRAdministrator && !isManager) {
      setActiveView('hr-admin');
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
    if (view === 'admin'    && !isManager)        return;
    if (view === 'hr'       && !isHR)             return;
    if (view === 'hr-admin' && !isHRAdministrator) return;
    setActiveView(view);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {showToggle && (
        <div className="mb-6 flex justify-end">
          <div className="inline-flex bg-gray-200 rounded-lg p-1 shadow-inner">

            {/* Employee View — always visible */}
            <button
              onClick={() => handleViewChange('employee')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeView === 'employee'
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
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeView === 'admin'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-700 hover:bg-white'
                }`}
              >
                Manager View
              </button>
            )}

            {/* HR Admin View */}
            {isHRAdministrator && (
              <button
                onClick={() => handleViewChange('hr-admin')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeView === 'hr-admin'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-700 hover:bg-white'
                }`}
              >
                HR-Admin View
              </button>
            )}

            {/* HR Tools View */}
            {isHR && (
              <button
                onClick={() => handleViewChange('hr')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeView === 'hr'
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
        {activeView === 'hr-admin' && isHRAdministrator && (
          <HRAdminPanel />
        )}
      </div>
    </div>
  );
};

export default EmployeePanel;