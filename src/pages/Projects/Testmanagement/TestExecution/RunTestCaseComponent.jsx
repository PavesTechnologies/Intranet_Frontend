import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { showStatusToast } from "../../../../components/toastfy/toast";
import BugReportModal from "./BugReportModal";
import { se } from "date-fns/locale";

export default function RunTestCaseComponent({ runId, testCaseId, onClose }) {
  const [isLoading, setIsLoading] = useState(false);
  const [testCase, setTestCase] = useState(null);
  const [steps, setSteps] = useState([]);
  const [stepResults, setStepResults] = useState({});
  const [selectedSteps, setSelectedSteps] = useState([]);
  const [showBugModal, setShowBugModal] = useState(false);
  const [failingStep, setFailingStep] = useState(null);

  // Load steps
  const fetchTestCaseExecution = async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get(
        `${
          window.__APP_CONFIG__.PMS_BASE_URL
        }/api/test-execution/run-cases/${testCaseId}/steps`,
      );
      setSteps(res.data);
      setTestCase({ title: `Executing Test Case ${testCaseId}` });
      setIsLoading(false);
    } catch (err) {
      showStatusToast("Failed to load steps", "error");
    }
  };

  useEffect(() => {
    fetchTestCaseExecution();
  }, []);

  // -----------------------------------------------------
  // Single Step Update
  // -----------------------------------------------------
  const updateStepResult = async (stepId, action) => {
    let apiStatus =
      action === "PASS" ? "PASSED" : action === "FAIL" ? "FAILED" : "SKIPPED";

    if (action === "FAIL") {
      const stepObj = steps.find((s) => s.id === stepId);
      setFailingStep(stepObj);
      setShowBugModal(true);
      //   return;
    }

    try {
      await axiosInstance.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-execution/steps/execute`,
        {
          runCaseId: testCaseId,
          stepId,
          status: apiStatus,
          actualResult: "",
        },
      );

      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, status: apiStatus } : s)),
      );

      setStepResults((prev) => ({ ...prev, [stepId]: apiStatus }));
      showStatusToast(`Step updated: ${apiStatus}`, "success");
    } catch (err) {
      showStatusToast("Failed to update step", "error");
    }
  };

  // -----------------------------------------------------
  // BULK UPDATE
  // -----------------------------------------------------
  const bulkUpdate = async (action) => {
    if (selectedSteps.length === 0) return;

    try {
      let endpoint = "";
      let apiStatus = "";

      if (action === "PASS") {
        endpoint = `${
          window.__APP_CONFIG__.PMS_BASE_URL
        }/api/test-execution/test-runs/${runId}/bulk-pass`;
        apiStatus = "PASSED";
      } else if (action === "SKIP") {
        endpoint = `${
          window.__APP_CONFIG__.PMS_BASE_URL
        }/api/test-execution/test-runs/${runId}/bulk-skip`;
        apiStatus = "SKIPPED";
      }

      await axiosInstance.post(endpoint, {
        testCaseIds: testCaseId,
      });

      showStatusToast(`${selectedSteps.length} steps updated`, "success");

      setSteps((prev) =>
        prev.map((s) =>
          selectedSteps.includes(s.id) ? { ...s, status: apiStatus } : s,
        ),
      );

      setSelectedSteps([]);
    } catch (err) {
      showStatusToast("Bulk update failed", "error");
    }
  };

  // -----------------------------------------------------
  // SELECT ALL CHECKBOX
  // -----------------------------------------------------
  const allSelected = selectedSteps.length === steps.length;
  const partiallySelected =
    selectedSteps.length > 0 && selectedSteps.length < steps.length;

  if (!testCase) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center p-4 z-50">
      {/* BUG REPORT MODAL */}
      {showBugModal && failingStep && (
        <BugReportModal
          step={failingStep}
          runCaseId={testCaseId}
          onClose={() => {
            setShowBugModal(false);
            setFailingStep(null);
            // updateStepResult(failingStep.id, "FAIL"); // instant UI update
            // fetchTestCaseExecution(); // sync with backend
          }}

          // onSuccess={() => {
          //     updateStepResult(failingStep.id, "FAIL");
          // }}
        />
      )}

      <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="bg-[#0f1b2d] text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Running Test Case</h2>
            <p className="text-lg mt-1">{testCase.title}</p>
          </div>
          <button onClick={onClose} className="text-white text-2xl">
            ✖
          </button>
        </div>

        {/* BULK BAR */}
        {selectedSteps.length > 0 && (
          <div className="p-3 flex gap-4 bg-yellow-50 border-b border-yellow-300">
            <span className="font-semibold text-gray-700">
              {selectedSteps.length} step(s) selected
            </span>

            <button
              onClick={() => bulkUpdate("PASS")}
              className="px-3 py-1 bg-green-600 text-white rounded"
            >
              ✔ Pass Selected
            </button>

            <button
              onClick={() => bulkUpdate("SKIP")}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              ➖ Skip Selected
            </button>
          </div>
        )}

        {steps.length > 0 && (
          <div className="p-4 flex items-center gap-2 border-b">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = partiallySelected;
              }}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedSteps(steps.map((s) => s.id));
                } else {
                  setSelectedSteps([]);
                }
              }}
            />
            <span className="text-gray-700 font-medium">Select All Steps</span>
          </div>
        )}

        {/* STEPS LIST */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="text-center text-gray-500 py-10">
              <p className="text-lg">Loading steps...</p>
            </div>
          ) : steps.length === 0 ? (
            /* NO STEPS FALLBACK MESSAGE */
            <div className="text-center text-gray-500 py-10">
              <p className="text-lg font-medium">No test steps found for this test case.</p>
            </div>
          ) : 
            steps.map((step) => {
              const effectiveStatus = stepResults[step.id] || step.status;

              return (
                <div
                  key={step.id}
                  className={`p-4 border rounded-xl shadow-sm ${
                    effectiveStatus === "PASSED"
                      ? "bg-green-50 border-green-300"
                      : effectiveStatus === "FAILED"
                      ? "bg-red-50 border-red-300"
                      : effectiveStatus === "SKIPPED"
                      ? "bg-blue-50 border-blue-300"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                {/* STEP HEADER */}
                <div className="flex justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSteps.includes(step.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSteps((prev) => [...prev, step.id]);
                        } else {
                          setSelectedSteps((prev) =>
                            prev.filter((id) => id !== step.id),
                          );
                        }
                      }}
                      className="mt-1"
                    />

                    <div>
                      <p className="text-xs text-gray-500">
                        #{step.stepNumber} ACTION
                      </p>
                      <p className="text-md font-semibold">{step.action}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500">EXPECTED</p>
                    <p className="text-md">{step.expectedResult}</p>
                  </div>
                </div>

                {/* BUTTONS */}
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => updateStepResult(step.id, "PASS")}
                    className={`px-4 py-2 rounded border ${
                      effectiveStatus === "PASSED"
                        ? "bg-green-600 text-white"
                        : "border-green-500 text-green-600"
                    }`}
                  >
                    ✔ Pass
                  </button>

                  <button
                    onClick={() => updateStepResult(step.id, "FAIL")}
                    className={`px-4 py-2 rounded border ${
                      effectiveStatus === "FAILED"
                        ? "bg-red-600 text-white"
                        : "border-red-500 text-red-600"
                    }`}
                  >
                    ✖ Fail
                  </button>

                  <button
                    onClick={() => updateStepResult(step.id, "SKIP")}
                    className={`px-4 py-2 rounded border ${
                      effectiveStatus === "SKIPPED"
                        ? "bg-blue-600 text-white"
                        : "border-blue-500 text-blue-600"
                    }`}
                  >
                    ➖ Skip
                  </button>
                </div>

                {step.actualResult && (
                  <div className="mt-3 text-sm text-gray-700">
                    <span className="font-medium">Actual Result: </span>
                    {step.actualResult}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
