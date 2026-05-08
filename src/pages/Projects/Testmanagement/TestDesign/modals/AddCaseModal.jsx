import React, { useState, useEffect } from "react"; // ⭐ 1. Added useEffect
import axiosInstance from "../../api/axiosInstance";
import FilterListbox from "../../../../../components/filter/FilterListbox";
import { X } from "lucide-react";
import toast from "react-hot-toast";

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
    if (!title.trim()) return toast.error("Case title is required");
    // Only strictly require scenarioId if we are creating a new case
    if (!caseToEdit && !scenarioId) return toast.error("No scenario selected");

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
        toast.success("Test Case updated successfully!");
      } else {
        await axiosInstance.post(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-cases`,
          payload,
        );
        toast.success("Test Case created successfully!");
      }

      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error("Action FAILED →", err);
      toast.error(
        caseToEdit
          ? "Failed to update test case"
          : "Failed to create test case",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[650px] max-h-[80vh] overflow-auto p-5 rounded-xl shadow-lg">
        <div className="flex justify-between mb-4">
          {/* ⭐ 5. Dynamic Modal Title */}
          <h2 className="text-lg font-semibold">
            {caseToEdit ? "Edit Test Case" : "Add Test Case"}
          </h2>
          <X className="cursor-pointer" onClick={onClose} />
        </div>

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
              <FilterListbox
                options={[{value:"FUNCTIONAL",label:"FUNCTIONAL"},{value:"REGRESSION",label:"REGRESSION"},{value:"SMOKE",label:"SMOKE"},{value:"SECURITY",label:"SECURITY"}]}
                value={type}
                onChange={setType}
              />
            </div>

            <div>
              <label className="text-sm">Priority</label>
              <FilterListbox
                options={[{value:"LOW",label:"LOW"},{value:"MEDIUM",label:"MEDIUM"},{value:"HIGH",label:"HIGH"},{value:"CRITICAL",label:"CRITICAL"}]}
                value={priority}
                onChange={setPriority}
              />
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
            <button
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${saving ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"}`}
              onClick={handleSave}
              disabled={saving}
            >
              {/* ⭐ 6. Dynamic Save Button Text */}
              {saving
                ? "Saving..."
                : caseToEdit
                  ? "Update Case"
                  : "Create Case"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
