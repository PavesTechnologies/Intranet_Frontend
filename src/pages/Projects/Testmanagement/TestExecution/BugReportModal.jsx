import React, { useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { showStatusToast } from "../../../../components/toastfy/toast";
import Select from "react-select";
import Button from "../../../../components/Button/Button";

export default function BugReportModal({ step, runCaseId, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reproText, setReproText] = useState("");
  const [expected, setExpected] = useState(step.expectedResult || "");
  const [actual, setActual] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [severity, setSeverity] = useState("MAJOR");
  const [type, setType] = useState("FUNCTIONAL");

  const bugTypes = [
    "FUNCTIONAL",
    "UI",
    "PERFORMANCE",
    "SECURITY",
    "COMPATIBILITY",
    "OTHER",
  ];
  const bugSeverities = ["MINOR", "MAJOR", "CRITICAL", "BLOCKER"];
  const bugPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  // Convert to React-Select format
  const bugTypesOptions = bugTypes.map((t) => ({ value: t, label: t }));
  const bugSeveritiesOptions = bugSeverities.map((s) => ({
    value: s,
    label: s,
  }));
  const bugPrioritiesOptions = bugPriorities.map((p) => ({
    value: p,
    label: p,
  }));

  const submitBug = async () => {
    try {
      await axiosInstance.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/testing/bugs`,
        {
          runCaseId,
          runCaseStepId: step.id,
          title,
          description,
          reproductionSteps: reproText.trim(),
          expected,
          actual,
          priority,
          severity,
          type,
        },
      );

      showStatusToast("Bug created successfully!", "success");
      onClose();
    } catch (err) {
      showStatusToast("Failed to create bug", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn">
        {/* HEADER */}
        <div className="bg-red-600 text-white px-5 py-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            🐞 Report Bug
          </h2>
          <button
            onClick={onClose}
            className="text-white text-lg font-bold hover:text-gray-300"
          >
            ✖
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Bug Title */}
          <div>
            <label className="text-sm font-semibold">Bug Title</label>
            <input
              className="w-full mt-1 p-2 border rounded-lg text-sm focus:ring focus:ring-red-200"
              placeholder="Login fails when clicking the button"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* React Select — Bug Type */}
          <div>
            <label className="text-sm font-semibold">Bug Type</label>
            <Select
              className="mt-1 text-sm"
              value={bugTypesOptions.find((opt) => opt.value === type)}
              onChange={(selected) => setType(selected.value)}
              options={bugTypesOptions}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold">Description</label>
            <textarea
              className="w-full mt-1 p-2 border rounded-lg text-sm resize-none"
              rows={2}
              placeholder="Describe the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Reproduction Steps */}
          <div>
            <label className="text-sm font-semibold">
              Steps to Reproduce (one per line)
            </label>
            <textarea
              className="w-full mt-1 p-2 border rounded-lg text-sm resize-none"
              rows={3}
              placeholder={"1) Open page\n2) Enter username\n3) Click Login"}
              value={reproText}
              onChange={(e) => setReproText(e.target.value)}
            />
          </div>

          {/* Expected / Actual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold">Expected</label>
              <input
                className="w-full mt-1 p-2 border rounded-lg text-sm"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Actual</label>
              <input
                className="w-full mt-1 p-2 border rounded-lg text-sm"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
              />
            </div>
          </div>

          {/* Priority & Severity using React Select */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold">Priority</label>
              <Select
                className="mt-1 text-sm"
                value={bugPrioritiesOptions.find(
                  (opt) => opt.value === priority,
                )}
                onChange={(selected) => setPriority(selected.value)}
                options={bugPrioritiesOptions}
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Severity</label>
              <Select
                className="mt-1 text-sm"
                value={bugSeveritiesOptions.find(
                  (opt) => opt.value === severity,
                )}
                onChange={(selected) => setSeverity(selected.value)}
                options={bugSeveritiesOptions}
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-5 py-3 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>

          <Button variant="danger" onClick={submitBug}>Submit Bug</Button>
        </div>
      </div>
    </div>
  );
}
