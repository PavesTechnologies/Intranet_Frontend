import React, { useState, useEffect } from "react"; // ⭐ 1. Added useEffect
import axiosInstance from "../../api/axiosInstance";
import { showStatusToast } from "../../../../../components/toastfy/toast";
import Button from "../../../../../components/Button/Button";
import Modal from "../../../../../components/Modal/modal";

// ⭐ 2. Added caseToEdit prop
export default function AddCaseModal({
  scenarioId,
  caseToEdit,
  onClose,
  onCreated,
}) {
  const [title, setTitle] = useState("");
  const [preConditions, setPreConditions] = useState("");
  const [priority, setPriority] = useState("LOW");
  const [type, setType] = useState("FUNCTIONAL");
  const [steps, setSteps] = useState([{ action: "", expectedResult: "" }]);
  const [saving, setSaving] = useState(false);

  // ⭐ 3. Added useEffect to pre-fill the form when editing
  useEffect(() => {
    if (caseToEdit) {
      setTitle(caseToEdit.title || "");
      setPreConditions(caseToEdit.preConditions || "");
      setPriority(caseToEdit.priority || "LOW");
      setType(caseToEdit.type || "FUNCTIONAL");

      // If the case already has steps, pre-fill them. Otherwise, leave one blank row.
      if (caseToEdit.steps && caseToEdit.steps.length > 0) {
        setSteps(
          caseToEdit.steps.map((s) => ({
            action: s.action || "",
            expectedResult: s.expectedResult || s.expected || "", // Safely handle DTO variations
          })),
        );
      } else {
        setSteps([{ action: "", expectedResult: "" }]);
      }
    }
  }, [caseToEdit]);

  const addStep = () => {
    setSteps([...steps, { action: "", expectedResult: "" }]);
  };

  const updateStep = (index, field, value) => {
    const updated = [...steps];
    updated[index][field] = value;
    setSteps(updated);
  };

  const removeStep = (index) => {
    const updated = steps.filter((_, i) => i !== index);
    setSteps(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) return showStatusToast("Case title is required", "error");
    // Only strictly require scenarioId if we are creating a new case
    if (!caseToEdit && !scenarioId) return showStatusToast("No scenario selected", "error");

    setSaving(true);

    try {
      const payload = {
        scenarioId: Number(scenarioId),
        title: title.trim(),
        preConditions: preConditions.trim(),
        type,
        priority,
        steps: steps
          .filter((s) => s.action.trim() || s.expectedResult.trim())
          .map((s) => ({
            action: s.action,
            expectedResult: s.expectedResult,
          })),
      };

      // ⭐ 4. Conditional logic for PUT (Edit) vs POST (Create)
      if (caseToEdit) {
        await axiosInstance.put(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-cases/${caseToEdit.id}`,
          payload,
        );
        showStatusToast("Test Case updated successfully!", "success");
      } else {
        await axiosInstance.post(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-cases`,
          payload,
        );
        showStatusToast("Test Case created successfully!", "success");
      }

      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error("Action FAILED →", err);
      showStatusToast(
        caseToEdit ? "Failed to update test case" : "Failed to create test case",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={caseToEdit ? "Edit Test Case" : "Add Test Case"}
      className="max-w-[650px]"
    >
        <div className="space-y-4">
          <div>
            <label className="text-sm">Title</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter case title"
            />
          </div>

          <div>
            <label className="text-sm">Pre-Conditions</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={preConditions}
              onChange={(e) => setPreConditions(e.target.value)}
              rows={2}
              placeholder="Enter pre-conditions"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Type</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="FUNCTIONAL">FUNCTIONAL</option>
                <option value="REGRESSION">REGRESSION</option>
                <option value="SMOKE">SMOKE</option>
                <option value="SECURITY">SECURITY</option>
              </select>
            </div>

            <div>
              <label className="text-sm">Priority</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <label className="text-sm">Steps</label>
              <button
                onClick={addStep}
                className="text-blue-600 text-sm hover:text-blue-800"
              >
                + Add Step
              </button>
            </div>

            <div className="space-y-2 mt-2">
              {steps.map((step, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <input
                    className="col-span-5 border rounded px-2 py-1"
                    placeholder={`Action #${i + 1}`}
                    value={step.action}
                    onChange={(e) => updateStep(i, "action", e.target.value)}
                  />
                  <input
                    className="col-span-6 border rounded px-2 py-1"
                    placeholder="Expected Result"
                    value={step.expectedResult}
                    onChange={(e) =>
                      updateStep(i, "expectedResult", e.target.value)
                    }
                  />
                  <button
                    className="col-span-1 text-red-500 hover:bg-red-50 rounded p-1 flex items-center justify-center"
                    onClick={() => removeStep(i)}
                    title="Remove Step"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving} loading={saving} loadingText="Saving...">
              {caseToEdit ? "Update Case" : "Create Case"}
            </Button>
          </div>
        </div>
    </Modal>
  );
}
