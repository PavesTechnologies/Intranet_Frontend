import React, { useState, useEffect } from "react";
import { approvalService } from "../services/approvalService";
import { toast } from "react-toastify";
import ApprovalQueue from "./ApprovalQueue";
import { ChevronRight } from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import clearingDesk from "../../../components/icons/clearing-desk_emmv.svg";
import ConfirmationModal from "./ConfirmationModal";
import api from "../../../api/axiosInstance";
import Button from "../../../components/Button/Button";

const RMS_BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;

const ApprovalDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionState, setActionState] = useState({});
  const [openRequests, setOpenRequests] = useState({}); // ✨ 2. Add state to track open requests
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [request, setRequest] = useState(null);
  const [actionType, setActionType] = useState(""); // "approve" or "reject"
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  // ✨ 3. Function to toggle the expanded state of a request
  const toggleRequest = (id) => {
    setOpenRequests((prev) => ({
      ...prev,
      [id]: !prev[id], // Toggles the boolean value for the given id
    }));
  };

  // Confirmation Modal State
  const confirmApproveModel = (request) => {
    setActionType("approve");
    setRequest(request);
    setIsConfirmationOpen(true);
    // setActionLoading(true);
  };

  const confirmRejectModel = (request) => {
    const { id } = request;
    const reason = actionState[id]?.reason || "";
    if (!reason) {
      toast.error("Rejection reason is required");
      return;
    }
    setActionType("reject");
    setRequest(request);
    setIsConfirmationOpen(true);
    // setActionLoading(true);
  };

  const loadPendingApprovals = async () => {
    try {
      setIsLoading(true);
      const response = await approvalService.getPendingApprovals();
      const data = Array.isArray(response)
        ? response
        : response.data || response.results || [];
      setRequests(data);
      const initialState = data.reduce((acc, req) => {
        acc[req.id] = { comment: "", reason: "" };
        return acc;
      }, {});
      setActionState(initialState);
    } catch (error) {
      toast.error("Failed to load approvals");
      console.error("Failed to load approvals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStateChange = (id, field, value) => {
    setActionState((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleHolidayChange = async () => {
    try {
      const res = api.post(
        `${RMS_BASE_URL}/api/availability/trigger/holiday-change`,
        {},
        {
          params: {
            year: new Date().getFullYear(),
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
    } catch (err) {
      console.error("Failed to trigger holiday change", err);
    }
  };

  const handleApprove = async (request) => {
    const { id } = request;
    const actionType = request.actionType;
    const comment = actionState[id]?.comment || "";
    setActionLoading(true);
    try {
      const res = await approvalService.approveRequest(id, comment);
      if (
        actionType === "ADD_HOLIDAY" ||
        actionType === "UPDATE_HOLIDAY" ||
        actionType === "DELETE_HOLIDAY"
      ) {
        handleHolidayChange();
      }
      toast.success(res.data?.message || "Request Approved Successfully!");
      await loadPendingApprovals();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve request");
    } finally {
      setIsConfirmationOpen(false);
      setActionLoading(false);
    }
  };

  const handleReject = async (request) => {
    const { id } = request;
    const reason = actionState[id]?.reason || "";
    setActionLoading(true);
    try {
      const res = await approvalService.rejectRequest(id, reason);
      toast.success(res.data?.message || "Request Rejected successfully!");
      await loadPendingApprovals();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject request");
    } finally {
      setIsConfirmationOpen(false);
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w">
      <div className="mb-6">
        <h1 className="text-xl md:text-xl font-bold text-gray-800">
          Pending Approvals
        </h1>
        <p className="text-gray-500 mt-1 text-xs md:text-sm">
          Review and take action on the requests below.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center p-10 bg-white rounded-lg shadow">
          <LoadingSpinner text="Loading Requests..." />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col justify-center items-center p-8 bg-white rounded-lg">
          <img src={clearingDesk} alt="Np Pending Approvals" className="w-40" />
          <p className="text-gray-500 mt-2 text-sm`">No Pending Approvals.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {" "}
          {/* Adjusted spacing */}
          {requests.map((request) => {
            // ✨ 4. Check if the current request is open
            const isOpen = !!openRequests[request.id];

            return (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-md border border-gray-200 transition-shadow hover:shadow-lg"
              >
                {/* ✨ 5. Make the header a button to toggle the state */}
                <button
                  onClick={() => toggleRequest(request.id)}
                  className="w-full p-6 text-left"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div className="flex items-center">
                      <ChevronRight
                        className={`text-blue-800 transition-transform duration-300 ${isOpen ? "rotate-90" : ""
                          }`}
                        size={20}
                      />
                      <h3 className="font-semibold text-lg text-gray-900">
                        {request.actionType.replace(/_/g, " ")}
                      </h3>
                      {"--> "}
                      <p className="text-sm text-gray-500">
                        Requested by{" "}
                        <span className="font-medium text-gray-700">
                          {request.makerName}
                        </span>{" "}
                        on {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-2 sm:mt-0">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 self-start">
                        {request.status}
                      </span>
                    </div>
                  </div>
                </button>

                {/* ✨ 6. Conditionally render the body of the card */}
                {isOpen && (
                  <div className="px-6 pb-6">
                    <ApprovalQueue
                      actionType={request.actionType}
                      payload={request.payload}
                    />

                    <div className="mt-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor={`reason-${request.id}`}
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Rejection Reason
                          </label>
                          <input
                            id={`reason-${request.id}`}
                            maxLength="100"
                            rows="3"
                            cols="40"
                            type="text"
                            placeholder="Required for rejection..."
                            value={actionState[request.id]?.reason || ""}
                            onChange={(e) =>
                              handleStateChange(
                                request.id,
                                "reason",
                                e.target.value,
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 pt-2">
                        <Button
                          onClick={() => confirmRejectModel(request)}
                          variant="danger"
                        >
                          Reject
                        </Button>
                        <Button
                          onClick={() => confirmApproveModel(request)}
                          variant="primary"
                          className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        isOpen={isConfirmationOpen}
        title="Confirmation"
        message={
          actionType === "approve"
            ? "Are you sure you want to approve this request?"
            : "Are you sure you want to reject this request?"
        }
        onConfirm={() => {
          if (actionType === "approve") {
            handleApprove(request);
          } else if (actionType === "reject") {
            handleReject(request);
          }
        }}
        onCancel={() => setIsConfirmationOpen(false)}
        isLoading={actionLoading}
      />
      {/* {actionLoading && (
        <div className="flex justify-center py-4">
          <LoadingSpinner text="Processing..." />
        </div>
      )} */}
    </div>
  );
};

export default ApprovalDashboard;
