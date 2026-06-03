"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, FileText, Layers, AlertCircle, LayoutList } from "lucide-react";
import api from "../../../api/axiosInstance";
import CreateTestPlan from "./TestPlans/pages/CreateTestPlan";
import EditTestPlan from "./TestPlans/pages/EditTestPlan";
import { useParams } from "react-router-dom";
import { showStatusToast } from "../../../components/toastfy/toast";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Button from "../../../components/Button/Button";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";

import {jwtDecode} from "jwt-decode";

const token = localStorage.getItem("token");

let canCreateTestPlan = false;

if (token) {
  const decoded = jwtDecode(token);

  const roles = decoded?.roles || [];

  canCreateTestPlan =
    roles.includes("Tester") ||
    roles.includes("Project_Manager");
}
const priorityColors = {
  HIGH:   "bg-red-50 text-red-700 border-red-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW:    "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const statusColors = {
  DRAFT:     "bg-slate-100 text-slate-700 border-slate-200",
  ACTIVE:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function TestPlans() {
  const { projectId } = useParams();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editPlanId, setEditPlanId] = useState(null);
  const [storyTitles, setStoryTitles] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  const token = localStorage.getItem("token");

  const fetchPlans = async () => {
    try {
      const response = await api.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/plans/projects/${projectId}?t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache", Pragma: "no-cache" } },
      );
      const plansArray = Array.isArray(response.data) ? response.data : [response.data];
      setPlans(plansArray);
      if (plansArray.length > 0 && !selectedPlan) setSelectedPlan(plansArray[0].id);
    } catch (error) {
      console.error("Error fetching test plans:", error);
    }
  };

  useEffect(() => { fetchPlans(); }, [projectId, token]);

  const active = plans.find((p) => p.id === selectedPlan);

  const fetchScenarios = async (planId) => {
    if (!planId) return;
    setLoadingScenarios(true);
    try {
      const response = await api.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/scenarios/plans/${planId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setScenarios(response.data || []);
    } catch (error) {
      console.error("Failed to fetch scenarios:", error);
      setScenarios([]);
    } finally {
      setLoadingScenarios(false);
    }
  };

  useEffect(() => { if (selectedPlan) fetchScenarios(selectedPlan); }, [selectedPlan]);

  const fetchStoryTitle = async (storyId) => {
    if (!storyId || storyTitles[storyId]) return;
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/${storyId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setStoryTitles((prev) => ({ ...prev, [storyId]: res.data.title || "Untitled Story" }));
    } catch {
      setStoryTitles((prev) => ({ ...prev, [storyId]: "Unknown Story" }));
    }
  };

  useEffect(() => {
    scenarios.forEach((sc) => { if (sc.linkedStoryId) fetchStoryTitle(sc.linkedStoryId); });
  }, [scenarios]);

  const handleDelete = async (id) => {
    try {
      await api.delete(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/plans/${id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const updated = plans.filter((plan) => plan.id !== id);
      setPlans(updated);
      if (selectedPlan === id) setSelectedPlan(updated.length > 0 ? updated[0].id : null);
      showStatusToast("Test Plan deleted successfully!", "success");
    } catch {
      showStatusToast("Failed to delete the test plan", "error");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Test Plans</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage and organize your testing strategies and scenarios.
          </p>
        </div>
        {canCreateTestPlan && (
      <Button
        variant="primary"
        size="small"
        onClick={() => setOpenCreateModal(true)}
      >
        <Plus size={14} /> New Test Plan
      </Button>
    )}
      </div>

      {/* Split layout */}
      <div className="flex flex-1 min-h-0 gap-4 p-4">
        {/* Left: Plans list */}
        <div className="w-72 flex-shrink-0 flex flex-col min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full min-h-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
              <h2 className="font-semibold text-slate-900 text-sm">
                Plans ({plans.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <FileText size={28} className="mb-2 opacity-40" />
                  <p className="text-sm">No test plans yet</p>
                </div>
              ) : (
                plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`group w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-indigo-100 border-2 border-indigo-400"
                          : "hover:bg-slate-50 border border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className={`font-semibold text-sm truncate ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                            {plan.name}
                          </div>
                          {plan.objective && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                              {plan.objective}
                            </p>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 flex-shrink-0 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                          {canCreateTestPlan && (
                            <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditPlanId(plan.id); setOpenEditModal(true); }}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit Plan"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, id: plan.id }); }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Plan"
                          >
                            <Trash2 size={13} />
                          </button>
                          </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Plan detail */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full min-h-0 overflow-hidden">
            {!active ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <LayoutList size={40} className="mb-3 opacity-40" />
                <h3 className="text-sm font-medium text-slate-600">Select a Test Plan</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Choose a plan from the list to view its details.
                </p>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
                  <h2 className="font-semibold text-slate-900">{active.name}</h2>
                  {active.objective && (
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {active.objective}
                    </p>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                      <Layers size={16} className="text-indigo-500" />
                      Test Scenarios
                      <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs font-medium">
                        {scenarios.length}
                      </span>
                    </h3>
                  </div>

                  {loadingScenarios ? (
                    <LoadingSpinner size="md" text="Loading scenarios..." />
                  ) : scenarios.length === 0 ? (
                    <div className="text-center py-10 border border-slate-100 rounded-xl bg-slate-50">
                      <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">No scenarios mapped yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {scenarios.map((sc) => (
                        <div
                          key={sc.id}
                          className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white flex flex-col"
                        >
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <h4 className="font-semibold text-slate-900 text-sm leading-tight">
                              {sc.title}
                            </h4>
                            <span className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide border rounded shrink-0 ${priorityColors[sc.priority] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {sc.priority}
                            </span>
                          </div>

                          {sc.linkedStoryId && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-3 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                              <FileText size={13} className="text-slate-400 flex-shrink-0" />
                              <span className="font-medium text-slate-700">Story:</span>
                              {storyTitles[sc.linkedStoryId] || "Loading..."}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                            <span className={`px-2 py-0.5 text-xs font-medium border rounded flex items-center gap-1 ${statusColors[sc.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                              {sc.status}
                            </span>
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {sc.caseCount} {sc.caseCount === 1 ? "Case" : "Cases"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {openCreateModal && (
        <CreateTestPlan
          projectId={projectId}
          mode="modal"
          onClose={() => setOpenCreateModal(false)}
          onSuccess={() => { setOpenCreateModal(false); fetchPlans(); }}
        />
      )}

      {openEditModal && editPlanId && (
        <EditTestPlan
          projectId={projectId}
          planId={editPlanId}
          mode="modal"
          onClose={() => setOpenEditModal(false)}
          onSuccess={() => { setOpenEditModal(false); fetchPlans(); }}
        />
      )}

      <ConfirmationModal
        isOpen={deleteConfirm.open}
        title="Delete Test Plan"
        message="Are you sure you want to delete this test plan? This action cannot be undone."
        onConfirm={() => { handleDelete(deleteConfirm.id); setDeleteConfirm({ open: false, id: null }); }}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
