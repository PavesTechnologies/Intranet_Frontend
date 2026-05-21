import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import CompOffBalanceRequests from "../leave_management/models/CompOffBalanceRequests";
import HandleLeaveRequestAndApprovals from "../leave_management/models/HandleLeaveRequestAndApprovals";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/Button/Button";
import RevokeLeaveRequests from "./models/RevokeLeaveRequests";
import { toast } from "react-toastify";
import { se } from "date-fns/locale";
import { useWebSocket } from "./websockets/WebSocketProvider.jsx";
import { set } from "date-fns";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const AdminPanel = ({ employeeId }) => {
  // const [searchTerm, setSearchTerm] = useState("");
  // const [selectedStatus, setSelectedStatus] = useState("Status");
  // const [selectedRequests, setSelectedRequests] = useState([]);
  // const [adminLeaveRequests, setAdminLeaveRequests] = useState([]);
  const [resultMsg, setResultMsg] = useState(null);
  const [revokeRequests, setRevokeRequests] = useState([]);

  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();
  const leaveApprovalRef = useRef();
  const refreshCooldown = useRef(false);
  const [leaveTypes, setLeaveTypes] = useState([]);

  // const user = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : {};
  // const isManager = user?.role?.toLowerCase() === "manager";

  // const employee = useAuth();
  // console.log("useAuth", employee);
  // leave history and admin requests
  // if (!isManager) {
  //   return (
  //     <div className="text-red-600 font-semibold p-4">
  //       Access Denied: Manager Only
  //     </div>
  //   );
  // }

  useEffect(() => {
    axios
      .post(
        `${BASE_URL}/api/leave-requests/manager/history`,
        {
          managerId: employeeId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      )
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : res.data?.data || [];
        // setAdminLeaveRequests(arr.map(toLeaveRequest));
      })
      .catch((err) => console.error("Failed to fetch leave requests:", err));
  }, []);

  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/leave/get-all-leave-types`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        // const arr = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setLeaveTypes(res.data?.regular || []);
        console.log("Fetched Leave Types:", res.data?.regular || []);
        // setAdminLeaveRequests(arr.map(toLeaveRequest));
      })
      .catch((err) => console.error("Failed to fetch leave types:", err));
  }, []);

  useEffect(() => {
    if (resultMsg) {
      const timer = setTimeout(() => setResultMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [resultMsg]);

  const fetchRevokeRequests = useCallback(async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/leave-revoke/pending/${employeeId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      if (res.data.success && Array.isArray(res.data.data)) {
        const revokeRequests = res.data.data;
        setRevokeRequests(revokeRequests);

        // Notify parent if callback exists
        // if (onPendingRequestsChange) {
        //   onPendingRequestsChange(pending);
        // }
      } else {
        setRevokeRequests([]);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to fetch Revoke Requests.",
      );
      setRevokeRequests([]);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchRevokeRequests();
  }, [fetchRevokeRequests]);
  // Subscribe to WebSocket for real-time updates
  // In AdminPanel.js
  console.log("leavered", leaveApprovalRef.current);

  useEffect(() => {
    const sub1 = subscribe("leave-updated", () => {
      handleRefresh();
    });
    const sub2 = subscribe("data-updated", () => {
      handleRefresh();
    });

    return () => {
      sub1();
      sub2();
    };
  }, [subscribe, fetchRevokeRequests]);
  const handleRefresh = () => {
    if (refreshCooldown.current) return; // ⛔ already refreshing
    refreshCooldown.current = true;
    fetchRevokeRequests();
    console.log("WS EVENT → refreshing admin data");
    leaveApprovalRef.current?.refreshData();

    setTimeout(() => {
      refreshCooldown.current = false;
    }, 2000);
  };

  // const filteredAdminRequests = adminLeaveRequests.filter((request) => {
  //   const matchesSearch =
  //     request.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     request.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     request.leaveType.toLowerCase().includes(searchTerm.toLowerCase());
  //   const matchesStatus =
  //     selectedStatus === "Status" || request.status === selectedStatus;
  //   return matchesSearch && matchesStatus;
  // });

  // const handleSelectAll = (checked) => {
  //   if (checked) {
  //     setSelectedRequests(filteredAdminRequests.map((req) => req.id));
  //   } else {
  //     setSelectedRequests([]);
  //   }
  // };

  // const handleSelectRequest = (id, checked) => {
  //   if (checked) {
  //     setSelectedRequests([...selectedRequests, id]);
  //   } else {
  //     setSelectedRequests(selectedRequests.filter((reqId) => reqId !== id));
  //   }
  // };

  // const getStatusColor = (status) => {
  //   switch (status) {
  //     case "Pending":
  //       return "bg-yellow-100 text-yellow-800";
  //     case "Approved":
  //       return "bg-green-100 text-green-800";
  //     case "Rejected":
  //       return "bg-red-100 text-red-800";
  //     default:
  //       return "bg-gray-100 text-gray-800";
  //   }
  // };

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Leave Management
          </h1>
          <p className="text-gray-600">Handle leave requests and approvals</p>
        </div>
        <div>
          {/* <Button
            onClick={() => navigate(`/block-leave-dates/${employeeId}`)}
            variant="secondary"
            size="medium"
          >
            Manage Leave Blocks
          </Button> */}
        </div>
      </div>

      {/* Statistics Cards */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {pendingCount}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-semibold text-gray-900">
                {approvedCount}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Available Days</p>
              <p className="text-2xl font-semibold text-gray-900">18</p>
            </div>
          </div>
        </div>
      </div> */}

      {/* Comp-Off Balance Requests Section */}
      {permissions.includes("VIEW_COMPOFF_BY_EMPLOYEE") &&
        leaveTypes.some((lt) => lt.leaveTypeId === "L-COMPOFF") && (
          <CompOffBalanceRequests managerId={employeeId} />
        )}
      {/* <CompOffBalanceRequests managerId={employeeId} /> */}

      {revokeRequests.length > 0 && (
        <RevokeLeaveRequests
          revokeRequests={revokeRequests}
          onActionSuccess={fetchRevokeRequests}
        />
      )}

      {/* Search and Filter Section */}
      {permissions.includes("VIEW_LEAVE_REQUEST_BY_EMPLOYEE") && (
        <HandleLeaveRequestAndApprovals
          employeeId={employeeId}
          ref={leaveApprovalRef}
        />
      )}

      {/* Modals */}
      {/* <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
      />
      <AddLeaveTypeModal
        isOpen={isAddLeaveTypeModalOpen}
        onClose={() => setIsAddLeaveTypeModalOpen(false)}
      /> */}
    </div>
  );
};

export default AdminPanel;
