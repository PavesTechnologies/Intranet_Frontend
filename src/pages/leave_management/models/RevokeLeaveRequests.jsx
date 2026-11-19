import React, { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import Button from "../../../components/Button/Button";
import DataTable from "../../../components/patterns/DataTable";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;
const RMS_BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;
const formatted = new Date().toISOString().slice(0, 7);

const RevokeLeaveRequests = ({ revokeRequests, onActionSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleResourceCalculate = async (resourceId) => {
    try {
      const res = api.post(
        `${RMS_BASE_URL}/api/availability/recalculate/resource/${resourceId}`,
        {},
        {
          params: {
            yearMonth: formatted,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      // console.log("Recalculate result: ", res);
    } catch (err) {
      console.error("Failed to calculate resource availability", err);
    }
  };

  const handleApprove = async (leaveId, employeeId, year) => {
    setLoading(true);

    try {
      const res = await api.post(
        `${BASE_URL}/api/leave-revoke/approve/${leaveId}`,
        {
          employeeId: employeeId,
          year: year,
        }, // ✅ correct body
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      toast.success(
        res?.data?.message || "Leave request revoked successfully.",
      );

      if (onActionSuccess) onActionSuccess();

      handleResourceCalculate(employeeId);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to revoke leave request.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (leaveId, employeeId, year) => {
    try {
      setLoading(true);
      const res = await api.post(
        `${BASE_URL}/api/leave-revoke/reject/${leaveId}`,
        {
          payload: {
            employeeId: employeeId,
            year: year,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      toast.success(res?.data?.message || "Revoke request rejected.");
      if (onActionSuccess) onActionSuccess();
    } catch {
      toast.error("Rejection failed.");
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   if (managerId) fetchCompOffs();
  // }, [managerId]);

  // Note: the "REVOKE_REQUESTED" WebSocket subscription now lives in
  // AdminPanel.jsx, since this component only mounts when
  // revokeRequests.length > 0 and would miss the very first request.

  return (
    <DataTable
      loading={loading}
      getRowKey={(req) => req.revokeId}
      rows={revokeRequests}
      columns={[
        { key: "leaveName", header: "Leave Type", className: "text-center" },
        { key: "employeeName", header: "Employee", className: "text-center" },
        {
          key: "startDate",
          header: "Start Date",
          className: "text-center",
          render: (req) =>
            new Date(req.startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
        },
        {
          key: "endDate",
          header: "End Date",
          className: "text-center",
          render: (req) =>
            new Date(req.endDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
        },
        {
          key: "days",
          header: "Duration",
          className: "text-center",
          render: (req) =>
            req.days <= 1 ? `${req.days} Day` : `${req.days} Days`,
        },
        { key: "reason", header: "Reason", className: "text-center" },
        {
          key: "actions",
          header: "Action",
          className: "text-center",
          render: (req) => (
            <div className="flex justify-center gap-2">
              <Button
                onClick={() =>
                  handleApprove(req.revokeId, req.employeeId, req.year)
                }
                variant="primary"
                size="icon"
                aria-label="Approve"
                className="p-1 pr-2 text-green-600 hover:text-green-800 transition-colors"
                title="Approve"
                disabled={loading}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                onClick={() =>
                  handleReject(req.revokeId, req.employeeId, req.year)
                }
                variant="danger"
                size="icon"
                aria-label="Reject"
                className="p-1 pl-4 text-red-600 hover:text-red-800 transition-colors"
                title="Reject"
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ),
        },
      ]}
    />
  );
};

export default RevokeLeaveRequests;
