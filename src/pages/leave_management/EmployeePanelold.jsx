import React, { useState, useEffect } from "react";
import WeeklyPattern from "../leave_management/charts/WeeklyPattern";
import MonthlyStats from "../leave_management/charts/MonthlyStats";
import RequestLeaveModal from "../leave_management/models/RequestLeaveModal";
import LeaveDashboard from "../leave_management/charts/LeaveDashboard";
import LeaveHistory from "../leave_management/models/LeaveHistory";
import CustomActiveShapePieChart from "../leave_management/charts/CustomActiveShapePieChart";
// import PendingLeaveRequests from "../leave_management/models/PendingLeaveRequests";
import PendingLeaveRequests from "./models/PendingLeaveRequests";
import CompOffPage from "../leave_management/models/CompOffPage";
import AdminPanel from "./AdminPanel"; // Adjust path if needed
import ActionButtons from "../leave_management/models/ActionButtons";
import CompOffRequestModal from "../leave_management/models/CompOffRequestModal";
import { Navigate } from "react-router-dom";
// import { useAuth } from "../../contexts/AuthContext"; // Adjust path if needed
import { useAuth } from "../../contexts/AuthContext";
import HRManageTools from "./HRManageTools";

const EmployeePanel = () => {
  const [isRequestLeaveModalOpen, setIsRequestLeaveModalOpen] = useState(false);
  // const [isAdminView, setIsAdminView] = useState(false); // toggle admin/employee view
  const employee = useAuth();
  const [activeView, setActiveView] = useState("employee"); // 'employee', 'admin', or 'hr'
  const [isCompOffModalOpen, setIsCompOffModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const compOffPageRef = React.useRef();

  let roles = employee.user?.roles || "";
  if (!Array.isArray(roles)) {
    roles = roles.split(",").map((r) => r.trim());
  }
  //const toggleView = () => setIsAdminView((prev) => !prev);
  // const handleViewChange = (view) => setActiveView(view);
  roles = roles.map((r) => r.toLowerCase());
  const useNavigate = Navigate;

  // const employee = localStorage.getItem("user")
  //   ? JSON.parse(localStorage.getItem("user"))
  //   : null;

  console.log("employee", employee);

  const employeeId = employee.user?.user_id;
  console.log("EmployeeId", employeeId);

  const isManager =
    roles.includes("manager") ||
    (employee?.roles || "").toLowerCase() === "Super_Admin";
  const isHR = roles.includes("hr");
  const isGeneral = roles.includes("general");

// set default view based on role
useEffect(() => {
  if (isManager) {
    setActiveView("admin");
  } else if (isHR) {
    setActiveView("hr");
  } else {
    setActiveView("employee"); // general users
  }
}, [isManager, isHR]);

// toggle visibility of view switching UI
const showToggle = isManager || isHR;

// ensure only allowed roles can switch to certain views
const handleViewChange = (view) => {
  if (view === "admin" && !isManager) return;
  if (view === "hr" && !isHR) return;
  setActiveView(view);
};

  // const role = "manager"; // This should be dynamically set based on user role

  const handleCompOffSubmit = async (modalData) => {
    setIsLoading(true);
    let success = false;
    // Call submit method on CompOffPage
    if (compOffPageRef.current) {
      success = await compOffPageRef.current.handleCompOffSubmit(modalData);
    }
    setIsLoading(false);
    return success;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {showToggle && (
        <div className="mb-6 flex justify-end">
          <div className="inline-flex bg-gray-200 rounded-lg p-1 shadow-inner">
            <button
              onClick={() => handleViewChange("employee")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeView === "employee"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-700 hover:bg-white"
              }`}
            >
              Employee View
            </button>

            {isManager && (
              <button
                onClick={() => handleViewChange("admin")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeView === "admin"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-gray-700 hover:bg-white"
                }`}
              >
                Manager View
              </button>
            )}

            {isHR && (
              <button
                onClick={() => handleViewChange("hr")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeView === "hr"
                    ? "bg-purple-600 text-white shadow"
                    : "text-gray-700 hover:bg-white"
                }`}
              >
                HR Tools
              </button>
            )}
          </div>
        </div>
      )}

      {/* === Employee View === */}
      {activeView === "employee" && (
        <>
          <div className="m-6 flex flex-col sm:flex-row sm:justify-end gap-2">
            <ActionButtons
              onRequestLeave={() => setIsRequestLeaveModalOpen(true)}
              onRequestCompOff={() => setIsCompOffModalOpen(true)}
            />
          </div>
          {/* Employee View content */}
          <h2 className="text-xl font-semibold m-4">Pending Leave Requests</h2>
          <div className="bg-white rounded-lg shadow p-6 mb-6 w-full">
            <PendingLeaveRequests employeeId={employeeId} />
          </div>
          <h2 className="text-xl font-semibold m-4">
            Pending Comp-Off Requests
          </h2>
          <div className="bg-white rounded-lg shadow p-6 mb-6 w-full">
            <CompOffPage ref={compOffPageRef} employeeId={employeeId} />
            {isCompOffModalOpen && (
              <CompOffRequestModal
                loading={isLoading} // Pass the loading state down
                onSubmit={handleCompOffSubmit}
                onClose={() => setIsCompOffModalOpen(false)}
              />
            )}
          </div>

          <h2 className="text-xl font-semibold m-4">My Leave Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WeeklyPattern employeeId={employeeId} />
            <CustomActiveShapePieChart employeeId={employeeId} />
            <MonthlyStats employeeId={employeeId} />
          </div>

          <h2 className="text-xl font-semibold m-4">Leave Balances</h2>
          <LeaveDashboard employeeId={employeeId} />

          <h2 className="text-xl font-semibold m-4">Leave History</h2>
          <LeaveHistory employeeId={employeeId} />

          <RequestLeaveModal
            isOpen={isRequestLeaveModalOpen}
            onClose={() => setIsRequestLeaveModalOpen(false)}
            // onLeaveRequestSuccess={handleLeaveRequestSuccess}
            employeeId={employeeId}
          />
        </>
      )}

      {/* === Admin View === */}
      {activeView === "admin" && isManager && (
        <AdminPanel employeeId={employeeId} />
      )}

      {/* === HR View === */}
      {activeView === "hr" && isHR && <HRManageTools employeeId={employeeId} />}
    </div>
  );
};

export default EmployeePanel;
