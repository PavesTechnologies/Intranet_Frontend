import React, { useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import axios from "axios";
import { toast } from "react-toastify";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const CarryForwardTrigger = ({ isOpen, onClose, onSuccess }) => {
  const [year, setYear] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const BASE_URL = window.__APP_CONFIG__.BASE_URL;
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  // 🔥 Mutation Function
  const mutation = useMutation({
    mutationFn: async (year) => {
      const response = await axios.post(
        `${BASE_URL}/api/leave-balance/process-carry-forwards/${year}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      return response.data;
    },

    // ✅ On Success → update UI + invalidate cache
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }

      // 🔥 VERY IMPORTANT: refresh cached data
      queryClient.invalidateQueries(["leaveBalance"]);
      queryClient.invalidateQueries(["leaveRequests"]);
      queryClient.invalidateQueries(["dashboardStats"]);

      setIsModalOpen(false);
      onClose();
      onSuccess();
    },

    onError: () => {
      toast.error("Failed to process carry forward");
    },
  });

  const handleConfirmClick = () => {
    if (!year) {
      toast.error("Please enter a year");
      return;
    }
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleConfirm = () => {
    mutation.mutate(year); // 🔥 trigger mutation
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-lg font-semibold mb-3">Process Carry Forward</h2>

        <input
          type="number"
          placeholder="Enter Year (e.g. 2025)"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
            Close
          </button>

          <button
            onClick={handleConfirmClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>

        <ConfirmationModal
          isOpen={isModalOpen}
          title="Confirm Carry Forward"
          message={`Are you sure you want to process carry forward for year ${year}?`}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isLoading={mutation.isPending} // ✅ from react query
          confirmText="Process"
        />
      </div>
    </div>
  );
};

export default CarryForwardTrigger;
