import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { showStatusToast } from "../../../../components/toastfy/toast";
import BugReportModal from "./BugReportModal";

export default function RunTestCaseComponent({ runId, runCaseId, testCaseId, onClose }) {
  const [isLoading, setIsLoading] = useState(false);
  const [testCase, setTestCase] = useState({ title: `Test Case #${testCaseId || runCaseId}` });
  const [steps, setSteps] = useState([]);
  const [stepResults, setStepResults] = useState({});
  const [showBugModal, setShowBugModal] = useState(false);
  const [failingStep, setFailingStep] = useState(null);
  const [failedStepId, setFailedStepId] = useState(null);

  // Load steps
  const fetchTestCaseExecution = async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-execution/run-cases/${runCaseId}/steps`,
      );
      const stepsData = Array.isArray(res.data) ? res.data : res.data?.steps || [];
      setSteps(stepsData);
      if (res.data?.testCase?.title) {
        setTestCase(res.data.testCase);
      }
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load test case execution:", err);
      showStatusToast("Failed to load test case execution", "error");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!runCaseId) return;
    fetchTestCaseExecution();
  }, [runCaseId]);

  // -----------------------------------------------------
  // Single Step Update
  // -----------------------------------------------------
  const updateStepResult = async (stepId, action) => {
    let apiStatus =
      action === "PASS" ? "PASSED" : action === "FAIL" ? "FAILED" : "SKIPPED";

    if (action === "FAIL") {
      const stepObj = steps.find((s) => s.id === stepId);
      setFailingStep(stepObj);
      setFailedStepId(stepId);
      setShowBugModal(true);
    }

    try {
      await axiosInstance.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-execution/steps/execute`,
        {
          runCaseId,
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
      console.error("Failed to update step:", err);
      showStatusToast("Failed to update step", "error");
    }
  };

  // -----------------------------------------------------
  // SUBMIT RUN CASE RESULT
  // -----------------------------------------------------
  const submitRunCaseResult = async (action) => {
    if (action === "FAIL" && !failedStepId) {
      showStatusToast("Please mark the failing step before failing the test case.", "error");
      return;
    }

    try {
      const url =
        action === "PASS"
          ? `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-execution/cases/pass`
          : action === "FAIL"
            ? `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-execution/cases/fail`
            : `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-execution/cases/block`;

      const body = { runCaseId, notes: "" };
      if (action === "FAIL") body.stepId = failedStepId;

      await axiosInstance.post(url, body);

      const apiStatus = action === "PASS" ? "PASSED" : action === "FAIL" ? "FAILED" : "BLOCKED";
      showStatusToast(`Test case marked as ${apiStatus}`, "success");
      if (onClose) onClose();
    } catch (err) {
      console.error("Failed to submit result:", err);
      showStatusToast("Failed to submit test result", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center p-4 z-50">
      {/* BUG REPORT MODAL */}
      {showBugModal && failingStep && (
        <BugReportModal
          step={failingStep}
          runCaseId={runCaseId}
          onClose={() => {
            setShowBugModal(false);
            setFailingStep(null);
          }}
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

        {/* COMPLETION ACTIONS */}
        <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Execute all steps above, then mark the test case as complete.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => submitRunCaseResult("PASS")}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              ✅ Pass Test Case
            </button>
            <button
              onClick={() => submitRunCaseResult("FAIL")}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ❌ Fail Test Case
            </button>
            <button
              onClick={() => submitRunCaseResult("BLOCK")}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              🚫 Block Test Case
            </button>
          </div>
        </div>

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
                  <div>
                    <p className="text-xs text-gray-500">
                      #{step.stepNumber} ACTION
                    </p>
                    <p className="text-md font-semibold">{step.action}</p>
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
