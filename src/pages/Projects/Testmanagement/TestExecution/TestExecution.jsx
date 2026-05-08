import React, { useEffect, useState, useRef } from "react";
import axiosInstance from "../api/axiosInstance";
import CreateTestCycleForm from "./CreateCycle";
import CreateTestRunForm from "./CreateRun";
import RunListForCycle from "./RunListForCycle";
import { useParams } from "react-router-dom";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import StatusBadge from "../../../../components/status/statusbadge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import SearchInput from "../../../../components/filter/Searchbar";
import Button from "../../../../components/Button/Button";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";

export default function TestExecution() {
  const { projectId } = useParams();

  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [search, setSearch] = useState("");
  const [showCyclesView, setShowCyclesView] = useState(true);
  const [loadingCycles, setLoadingCycles] = useState(false);

  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCycle, setEditingCycle] = useState(null);

  const [selectedRunId, setSelectedRunId] = useState(null);
  const [runsRefreshKey, setRunsRefreshKey] = useState(0);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [cycleName, setCycleName] = useState("");
  const [deleteCycleConfirmOpen, setDeleteCycleConfirmOpen] = useState(false);
  const [cycleIdToDelete, setCycleIdToDelete] = useState(null);

  useEffect(() => {
    const selectedCycle = cycles.find(c => c.id === selectedCycleId);
    setCycleName(selectedCycle?.name || "");
  }, [selectedCycleId, cycles]);

  const dropdownRef = useRef(null);
const executeDeleteCycle = async (cycleId) => {
    try {
      // Make sure this URL matches your backend endpoint for deleting a cycle
      await axiosInstance.delete(`/test-execution/test-cycles/${cycleId}`);
      
      showStatusToast("Cycle deleted successfully!", "success");
      loadCycles(); // Refresh the list so the deleted cycle disappears
    } catch (err) {
      console.error("Failed to delete cycle:", err);
      showStatusToast("Failed to delete cycle.", "error");
    }
  };
  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Util ──────────────────────────────────────────────────────────────────
  const formatDate = (date) => {
    if (!date) return "No Date";
    const d = new Date(date);
    if (isNaN(d)) return "No Date";
    return (
      String(d.getDate()).padStart(2, "0") +
      "/" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "/" +
      d.getFullYear()
    );
  };

  // ── Load Cycles ───────────────────────────────────────────────────────────
  const loadCycles = async () => {
    setLoadingCycles(true);
    try {
      const res = await axiosInstance.get(
        `/test-execution/test-cycles/projects/${projectId}`
      );
      setCycles(res.data || []);
      if (!selectedCycleId && res.data?.length) {
        setSelectedCycleId(res.data[0].id);
      }
    } catch (err) {
      console.error("Error loading cycles:", err);
      showStatusToast("Failed to load cycles", "error");
    } finally {
      setLoadingCycles(false);
    }
  };

  useEffect(() => {
    loadCycles();
  }, [projectId]);

  const filteredCycles = cycles.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.status || "").toLowerCase().includes(term)
    );
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteCycle = (cycleId) => {
    setCycleIdToDelete(cycleId);
    setDeleteCycleConfirmOpen(true);
  };
  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEditClick = (e, cycle) => {
    e.stopPropagation();
    setEditingCycle(cycle);
    setShowEditModal(true);
    setOpenDropdownId(null);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingCycle(null);
    loadCycles();
    showStatusToast("Cycle updated successfully", "success");
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCycleCreated = () => {
    setShowCycleModal(false);
    loadCycles();
  };

  const handleRunCreated = () => {
    setShowRunModal(false);
    setRunsRefreshKey((k) => k + 1);
  };

  if (loadingCycles) return <LoadingSpinner text="Loading cycles..." />;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Test Execution</h1>

        {showCyclesView ? (
          <div className="flex items-center gap-4">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cycles by name or status..."
              className="w-64"
            />
            <Button variant="primary" onClick={() => setShowCycleModal(true)}>
              + Create Cycle
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => setShowCyclesView(true)}>
              ← Back to Cycles
            </Button>
            <Button variant="primary" onClick={() => setShowRunModal(true)}>
              + Create Run
            </Button>
          </div>
        )}
      </div>

      {/* CYCLE CARDS */}
      {showCyclesView ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredCycles.length === 0 && (
            <p className="text-gray-400 col-span-2 text-center mt-10">
              No cycles found.
            </p>
          )}

          {filteredCycles.map((cycle) => (
            <div
              key={cycle.id}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between min-h-[140px]"
              onClick={() => {
                setSelectedCycleId(cycle.id);
                setShowCyclesView(false);
              }}
            >
              {/* ROW 1 — name + 3 dots */}
              <div className="flex justify-between items-start">
                <h2 className="font-semibold text-base text-gray-800 pr-4">
                  {cycle.name}
                </h2>

                {/* 3 DOTS DROPDOWN */}
                <div
                  className="relative flex-shrink-0"
                  ref={openDropdownId === cycle.id ? dropdownRef : null}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(
                        openDropdownId === cycle.id ? null : cycle.id
                      );
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>

                  {openDropdownId === cycle.id && (
                    <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                      <button
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
                        onClick={(e) => handleEditClick(e, cycle)}
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                      <button
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleDeleteCycle(cycle.id);
                        }}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ROW 2 — date */}
              <p className="text-sm text-gray-400 mt-1">
                {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
              </p>

              {/* ROW 3 — status + create run */}
              <div className="flex justify-between items-center mt-6">
                <StatusBadge label={cycle.status} />
                <Button
                  variant="primary"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCycleId(cycle.id);
                    setShowRunModal(true);
                  }}
                >
                  + Create Run
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <RunListForCycle
          projectId={projectId}
          cycleId={selectedCycleId}
          onAddCases={(runId) => setSelectedRunId(runId)}
          refreshKey={runsRefreshKey}
        />
      )}

      {/* DELETE CYCLE CONFIRMATION */}
      <ConfirmationModal
        isOpen={deleteCycleConfirmOpen}
        title="Delete Cycle"
        message="Are you sure you want to delete this cycle? All test runs inside it will also be deleted."
        onConfirm={() => { executeDeleteCycle(cycleIdToDelete); setDeleteCycleConfirmOpen(false); setCycleIdToDelete(null); }}
        onCancel={() => { setDeleteCycleConfirmOpen(false); setCycleIdToDelete(null); }}
        confirmText="Delete"
        variant="danger"
      />

      {/* CREATE CYCLE MODAL */}
      {showCycleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <CreateTestCycleForm
            projectId={projectId}
            onSuccess={handleCycleCreated}
            onClose={() => setShowCycleModal(false)}
          />
        </div>
      )}

      {/* EDIT CYCLE MODAL */}
      {showEditModal && editingCycle && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <CreateTestCycleForm
            projectId={projectId}
            onSuccess={handleEditSuccess}
            onClose={() => {
              setShowEditModal(false);
              setEditingCycle(null);
            }}
            editingCycle={editingCycle}
          />
        </div>
      )}

      {/* CREATE RUN MODAL */}
      {showRunModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <CreateTestRunForm
            projectId={projectId}
            cycleId={selectedCycleId}
            cycleName={cycleName}
            onSuccess={handleRunCreated}
            onClose={() => setShowRunModal(false)}
          />
        </div>
      )}
    </div>
  );
}