// src/pages/CycleRunsPage.jsx
import { useParams, useNavigate } from "react-router-dom";
import RunListForCycle from "./RunListForCycle";
import AddCasesModal from "./AddCasesModal";
import CreateTestRunForm from "./CreateRun";
import axiosInstance from "../api/axiosInstance";
import { useState, useEffect } from "react";   // ✅ UPDATED
import { toast } from "react-toastify";

export default function CycleRunsPage() {
  const { projectId, cycleId } = useParams();
  const navigate = useNavigate();

  const [showRunModal, setShowRunModal] = useState(false);
  const [showAddCasesModal, setShowAddCasesModal] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [availableCases, setAvailableCases] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ NEW STATE
  const [cycleName, setCycleName] = useState("");

  // ✅ NEW API CALL
  useEffect(() => {
    const fetchCycle = async () => {
      try {
        const res = await axiosInstance.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-execution/test-cycles/${cycleId}`
        );
        setCycleName(res.data?.name || "");
      } catch (err) {
        console.error("Failed to fetch cycle", err);
      }
    };

    if (cycleId) fetchCycle();
  }, [cycleId]);

  const openAddCasesModal = async (runId) => {
    setSelectedRunId(runId);

    try {
      const res = await axiosInstance.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-cases/getcases/${projectId}`,
      );
      setAvailableCases(res.data || []);
      setShowAddCasesModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load test cases");
    }
  };

  const handleAddCasesSubmit = async (ids) => {
    try {
      await axiosInstance.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-execution/test-runs/${selectedRunId}/add-cases`,
        { testCaseIds: ids },
      );
      toast.success("Test cases added!");
      setShowAddCasesModal(false);
      setRefreshKey((x) => x + 1);
    } catch {
      toast.error("Failed to add test cases");
    }
  };

  return (
    <div className="p-6">
      {/* Back button */}
      <button
        className="mb-4 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        onClick={() => navigate(-1)}
      >
        ← Back to Cycles
      </button>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">
          Test Runs for Cycle {cycleName ? `- ${cycleName}` : ""}
        </h1>

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowRunModal(true)}
        >
          + Create Run
        </button>
      </div>

      <RunListForCycle
        cycleId={cycleId}
        onAddCases={openAddCasesModal}
        refreshKey={refreshKey}
      />

      {/* Add Cases Modal */}
      <AddCasesModal
        show={showAddCasesModal}
        availableCases={availableCases}
        onSubmit={handleAddCasesSubmit}
        onClose={() => setShowAddCasesModal(false)}
      />

      {/* Create Run Modal */}
      {showRunModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-[600px] shadow-xl relative">
            <h2 className="text-lg font-semibold mb-4">Create Test Run</h2>

            <CreateTestRunForm
              projectId={projectId}
              cycleId={cycleId}
              cycleName={cycleName}   // ✅ NEW PROP
              onSuccess={() => {
                setShowRunModal(false);
                setRefreshKey((x) => x + 1);
              }}
              onClose={() => setShowRunModal(false)}
            />

            <button
              className="absolute top-3 right-4 text-gray-400 hover:text-black"
              onClick={() => setShowRunModal(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}