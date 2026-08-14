import React, { useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import Pagination from "../../../components/Pagination/pagination";
import Button from "../../../components/Button/Button";

const CompOffRequestsTable = ({ requests, onCancel, loading }) => {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5; // adjust how many rows per page

  const handleCancelClick = (id) => {
    setSelectedRequestId(id);
    setConfirmModalOpen(true);
  };

  const confirmCancellation = async () => {
    if (selectedRequestId) {
      await onCancel(selectedRequestId);
    }
    setConfirmModalOpen(false);
    setSelectedRequestId(null);
  };

  const cancelModal = () => {
    setConfirmModalOpen(false);
    setSelectedRequestId(null);
  };

  // Filter only pending requests
  const pendingRequests =
    requests?.filter((req) => req.status === "PENDING") || [];

  // 🟢 If no pending requests, render nothing
  if (pendingRequests.length === 0) {
    return null;
  }

  // Pagination calculations
  const totalPages = Math.ceil(pendingRequests.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRequests = pendingRequests.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  return (
    <div className="overflow-x-auto w-full">
      <div className="w-full max-w-screen-xl mx-auto">
        {/* 🟢 Table Rendering */}
        <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
          <thead>
            <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white text-xs">
              <th className="p-3">Start Date</th>
              <th className="p-3">End Date</th>
              <th className="p-3">Days</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRequests.map((req) => (
              <tr
                key={req.idleaveCompoff}
                className="border-t border-gray-200 text-xs text-center justify-center"
              >
                <td className="p-3">
                  {new Date(req.startDate).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {req.startSession && req.startSession !== "none" && (
                    <span className="ml-1 text-gray-500">({req.startSession})</span>
                  )}
                </td>
                <td className="p-3">
                  {new Date(req.endDate).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {req.endSession && req.endSession !== "none" && (
                    <span className="ml-1 text-gray-500">({req.endSession})</span>
                  )}
                </td>
                <td className="p-3">{req.duration}</td>
                <td className="p-3">{req.status}</td>
                <td className="p-3">
                  <Button
                    variant="link"
                    onClick={() => handleCancelClick(req.idleaveCompoff)}
                    className="text-red-600 hover:underline"
                    aria-label="Cancel comp-off request"
                  >
                    Cancel
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Component */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            />
          </div>
        )}
      </div>

      {/* ❌ Commented out empty state UI
      <div className="flex items-center">
        <div className="text-black-600 text-xl">📭</div>
        <div className="text-black-600 pl-4">
          <h2 className={Fonts.heading4}>
            Hurray! No Pending Comp-Off Requests
          </h2>
          <p className={Fonts.caption}>Request Comp-Off on the above!</p>
        </div>
      </div>
      */}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModalOpen}
        title="Cancel Comp-Off Request"
        message="Are you sure you want to cancel this comp-off request?"
        onConfirm={confirmCancellation}
        onCancel={cancelModal}
        isLoading={loading}
      />
    </div>
  );
};

export default CompOffRequestsTable;
