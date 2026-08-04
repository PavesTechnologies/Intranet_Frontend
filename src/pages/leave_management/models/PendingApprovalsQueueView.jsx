import React, { useState, useEffect } from "react";
import { approvalService } from "../services/approvalService";
import { toast } from "react-toastify";
import ApprovalQueue from "./ApprovalQueue";
import { ChevronRight } from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import clearingDesk from "../../../components/icons/clearing-desk_emmv.svg";

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
      <div className="mb-6">
        <h1 className="text-xl md:text-xl font-bold text-gray-800">
          Pending Approvals Queue
        </h1>
        <p className="text-gray-500 mt-1 text-xs md:text-sm">
          Read-only view of requests awaiting approval.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center p-10 bg-white rounded-lg shadow">
          <LoadingSpinner text="Loading Requests..." />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col justify-center items-center p-8 bg-white rounded-lg">
          <img src={clearingDesk} alt="No Pending Approvals" className="w-40" />
          <p className="text-gray-500 mt-2 text-sm">No Pending Approvals.</p>
        </div>
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
                        className={`text-blue-800 transition-transform duration-300 ${
                          isOpen ? "rotate-90" : ""
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
