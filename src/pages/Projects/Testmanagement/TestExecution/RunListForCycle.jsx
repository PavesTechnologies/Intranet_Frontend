import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import TestRunAccordion from "./TestRuns";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";

export default function RunListForCycle({
  projectId,
  cycleId,
  onAddCases,
  refreshKey,
}) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteRunConfirmOpen, setDeleteRunConfirmOpen] = useState(false);
  const [runIdToDelete, setRunIdToDelete] = useState(null);

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
  const handleDelete = (runId) => {
    setRunIdToDelete(runId);
    setDeleteRunConfirmOpen(true);
  };

  const executeDeleteRun = async () => {
    try {
      await axiosInstance.delete(`/test-execution/test-runs/${runIdToDelete}`);
      showStatusToast("Test run deleted successfully", "success");
      loadRuns();
    } catch (err) {
      console.error("Error deleting run:", err);
      showStatusToast("Failed to delete test run", "error");
    } finally {
      setDeleteRunConfirmOpen(false);
      setRunIdToDelete(null);
    }
  };

  useEffect(() => {
    loadRuns();
  }, [cycleId, refreshKey]);

  if (!cycleId) return null;

  return (
    <>
    <ConfirmationModal
      isOpen={deleteRunConfirmOpen}
      title="Delete Test Run"
      message="Are you sure you want to delete this test run? This action cannot be undone."
      onConfirm={executeDeleteRun}
      onCancel={() => { setDeleteRunConfirmOpen(false); setRunIdToDelete(null); }}
      confirmText="Delete"
      variant="danger"
    />
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
    </>
  );
}