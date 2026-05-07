import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import TestRunAccordion from "./TestRuns";
import { toast } from "react-toastify";

export default function RunListForCycle({
  projectId,
  cycleId,
  onAddCases,
  refreshKey,
}) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRuns = async () => {
    if (!cycleId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(
        `/test-execution/test-runs/cycles/${cycleId}`
      );
      setRuns(res.data || []);
    } catch (err) {
      console.error("Error loading runs:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async (runId) => {
    if (!window.confirm("Are you sure you want to delete this test run?")) return;
    try {
      await axiosInstance.delete(`/test-execution/test-runs/${runId}`);
      toast.success("Test run deleted successfully");
      loadRuns();
    } catch (err) {
      console.error("Error deleting run:", err);
      toast.error("Failed to delete test run");
    }
  };

  useEffect(() => {
    loadRuns();
  }, [cycleId, refreshKey]);

  if (!cycleId) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-2">Test Runs</h3>

      {loading ? (
        <p className="text-gray-500">Loading runs...</p>
      ) : runs.length === 0 ? (
        <p className="text-gray-500">No runs found for this cycle.</p>
      ) : (
        runs.map((run) => (
          <TestRunAccordion
            key={run.id}
            run={run}
            projectId={projectId}
            refreshRuns={loadRuns}
            onDelete={handleDelete}         // ✅ NEW
          />
        ))
      )}
    </div>
  );
}