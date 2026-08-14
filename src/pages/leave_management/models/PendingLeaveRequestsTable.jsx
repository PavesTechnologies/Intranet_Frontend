import React, { useState } from "react";
import { toast } from "react-toastify";
import api from "../../../api/axiosInstance";
import { PencilIcon } from "lucide-react";
import EditLeaveModal from "./EditLeaveModal";
import LoadingSpinner from "../../../components/LoadingSpinner";
import ConfirmationModal from "./ConfirmationModal";
import Button from "../../../components/Button/Button";
const token = localStorage.getItem("token");
const BASE_URL = window.__APP_CONFIG__.BASE_URL;

/**
 * This is now a "presentational" component. It receives data and functions as props.
 * - `pendingLeaves`: The array of leaves to display (already paginated by the parent).
 * - `leaveBalances`: Needed for the Edit Modal.
 * - `leaveTypeNames`: An array of [{name, label}] for displaying friendly leave names.
 * - `employeeId`: The current user's ID.
 * - `refreshData`: A function from the parent to trigger a full data refresh.
 */
const PendingLeaveRequestsTable = ({
  pendingLeaves,
  leaveBalances,
  leaveTypeNames, // Receive this from the parent
  employeeId,
  refreshData, // This is the key prop for refreshing
  year,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentLeaveToEdit, setCurrentLeaveToEdit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  // const [isLoading, setIsLoading] = useState(false);

  const handleEdit = (leave) => {
    setCurrentLeaveToEdit(leave);
    setIsEditModalOpen(true);
  };

  // When the modal succeeds, just call the refresh function from the parent.
  const handleUpdateSuccess = () => {
    refreshData();
  };

  const handleCancel = (leaveId) => {
    setCancelId(leaveId);
    setIsConfirmationOpen(true);
  };

  const confirmCancel = async () => {
    setLoading(true);
    try {
      const leaveToCancel = pendingLeaves.find((l) => l.leaveId === cancelId);
      if (!leaveToCancel) {
        toast.error("Leave not found.");
        return;
      }

      const empId = leaveToCancel.employee?.employeeId || employeeId;

      await api.put(
        `${BASE_URL}/api/leave-requests/${cancelId}/cancel/${empId}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      toast.success("Leave cancelled successfully");
      refreshData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Cancel failed");
    } finally {
      setCancelId(null);
      setLoading(false);
    }
  };

  // This helper now uses the prop for leave type names.
  const getLabelFromName = (name) => {
    if (!name) return "-";

    // First, try to find a direct match from the props
    if (Array.isArray(leaveTypeNames) && leaveTypeNames.length > 0) {
      const match = leaveTypeNames.find((lt) => lt.name === name);
      if (match && match.label) {
        return match.label; // e.g., "Sick Leave"
      }
    }

    // If no match is found, format the raw name gracefully.
    // "L-SICK_LEAVE" -> "Sick Leave"
    return name
      .replace(/^L-/, "") // Removes "L-" prefix
      .replace(/_/g, " ") // Replaces underscores with spaces
      .toLowerCase() // Converts to lowercase
      .replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase()); // Capitalizes each word
  };

  return (
    <div className="overflow-x-auto w-[100%]">
      <div className="w-full max-w-screen-xl mx-auto">
        <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm ">
          <thead>
            <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white text-xs border-gray-100">
              <th className="p-3">Leave Type</th>
              <th className="p-3">Start Date</th>
              <th className="p-3">End Date</th>
              <th className="p-3">Days</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* The component now just maps over the leaves it was given. */}
            {pendingLeaves.map((leave) => (
              <tr key={leave.leaveId} className="border-t text-xs">
                <td className="p-3 text-center">
                  {getLabelFromName(leave.leaveName)}
                </td>
                <td className="p-3 text-center">
                  {new Date(leave.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {leave.startSession &&
                    leave.startSession !== "none" &&
                    leave.startSession !== "fullday" && (
                      <span className="ml-1 text-gray-500">
                        ({leave.startSession})
                      </span>
                    )}
                </td>
                <td className="p-3 text-center">
                  {new Date(leave.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {leave.endSession &&
                    leave.endSession !== "none" &&
                    leave.endSession !== "fullday" && (
                      <span className="ml-1 text-gray-500">
                        ({leave.endSession})
                      </span>
                    )}
                </td>
                <td className="p-3 text-center">{leave.daysRequested}</td>
                <td className="p-3 text-center">{leave.reason || "-"}</td>
                <td className="p-3 text-center">
                  <div className="flex items-center space-x-4 justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit leave request"
                      onClick={() => handleEdit(leave)}
                    >
                      <PencilIcon className="text-blue-700 w-4 h-4" />
                    </Button>
                    <Button
                      variant="link"
                      className="text-red-500 hover:underline"
                      onClick={() => handleCancel(leave.leaveId)}
                    >
                      Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditModalOpen && (
        <EditLeaveModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setCurrentLeaveToEdit(null);
          }}
          initialData={currentLeaveToEdit}
          leaveBalances={leaveBalances}
          onSuccess={handleUpdateSuccess}
          employeeId={employeeId}
          year={year}
        />
      )}

      <ConfirmationModal
        isOpen={cancelId}
        title="Cancel Leave Request"
        message="Are you sure you want to cancel this leave request?"
        onConfirm={confirmCancel}
        onCancel={() => setCancelId(null)}
        isLoading={loading}
        confirmText="Confirm"
      />
    </div>
  );
};

export default PendingLeaveRequestsTable;
