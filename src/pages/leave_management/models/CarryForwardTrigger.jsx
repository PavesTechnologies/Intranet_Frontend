import React, { useState } from "react";
import ConfirmationModal from "./ConfirmationModal";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import Button from "../../../components/Button/Button";
import FormInput from "../../../components/forms/FormInput";
import Modal from "../../../components/Modal/modal";
const CarryForwardTrigger = ({ isOpen, onClose, onSuccess }) => {
  const [year, setYear] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const BASE_URL = window.__APP_CONFIG__.BASE_URL;

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Process Carry Forward"
      size="md"
      closeOnBackdrop={false}
      closeOnEscape={false}
      showCloseButton={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} size="medium">
            Close
          </Button>

          <Button onClick={handleConfirmClick} variant="primary" size="medium">
            Confirm
          </Button>
        </div>
      }
    >
      <FormInput
        type="number"
        name="carryForwardYear"
        placeholder="Enter Year (e.g. 2025)"
        value={year}
        onChange={(e) => setYear(e.target.value)}
      />

      <ConfirmationModal
        isOpen={isModalOpen}
        title="Confirm Carry Forward"
        message={`Are you sure you want to process carry forward for year ${year}?`}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isLoading={isLoading}
        confirmText="Process"
      />
    </Modal>
  );
};

export default CarryForwardTrigger;
