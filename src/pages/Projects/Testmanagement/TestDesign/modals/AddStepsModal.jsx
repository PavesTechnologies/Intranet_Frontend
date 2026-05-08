import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import { showStatusToast } from "../../../../../components/toastfy/toast";
import Button from "../../../../../components/Button/Button";
import Modal from "../../../../../components/Modal/modal";

// ⭐ Added 'onCreated' to the props
export default function AddStepsModal({ caseId, onClose, onCreated }) {
  const [existingSteps, setExistingSteps] = useState([]);
  const [newSteps, setNewSteps] = useState([
    { action: "", expectedResult: "" },
  ]);
  const [loading, setLoading] = useState(false);

  // Load existing steps
  useEffect(() => {
    const loadSteps = async () => {
      try {
        const res = await axiosInstance.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/steps/test-cases/${caseId}`,
        );
        setExistingSteps(res.data || []);
      } catch (err) {
        console.error("Failed to load steps", err);
      }
    };

    loadSteps();
  }, [caseId]);

  const addRow = () =>
    setNewSteps([...newSteps, { action: "", expectedResult: "" }]);

  const removeRow = (i) => setNewSteps(newSteps.filter((_, idx) => idx !== i));

  const updateRow = (i, key, value) => {
    const updated = [...newSteps];
    updated[i][key] = value;
    setNewSteps(updated);
  };

  const handleSave = async () => {
    const validSteps = newSteps.filter(
      (s) => s.action.trim() || s.expectedResult.trim(),
    );

    if (!validSteps.length) {
      showStatusToast("Please add at least one valid step", "error");
      return;
    }

    setLoading(true);

    try {
      // Build final step array
      const updatedSteps = [
        ...existingSteps.map((s) => ({
          id: s.id,
          stepNumber: s.stepNumber,
          action: s.action,
          expectedResult: s.expectedResult,
        })),
        ...validSteps.map((s, i) => ({
          stepNumber: existingSteps.length + (i + 1),
          action: s.action,
          expectedResult: s.expectedResult,
        })),
      ];

      // Backend expects ONLY an array of steps
      await axiosInstance.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/steps/test-cases/${caseId}`,
        updatedSteps,
      );

      showStatusToast("Steps saved successfully!", "success");

      // Call onCreated instead, so the parent does the silent background update!
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error("Failed to save steps", err);
      showStatusToast("Failed to add steps", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Steps"
      className="max-w-[600px]"
    >
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <label className="text-sm font-medium text-gray-700">
              New Steps
            </label>
            <button
              onClick={addRow}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              + Add Step
            </button>
          </div>

          <div className="space-y-3">
            {newSteps.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 items-start">
                <input
                  className="col-span-5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={`Action #${existingSteps.length + i + 1}`}
                  value={row.action}
                  onChange={(e) => updateRow(i, "action", e.target.value)}
                />

                <input
                  className="col-span-6 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Expected result"
                  value={row.expectedResult}
                  onChange={(e) =>
                    updateRow(i, "expectedResult", e.target.value)
                  }
                />

                <button
                  className="col-span-1 text-red-500 hover:bg-red-50 rounded-lg p-2 flex items-center justify-center transition-colors"
                  onClick={() => removeRow(i)}
                  title="Remove Step"
                >
                  ✕
                </button>
              </div>
            ))}

            {newSteps.length === 0 && (
              <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                Click "+ Add Step" to create a new step.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>

          <Button variant="primary" onClick={handleSave} disabled={loading} loading={loading} loadingText="Saving...">Save Steps</Button>
        </div>
    </Modal>
  );
}
