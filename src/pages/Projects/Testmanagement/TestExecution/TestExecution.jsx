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
    const selectedCycle = cycles.find((c) => c.id === selectedCycleId);
    setCycleName(selectedCycle?.name || "");
  }, [selectedCycleId, cycles]);

  const dropdownRef = useRef(null);

  const executeDeleteCycle = async (cycleId) => {
    try {
      await axiosInstance.delete(`api/test-execution/test-cycles/${cycleId}`);
      showStatusToast("Cycle deleted successfully!", "success");
      loadCycles();
    } catch (err) {
      console.error("Failed to delete cycle:", err);
      showStatusToast("Failed to delete cycle.", "error");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const loadCycles = async () => {
    setLoadingCycles(true);
    try {
      const res = await axiosInstance.get(
        `api/test-execution/test-cycles/projects/${projectId}`,
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

  useEffect(() => { loadCycles(); }, [projectId]);

  const filteredCycles = cycles.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.status || "").toLowerCase().includes(term)
    );
  });

  const handleDeleteCycle = (cycleId) => {
    setCycleIdToDelete(cycleId);
    setDeleteCycleConfirmOpen(true);
  };

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

  const handleCycleCreated = () => {
    setShowCycleModal(false);
    loadCycles();
  };

  const handleRunCreated = () => {
    setShowRunModal(false);
    setRunsRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Test Execution</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage test cycles and execution runs.</p>
        </div>
        {showCyclesView ? (
          <div className="flex items-center gap-3">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cycles..."
              className="w-56"
            />
            <Button variant="primary" size="small" onClick={() => setShowCycleModal(true)}>
              + Create Cycle
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="small" onClick={() => setShowCyclesView(true)}>
              ← Back to Cycles
            </Button>
            <Button variant="primary" size="small" onClick={() => setShowRunModal(true)}>
              + Create Run
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {loadingCycles ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner text="Loading cycles..." />
          </div>
        ) : showCyclesView ? (
          filteredCycles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <p className="text-sm">No cycles found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between min-h-[140px]"
                  onClick={() => {
                    setSelectedCycleId(cycle.id);
                    setShowCyclesView(false);
                  }}
                >
                  {/* Name + 3-dot menu */}
                  <div className="flex justify-between items-start">
                    <h2 className="font-semibold text-sm text-slate-800 pr-3 leading-snug">
                      {cycle.name}
                    </h2>
                    <div
                      className="relative flex-shrink-0"
                      ref={openDropdownId === cycle.id ? dropdownRef : null}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full p-1 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === cycle.id ? null : cycle.id);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openDropdownId === cycle.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            onClick={(e) => handleEditClick(e, cycle)}
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(null);
                              handleDeleteCycle(cycle.id);
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date range */}
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
                  </p>

                  {/* Status + Create Run */}
                  <div className="flex justify-between items-center mt-4">
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
          )
        ) : (
          <RunListForCycle
            projectId={projectId}
            cycleId={selectedCycleId}
            onAddCases={(runId) => setSelectedRunId(runId)}
            refreshKey={runsRefreshKey}
          />
        )}
      </div>

      {/* Delete Cycle Confirmation */}
      <ConfirmationModal
        isOpen={deleteCycleConfirmOpen}
        title="Delete Cycle"
        message="Are you sure you want to delete this cycle? All test runs inside it will also be deleted."
        onConfirm={() => {
          executeDeleteCycle(cycleIdToDelete);
          setDeleteCycleConfirmOpen(false);
          setCycleIdToDelete(null);
        }}
        onCancel={() => {
          setDeleteCycleConfirmOpen(false);
          setCycleIdToDelete(null);
        }}
        confirmText="Delete"
        variant="danger"
      />

      {/* Create Cycle Modal */}
      {showCycleModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <CreateTestCycleForm
            projectId={projectId}
            onSuccess={handleCycleCreated}
            onClose={() => setShowCycleModal(false)}
          />
        </div>
      )}

      {/* Edit Cycle Modal */}
      {showEditModal && editingCycle && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <CreateTestCycleForm
            projectId={projectId}
            onSuccess={handleEditSuccess}
            onClose={() => { setShowEditModal(false); setEditingCycle(null); }}
            editingCycle={editingCycle}
          />
        </div>
      )}

      {/* Create Run Modal */}
      {showRunModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
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
