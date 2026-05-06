import React, { useState } from "react";
import { toast } from "react-toastify";
import { statusUpdate } from "../services/projectService";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";
import Modal from "../../../components/Modal/modal";
import Button from "../../../components/Button/Button";

const UpdateProjectStatusModal = ({ open, onClose, onSuccess, pmsProjectId }) => {
  const { getEnumValues } = useEnums();
  const STATUS_OPTIONS = getEnumValues("StaffingReadinessStatus");

  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const validate = () => {
    const newErrors = {};
    if (!status) newErrors.status = "Status is required";
    if (!reason.trim()) newErrors.reason = "Reason is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      "status": status,
      "reason": reason,
      "pmsProjectId": pmsProjectId,
    }

    setLoading(true);
    try {
      const res = await statusUpdate(payload);
      toast.success(res.message || "Project status updated successfully!");
      onSuccess?.();
      onClose();
      setStatus("");
      setReason("");
    } catch (err) {
      console.error("Failed to update project status", err);
      toast.error(err.response?.data?.message || "Failed to update project status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Update Staffing Status"
      subtitle="Modify the readiness level for this project's staffing"
      className="max-w-md"
    >
      <div className="space-y-5 py-2">
        {/* Status Section */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-0.5">
            Target Status <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`w-full h-11 px-4 bg-white border rounded-xl text-sm font-medium transition-all outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 ${errors.status ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-indigo-500 group-hover:border-gray-300"
                }`}
            >
              <option value="">Select current readiness</option>
              {STATUS_OPTIONS.map((val) => (
                <option key={val} value={val}>
                  {val.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
          {errors.status && (
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide ml-1">{errors.status}</p>
          )}
        </div>

        {/* Reason Section */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-0.5">
            Reason for Update <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide context regarding this status change..."
            className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium transition-all outline-none resize-none focus:ring-4 focus:ring-indigo-500/10 ${errors.reason ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-indigo-500 hover:border-gray-300"
              }`}
          />
          {errors.reason && (
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide ml-1">{errors.reason}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 -mx-4 px-4 mt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto shadow-indigo-100"
          >
            {loading ? "Processing..." : "Update Status"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UpdateProjectStatusModal;
