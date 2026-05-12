// File: src/pages/leave_management/EmployeePanel.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Import the main components for each view
import AdminPanel from './AdminPanel';
import HRManageTools from './HRManageTools';
import HRAdminPanel from './HRAdminPanel'; // <-- NEW
import EmployeeDashboard from './EmployeeDashboard'; // <-- NEW

const EmployeePanel = () => {
  const employee = useAuth();
  const [activeView, setActiveView] = useState('employee');

  // Role detection logic remains the same
  let roles = employee.user?.roles || '';
  if (!Array.isArray(roles)) {
    roles = roles.split(',').map((r) => r.trim());
  }
  roles = roles.map((r) => r.toLowerCase().replace('hr-manager', 'hr-administrator'));

  console.log("EmployeePanel Roles:", roles);

  const employeeId = employee.user?.user_id;

  const isManager = roles.includes('reporting_manager') || (employee?.roles || '').toLowerCase() === 'super admin';
  const isHR = roles.includes('hr');
  const isHRAdministrator = roles.includes('hr-administrator');
  
  // Default view logic remains the same
  useEffect(() => {
    if (isHRAdministrator && !isManager) {
      setActiveView('hr-admin');
    } else if (isManager) {
      setActiveView('admin');
    } else if (isHR) {
      setActiveView('hr');
    } else {
      setActiveView('employee');
    }
  }, [isManager, isHR, isHRAdministrator]);

  const showToggle = isManager || isHR || isHRAdministrator;

  const handleViewChange = (view) => {
    if (view === 'admin' && !isManager) return;
    if (view === 'hr' && !isHR) return;
    if (view === 'hr-admin' && !isHRAdministrator) return;
    setActiveView(view);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* The toggle UI remains exactly the same */}
      {showToggle && (
        <div className="mb-6 flex justify-end">
          <div className="inline-flex bg-gray-200 rounded-lg p-1 shadow-inner">
            <button
              onClick={() => handleViewChange('employee')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeView === 'employee' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-white'
              }`}
            >
              Employee View
            </button>
            {isManager && (
              <button
                onClick={() => handleViewChange('admin')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeView === 'admin' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-white'
                }`}
              >
                Manager View
              </button>
            )}
            {isHRAdministrator && (
              <button
                onClick={() => handleViewChange('hr-admin')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeView === 'hr-admin' ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-white'
                }`}
              >
                HR-Admin View
              </button>
            )}
            {isHR && (
              <button
                onClick={() => handleViewChange('hr')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeView === 'hr' ? 'bg-purple-600 text-white shadow' : 'text-gray-700 hover:bg-white'
                }`}
              >
                HR Tools
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- Main Content Area --- */}
      {/* This section is now much cleaner, simply rendering the correct component */}
      <div>
        {activeView === 'employee' && <EmployeeDashboard employeeId={employeeId} />}
        {activeView === 'admin' && isManager && <AdminPanel employeeId={employeeId} />}
        {activeView === 'hr' && isHR && <HRManageTools employeeId={employeeId} />}
        {activeView === 'hr-admin' && isHRAdministrator && <HRAdminPanel />}
      </div>
    </div>
  );
};

export default EmployeePanel;