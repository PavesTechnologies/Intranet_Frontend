import React, { useState, useEffect } from "react";
import ConfirmationModal from "./ConfirmationModal";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import Button from "../../../components/Button/Button";
import FormInput from "../../../components/forms/FormInput";
const CarryForwardTrigger = ({ isOpen, onClose, onSuccess }) => {
  const [year, setYear] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const BASE_URL = window.__APP_CONFIG__.BASE_URL;

  // ❗ Hooks ABOVE return

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (!year) {
      toast.error("Please enter a year");
      return;
    }
    setIsModalOpen(true);
  };

  // useEffect(() => {
  //   if (isModalOpen) {
  //     document.body.style.overflow = "hidden";
  //   } else {
  //     document.body.style.overflow = "auto";
  //   }
  // }, [isModalOpen]);

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleConfirm = async () => {
    setIsLoading(true);

    try {
      const response = await api.post(
        `${BASE_URL}/api/leave-balance/process-carry-forwards/${year}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const data = response.data;

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }

      setIsModalOpen(false);
      onClose();
      onSuccess(); // 🔥 parent will refresh data
    } catch (err) {
      toast.error("Failed to process carry forward");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-lg font-semibold mb-3">Process Carry Forward</h2>

        <FormInput
          type="number"
          name="carryForwardYear"
          placeholder="Enter Year (e.g. 2025)"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          inputClassName="mb-4"
        />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} size="medium">
            Close
          </Button>

          <Button onClick={handleConfirmClick} variant="primary" size="medium">
            Confirm
          </Button>
        </div>

        <ConfirmationModal
          isOpen={isModalOpen}
          title="Confirm Carry Forward"
          message={`Are you sure you want to process carry forward for year ${year}?`}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isLoading={isLoading}
          confirmText="Process"
        />
      </div>
    </div>
  );
};

export default CarryForwardTrigger;
