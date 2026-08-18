import React, { useState, useEffect } from "react";
import { approvalService } from "../services/approvalService";
import { toast } from "react-toastify";
import ApprovalQueue from "./ApprovalQueue";
import { ChevronRight } from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import clearingDesk from "../../../components/icons/clearing-desk_emmv.svg";
import StatusBadge from "../../../components/patterns/StatusBadge";
import EmptyState from "../../../components/patterns/EmptyState";
import PageHeader from "../../../components/ui/PageHeader";

const PendingApprovalsQueueView = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openRequests, setOpenRequests] = useState({});

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const toggleRequest = (id) => {
    setOpenRequests((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const loadPendingApprovals = async () => {
    try {
      setIsLoading(true);
      const response = await approvalService.getPendingApprovalsForHr();
      const data = Array.isArray(response)
        ? response
        : response.data || response.results || [];
      setRequests(data);
    } catch (error) {
      toast.error("Failed to load pending approvals");
      console.error("Failed to load pending approvals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w">
      <PageHeader
        title="Pending Approvals Queue"
        subtitle="Read-only view of requests awaiting approval."
      />

      {isLoading ? (
        <div className="text-center p-10 bg-white rounded-lg shadow">
          <LoadingSpinner text="Loading Requests..." />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<img src={clearingDesk} alt="" className="h-40 w-40" />}
          title="No Pending Approvals."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const isOpen = !!openRequests[request.id];

            return (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-md border border-gray-200 transition-shadow hover:shadow-lg"
              >
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
                      <StatusBadge status={request.status} className="self-start" />
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6">
                    <ApprovalQueue
                      actionType={request.actionType}
                      payload={request.payload}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingApprovalsQueueView;
