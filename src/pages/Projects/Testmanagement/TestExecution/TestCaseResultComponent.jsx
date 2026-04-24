import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { toast } from "react-toastify";

/**
 * TestCaseResultComponent
 * Props:
 *  - runId
 *  - testCaseId
 *  - onClose
 *
 * Expects backend endpoint:
 * GET /api/test-execution/test-runs/{runId}/cases/{testCaseId}/results
 * Response example:
 * {
 *   "testCaseId": 2,
 *   "title": "Login with Valid Credentials",
 *   "overallStatus": "PASS",
 *   "executions": [
 *     {
 *       "id": 101,
 *       "executedAt": "2025-07-01T10:00:00Z",
 *       "executedBy": "apoorv",
 *       "status": "PASS",
 *       "stepResults": [
 *         { "stepId": 1, "status": "PASS", "comment": "ok" },
 *         { "stepId": 2, "status": "PASS", "comment": "" }
 *       ]
 *     },
 *     ...
 *   ],
 *   "steps": [
 *     { "id": 1, "action": "Open Login Page", "expectedResult": "Login UI loads" },
 *     ...
 *   ]
 * }
 */
export default function TestCaseResultComponent({
  runId,
  testCaseId,
  onClose,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(
        `${
          window.__APP_CONFIG__.PMS_BASE_URL
        }/api/test-execution/test-runs/${runId}/cases/${testCaseId}/results`,
      );
      setData(res.data);
    } catch (err) {
      console.error("Error fetching case results", err);
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!runId || !testCaseId) return;
    fetchResults();
  }, [runId, testCaseId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[90%] max-w-3xl text-center">
          Loading results...
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center p-4 z-50">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between bg-[#0f1724] text-white p-6">
          <div>
            <div className="text-xs text-gray-300 uppercase">
              Execution Result
            </div>
            <h3 className="text-lg font-semibold">{data.title}</h3>
            <div className="text-sm text-gray-200 mt-1">
              Overall: {data.overallStatus}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white text-2xl leading-none"
          >
            ✖
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Steps summary (show expected + last known result for each step) */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Steps</h4>
            <div className="space-y-3">
              {(data.steps || []).map((s, idx) => {
                // find latest result for this step from latest execution if present
                const latestExec =
                  (data.executions && data.executions[0]) || null;
                const stepRes =
                  latestExec?.stepResults?.find((r) => r.stepId === s.id) ||
                  null;

                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-lg border bg-gray-50 flex justify-between items-center"
                  >
                    <div>
                      <div className="text-xs text-gray-500">
                        #{idx + 1} Action
                      </div>
                      <div className="font-medium text-gray-800">
                        {s.action}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Expected: {s.expectedResult}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-semibold ${
                          stepRes?.status === "PASS"
                            ? "text-green-600"
                            : stepRes?.status === "FAIL"
                              ? "text-red-600"
                              : "text-gray-500"
                        }`}
                      >
                        {stepRes?.status || "NOT RUN"}
                      </div>
                      {stepRes?.comment && (
                        <div className="text-xs text-gray-400 mt-1">
                          {stepRes.comment}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Execution history timeline */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Execution History
            </h4>

            {(!data.executions || data.executions.length === 0) && (
              <div className="text-sm text-gray-500 italic">
                No executions recorded.
              </div>
            )}

            <div className="space-y-4">
              {(data.executions || []).map((exec) => (
                <div
                  key={exec.id}
                  className="border rounded-lg p-4 bg-white shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {exec.status}
                      </div>
                      <div className="text-xs text-gray-500">
                        {exec.executedBy || "Unknown"} —{" "}
                        {new Date(exec.executedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Steps: {exec.stepResults?.length || 0}
                    </div>
                  </div>

                  {/* step-level results inside execution */}
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {(exec.stepResults || []).map((sr) => {
                      const stepMeta = (data.steps || []).find(
                        (s) => s.id === sr.stepId,
                      );
                      return (
                        <div key={sr.stepId} className="flex items-start gap-3">
                          <div
                            className={`w-2.5 h-2.5 rounded-full mt-2 ${
                              sr.status === "PASS"
                                ? "bg-green-500"
                                : sr.status === "FAIL"
                                  ? "bg-red-500"
                                  : "bg-gray-300"
                            }`}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">
                              {stepMeta?.action || `Step ${sr.stepId}`}
                            </div>
                            <div className="text-xs text-gray-500">
                              {sr.comment || ""}
                            </div>
                          </div>
                          <div
                            className={`text-sm font-semibold ${
                              sr.status === "PASS"
                                ? "text-green-600"
                                : sr.status === "FAIL"
                                  ? "text-red-600"
                                  : "text-gray-500"
                            }`}
                          >
                            {sr.status}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
