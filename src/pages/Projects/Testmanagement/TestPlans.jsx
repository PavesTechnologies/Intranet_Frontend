"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  Layers,
  AlertCircle,
  LayoutList,
} from "lucide-react";
import axios from "axios";
import CreateTestPlan from "./TestPlans/pages/CreateTestPlan";
import EditTestPlan from "./TestPlans/pages/EditTestPlan";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

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

  const token = localStorage.getItem("token");

  // ------------------------------------------
  // FETCH PLANS
  // ------------------------------------------
  const fetchPlans = async () => {
    try {
      const response = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/plans/projects/${projectId}?t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );

      const plansArray = Array.isArray(response.data)
        ? response.data
        : [response.data];

      setPlans(plansArray);

      if (plansArray.length > 0 && !selectedPlan) {
        setSelectedPlan(plansArray[0].id);
      }
    } catch (error) {
      console.error("Error fetching test plans:", error);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [projectId, token]);

  const active = plans.find((p) => p.id === selectedPlan);

  // ------------------------------------------
  // FETCH SCENARIOS FOR SELECTED PLAN
  // ------------------------------------------
  const fetchScenarios = async (planId) => {
    if (!planId) return;
    setLoadingScenarios(true);
    try {
      const response = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/scenarios/plans/${planId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setScenarios(response.data || []);
    } catch (error) {
      console.error("Failed to fetch scenarios:", error);
      setScenarios([]);
    } finally {
      setLoadingScenarios(false);
    }
  };

  useEffect(() => {
    if (selectedPlan) fetchScenarios(selectedPlan);
  }, [selectedPlan]);

  // ------------------------------------------
  // FETCH STORY TITLE FOR LINKED STORY
  // ------------------------------------------
  const fetchStoryTitle = async (storyId) => {
    if (!storyId || storyTitles[storyId]) return;

    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/${storyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setStoryTitles((prev) => ({
        ...prev,
        [storyId]: res.data.title || "Untitled Story",
      }));
    } catch (error) {
      setStoryTitles((prev) => ({
        ...prev,
        [storyId]: "Unknown Story",
      }));
    }
  };

  useEffect(() => {
    scenarios.forEach((sc) => {
      if (sc.linkedStoryId) fetchStoryTitle(sc.linkedStoryId);
    });
  }, [scenarios]);

  // ------------------------------------------
  // DELETE CONFIRM TOAST
  // ------------------------------------------
  const showConfirmToast = (message, onConfirm) => {
    toast(
      ({ closeToast }) => (
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 mb-2">Confirm Delete</h3>
          <p className="text-sm text-gray-600">{message}</p>
          <div className="flex justify-end gap-3 mt-4">
            <button
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              onClick={() => closeToast()}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              onClick={() => {
                closeToast();
                onConfirm();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        toastId: "confirm-delete",
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
        className:
          "bg-white shadow-xl rounded-xl border border-gray-100 max-w-sm w-full mx-auto p-0",
      },
    );
  };

  const handleDelete = (id) => {
    showConfirmToast(
      "Are you sure you want to delete this test plan? This action cannot be undone.",
      async () => {
        try {
          await axios.delete(
            `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/plans/${id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const updated = plans.filter((plan) => plan.id !== id);
          setPlans(updated);
          if (selectedPlan === id && updated.length > 0) {
            setSelectedPlan(updated[0].id);
          } else if (updated.length === 0) {
            setSelectedPlan(null);
          }
          toast.success("Test Plan deleted successfully!");
        } catch (error) {
          toast.error("Failed to delete the test plan");
        }
      },
    );
  };

  // ------------------------------------------
  // BADGE COLORS
  // ------------------------------------------
  const priorityColors = {
    HIGH: "bg-red-50 text-red-700 border-red-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const statusColors = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    ACTIVE: "bg-indigo-50 text-indigo-700 border-indigo-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  // ------------------------------------------
  // RENDER UI
  // ------------------------------------------
  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen text-slate-800 flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Test Plans
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage and organize your testing strategies and scenarios.
          </p>
        </div>
        <button
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg gap-2 transition-all shadow-sm"
          onClick={() => setOpenCreateModal(true)}
        >
          <Plus size={18} /> New Test Plan
        </button>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT COLUMN: TEST PLANS LIST */}
        <div className="w-full lg:w-1/3 flex flex-col gap-3">
          {plans.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
              <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-medium text-slate-900">
                No test plans
              </h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                Get started by creating a new test plan.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`group relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/50 border-indigo-300 shadow-sm ring-1 ring-indigo-300"
                        : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <h3
                        className={`font-semibold truncate ${isSelected ? "text-indigo-900" : "text-slate-800"}`}
                      >
                        {plan.name}
                      </h3>

                      {/* Actions (Visible on hover or if selected) */}
                      <div
                        className={`flex items-center gap-1 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditPlanId(plan.id);
                            setOpenEditModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Edit Plan"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(plan.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Plan"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {plan.objective && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2 pr-8">
                        {plan.objective}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PLAN DETAILS & SCENARIOS */}
        <div className="w-full lg:w-2/3">
          {!active ? (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <LayoutList className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">
                Select a Test Plan
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Choose a test plan from the list to view its scenarios and
                details.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
              {/* Plan Detail Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">
                  {active.name}
                </h2>
                {active.objective && (
                  <p className="text-slate-600 mt-3 whitespace-pre-wrap leading-relaxed">
                    {active.objective}
                  </p>
                )}
              </div>

              {/* Scenarios Section */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                    <Layers size={20} className="text-indigo-500" />
                    Test Scenarios
                    <span className="bg-slate-100 text-slate-600 py-0.5 px-2.5 rounded-full text-xs font-medium ml-2">
                      {scenarios.length}
                    </span>
                  </h3>
                  {/* Future spot for "Add Scenario" button if needed */}
                </div>

                {loadingScenarios ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-sm">Loading scenarios...</p>
                  </div>
                ) : scenarios.length === 0 ? (
                  <div className="text-center py-12 border border-slate-100 rounded-xl bg-slate-50">
                    <AlertCircle className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-600">
                      No scenarios mapped yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {scenarios.map((sc) => (
                      <div
                        key={sc.id}
                        className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-3 mb-3">
                            <h4 className="font-semibold text-slate-900 leading-tight">
                              {sc.title}
                            </h4>
                            <span
                              className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border rounded-md shrink-0 ${
                                priorityColors[sc.priority] ||
                                "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {sc.priority}
                            </span>
                          </div>

                          {sc.linkedStoryId && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <FileText size={14} className="text-slate-400" />
                              <span className="font-medium text-slate-700">
                                Story:
                              </span>{" "}
                              {storyTitles[sc.linkedStoryId] || "Loading..."}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                          <span
                            className={`px-2.5 py-1 text-xs font-medium border rounded-md flex items-center gap-1 ${
                              statusColors[sc.status] ||
                              "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75"></span>
                            {sc.status}
                          </span>

                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                            {sc.caseCount}{" "}
                            {sc.caseCount === 1 ? "Case" : "Cases"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {openCreateModal && (
        <CreateTestPlan
          projectId={projectId}
          mode="modal"
          onClose={() => setOpenCreateModal(false)}
          onSuccess={() => {
            setOpenCreateModal(false);
            fetchPlans();
          }}
        />
      )}

      {/* EDIT MODAL */}
      {openEditModal && editPlanId && (
        <EditTestPlan
          projectId={projectId}
          planId={editPlanId}
          mode="modal"
          onClose={() => setOpenEditModal(false)}
          onSuccess={() => {
            setOpenEditModal(false);
            fetchPlans();
          }}
        />
      )}
    </div>
  );
}
