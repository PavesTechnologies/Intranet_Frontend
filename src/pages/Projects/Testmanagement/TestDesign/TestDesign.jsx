import React, { useEffect, useState } from "react";
import {
  Plus,
  Folder,
  ChevronRight,
  Layers,
  BookOpen,
  AlertCircle,
  Edit,
  Trash2,
} from "lucide-react";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import axiosInstance from "../api/axiosInstance";
import { useParams } from "react-router-dom";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import ScenarioPanel from "./panels/ScenarioPanel";
import AddScenarioModal from "./modals/AddScenarioModal";
import AddCaseModal from "./modals/AddCaseModal";
import AddStepsModal from "./modals/AddStepsModal";
import AddTestStoryModal from "./modals/AddTestStoriesModal";
import {jwtDecode} from "jwt-decode";

export default function TestDesign() {
  const { projectId } = useParams();

  const [testStories, setTestStories] = useState([]);
  const [expandedStories, setExpandedStories] = useState({});

  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);

  const [openStoryModal, setOpenStoryModal] = useState(false);
  const [openScenarioModal, setOpenScenarioModal] = useState(false);
  const [openCaseModal, setOpenCaseModal] = useState(false);
  const [openStepsModal, setOpenStepsModal] = useState(false);
  const [scenarioStory, setScenarioStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingStory, setEditingStory] = useState(null);
  const [editingScenario, setEditingScenario] = useState(null); // <-- ADD THIS
  const [editingCase, setEditingCase] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, title: "", message: "", onConfirm: null });

  // const [loading, setLoading] = useState(true);
  // const [editingStory, setEditingStory] = useState(null);
  // ---------------------------------------------------------
  // FETCH TEST STORIES
  // ---------------------------------------------------------
  
  
  const token = localStorage.getItem("token");
  
  let canCreateTest = false;
  
  if (token) {
    const decoded = jwtDecode(token);
  
    const roles = decoded?.roles || [];
  
    canCreateTest =
      roles.includes("Tester") ||
      roles.includes("Project_Manager");
  }
  const fetchTestStories = async () => {
    try {
      const res = await axiosInstance.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-stories/projects/${projectId}`,
      );
      return (res.data || []).map((s) => ({
        ...s,
        scenarios: [],
      }));
    } catch (err) {
      console.error("❌ Error fetching stories", err);
      return [];
    }
  };
  // ---------------------------------------------------------
  // DELETE STORY
  // ---------------------------------------------------------
  const executeDeleteStory = async (storyId) => {
    try {
      await axiosInstance.delete(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-stories/project-test-data/${storyId}`,
      );
      showStatusToast("Test story deleted successfully!", "success");
      setTestStories((prev) => prev.filter((s) => s.id !== storyId));
      // Clear selections if the deleted story was active
      if (selectedStory?.id === storyId) {
        setSelectedStory(null);
        setSelectedScenario(null);
        setSelectedCase(null);
      }
    } catch (err) {
      console.error("❌ Error deleting story", err);
      showStatusToast("Failed to delete test story.", "error");
    }
  };

  const handleDeleteStory = (e, storyId) => {
    e.stopPropagation();
    setDeleteConfirm({
      open: true,
      title: "Delete Test Story",
      message: "Are you sure you want to delete this test story?",
      onConfirm: () => executeDeleteStory(storyId),
    });
  };

  // ---------------------------------------------------------
  // DELETE CASE
  // ---------------------------------------------------------
  const executeDeleteCase = async (caseId, storyId) => {
    try {
      await axiosInstance.delete(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-cases/${caseId}`,
      );
      showStatusToast("Test case deleted successfully!", "success");
      await loadStoryContents(storyId);
      if (selectedCase?.id === caseId) {
        setSelectedCase(null);
      }
    } catch (err) {
      console.error("❌ Error deleting case", err);
      showStatusToast("Failed to delete test case.", "error");
    }
  };

  const handleDeleteCase = (caseId, scenarioId, storyId) => {
    setDeleteConfirm({
      open: true,
      title: "Delete Test Case",
      message: "Are you sure you want to delete this test case?",
      onConfirm: () => executeDeleteCase(caseId, storyId),
    });
  };
  // ---------------------------------------------------------
  // FETCH SCENARIOS by STORY ID
  // ---------------------------------------------------------
  const fetchScenarios = async (storyId) => {
    try {
      const res = await axiosInstance.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/scenarios/test-stories/${storyId}`,
      );
      return (res.data || []).map((sc) => ({
        ...sc,
        cases: [],
      }));
    } catch (err) {
      console.error("❌ Error fetching scenarios", err);
      return [];
    }
  };

  // ---------------------------------------------------------
  // FETCH CASES
  // ---------------------------------------------------------
  const fetchCases = async (scenarioId) => {
    try {
      const res = await axiosInstance.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-cases/scenarios/${scenarioId}`,
      );
      return res.data || [];
    } catch (err) {
      console.error("❌ Error fetching cases", err);
      return [];
    }
  };

  // ---------------------------------------------------------
  // DELETE SCENARIO
  // ---------------------------------------------------------
  const executeDeleteScenario = async (scenarioId, storyId) => {
    try {
      await axiosInstance.delete(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/scenarios/${scenarioId}`,
      );
      showStatusToast("Scenario deleted successfully!", "success");
      await loadStoryContents(storyId);
      if (selectedScenario?.id === scenarioId) {
        setSelectedScenario(null);
        setSelectedCase(null);
      }
    } catch (err) {
      console.error("❌ Error deleting scenario", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to delete scenario.";
      showStatusToast(errorMessage, "error");
    }
  };

  const handleDeleteScenario = (e, scenarioId, storyId) => {
    e.stopPropagation();
    setDeleteConfirm({
      open: true,
      title: "Delete Scenario",
      message: "Are you sure you want to delete this test scenario?",
      onConfirm: () => executeDeleteScenario(scenarioId, storyId),
    });
  };

  // ---------------------------------------------------------
  // FETCH STEPS
  // ---------------------------------------------------------
  const fetchSteps = async (caseId) => {
    try {
      const res = await axiosInstance.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-cases/${caseId}`,
      );
      return res.data.steps || [];
    } catch (err) {
      console.error("❌ Error fetching steps", err);
      return [];
    }
  };

  // ---------------------------------------------------------
  // CORE LOGIC: SILENT BACKGROUND UPDATE
  // ---------------------------------------------------------
  // Fetches scenarios, cases, and steps for a specific story silently
  const loadStoryContents = async (storyId) => {
    const scenarios = await fetchScenarios(storyId);

    for (const scenario of scenarios) {
      const cases = await fetchCases(scenario.id);
      scenario.cases = [];

      for (const tc of cases) {
        const steps = await fetchSteps(tc.id);
        scenario.cases.push({ ...tc, steps });
      }
    }

    setTestStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, scenarios } : s)),
    );

    return scenarios;
  };

  // ---------------------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------------------
  const loadAll = async () => {
    setLoading(true); // Only trigger the big loader on initial mount!
    const stories = await fetchTestStories();
    setTestStories(stories);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [projectId]);

  // ---------------------------------------------------------
  // EXPAND / COLLAPSE STORY
  // ---------------------------------------------------------
  // ---------------------------------------------------------
  // EXPAND / COLLAPSE STORY
  // ---------------------------------------------------------
  const toggleStoryExpand = async (story) => {
    const isExpanded = expandedStories[story.id];

    if (isExpanded) {
      setExpandedStories((p) => ({ ...p, [story.id]: false }));
      return;
    }

    // ✅ FIX: Expand the UI instantly on click
    setExpandedStories((p) => ({ ...p, [story.id]: true }));

    // ✅ THEN fetch the nested scenarios, cases, and steps in the background
    await loadStoryContents(story.id);
  };

  // ---------------------------------------------------------
  // CALLBACKS (SILENT REFRESHES)
  // ---------------------------------------------------------

  const handleStoryCreated = async () => {
    const stories = await fetchTestStories();
    // Merge new stories while keeping the expanded scenarios of existing ones
    setTestStories((prev) =>
      stories.map((s) => {
        const existing = prev.find((p) => p.id === s.id);
        return existing ? { ...s, scenarios: existing.scenarios } : s;
      }),
    );
    setOpenStoryModal(false);
  };

  const handleScenarioCreated = async () => {
    if (scenarioStory) {
      await loadStoryContents(scenarioStory.id);
      setExpandedStories((p) => ({ ...p, [scenarioStory.id]: true })); // Auto-expand
    }
    setOpenScenarioModal(false);
    setScenarioStory(null);
  };

  const handleCaseCreated = async () => {
    // Find which story this scenario belongs to
    const story = testStories.find((s) =>
      s.scenarios?.some((sc) => sc.id === selectedScenario?.id),
    );

    if (story) {
      const updatedScenarios = await loadStoryContents(story.id);

      // Keep the current scenario and case seamlessly selected
      const updatedScenario = updatedScenarios.find(
        (sc) => sc.id === selectedScenario.id,
      );
      if (updatedScenario) {
        setSelectedScenario(updatedScenario);
        if (!selectedCase) {
          setSelectedCase(updatedScenario.cases[0] || null);
        } else {
          const updatedCase = updatedScenario.cases.find(
            (c) => c.id === selectedCase.id,
          );
          setSelectedCase(updatedCase || updatedScenario.cases[0] || null);
        }
      }
    }
    setOpenCaseModal(false);
  };

  const handleStepsCreated = async () => {
    const story = testStories.find((s) =>
      s.scenarios?.some((sc) => sc.id === selectedScenario?.id),
    );

    if (story) {
      const updatedScenarios = await loadStoryContents(story.id);
      const updatedScenario = updatedScenarios.find(
        (sc) => sc.id === selectedScenario.id,
      );
      if (updatedScenario) {
        setSelectedScenario(updatedScenario);
        if (selectedCase) {
          const updatedCase = updatedScenario.cases.find(
            (c) => c.id === selectedCase.id,
          );
          setSelectedCase(updatedCase || null);
        }
      }
    }
    setOpenStepsModal(false);
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner text="Loading Test Design Environment..." size="lg" />
      </div>
    );
  }

  return (
    <>
    <ConfirmationModal
      isOpen={deleteConfirm.open}
      title={deleteConfirm.title}
      message={deleteConfirm.message}
      onConfirm={() => { deleteConfirm.onConfirm?.(); setDeleteConfirm({ open: false, title: "", message: "", onConfirm: null }); }}
      onCancel={() => setDeleteConfirm({ open: false, title: "", message: "", onConfirm: null })}
      confirmText="Delete"
      variant="danger"
    />
    <div className="flex h-full min-h-0 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      {/* LEFT SIDEBAR — EXPLORER */}
      <aside className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-slate-800 tracking-tight">
              Test Stories
            </h3>
          </div>
          {canCreateTest && (
          <button
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            onClick={() => {
              setEditingStory(null);
              setOpenStoryModal(true);
            }}
            title="Add Test Story"
          >
            <Plus size={18} />
          </button>
          )}
        </div>

        {/* STORY LIST */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {testStories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
              <AlertCircle className="h-6 w-6 mb-2 opacity-50" />
              <span>No test stories found.</span>
            </div>
          ) : (
            testStories.map((story) => {
              const isExpanded = expandedStories[story.id];

              return (
                <div key={story.id} className="select-none">
                  {/* Story Row */}
                  <div className="group flex items-center justify-between px-2 py-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors text-slate-700">
                    <div
                      className="flex items-center gap-2 flex-1 overflow-hidden"
                      onClick={() => {
                        setSelectedStory(story);
                        toggleStoryExpand(story);
                      }}
                    >
                      <ChevronRight
                        size={16}
                        className={`text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                      />
                      <Folder
                        size={16}
                        className={isExpanded ? "text-indigo-500" : "text-slate-400"}
                      />
                      <span className="text-sm font-medium truncate">
                        {story.name}
                      </span>
                    </div>

                    {/* Action Buttons (Visible on hover) */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      {canCreateTest && (
                       <>
                      <button
                        className="p-1 hover:bg-indigo-100 hover:text-indigo-600 rounded text-slate-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStory(story);
                          setOpenStoryModal(true);
                        }}
                        title="Edit Story"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-slate-400 transition-colors"
                        onClick={(e) => handleDeleteStory(e, story.id)}
                        title="Delete Story"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingScenario(null);
                          setScenarioStory(story);
                          setOpenScenarioModal(true);
                        }}
                        title="Add Scenario"
                      >
                        <Plus size={14} />
                      </button>
                      </>
                      )}
                    </div>
                  </div>

                  {/* Expandable Scenario List */}
                  {isExpanded && (
                    <div className="ml-5 mt-1 border-l border-slate-200 pl-2 space-y-0.5 pb-2">
                      {story.scenarios.length === 0 ? (
                        <div className="px-4 py-2 text-xs text-slate-400 italic">
                          No scenarios inside
                        </div>
                      ) : (
                        story.scenarios.map((scenario) => {
                          const isSelected = selectedScenario?.id === scenario.id;

                          return (
                            <div
                              key={scenario.id}
                              className={`group flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-indigo-50 text-indigo-700 font-medium"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                              onClick={() => {
                                setSelectedScenario(scenario);
                                setSelectedCase(scenario.cases[0] || null);
                              }}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Layers
                                  size={14}
                                  className={isSelected ? "text-indigo-500" : "text-slate-400"}
                                />
                                <span className="text-sm truncate">
                                  {scenario.title}
                                </span>
                              </div>

                              {/* Action Buttons (Visible on hover) */}
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity ml-2 shrink-0">
                                {canCreateTest && (
                                  <>
                                <button
                                  className="p-1 hover:bg-indigo-200 hover:text-indigo-800 rounded text-slate-400 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingScenario(scenario);
                                    setScenarioStory(story);
                                    setOpenScenarioModal(true);
                                  }}
                                  title="Edit Scenario"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  className="p-1 hover:bg-red-200 hover:text-red-800 rounded text-slate-400 transition-colors"
                                  onClick={(e) => handleDeleteScenario(e, scenario.id, story.id)}
                                  title="Delete Scenario"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <button
                                  className="p-1 hover:bg-emerald-200 hover:text-emerald-800 rounded text-slate-400 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCase(null);
                                    setSelectedScenario(scenario);
                                    setOpenCaseModal(true);
                                  }}
                                  title="Add Test Case"
                                >
                                  <Plus size={12} />
                                </button>
                                </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* MAIN CONTENT PANEL */}
      <main className="flex-1 overflow-auto bg-white border-l border-slate-100">
        <ScenarioPanel
          selectedTestStory={selectedStory}
          selectedScenario={selectedScenario}
          selectedCase={selectedCase}
          onSelectScenario={(sc) => {
            setSelectedScenario(sc);
            setSelectedCase(sc.cases[0] || null);
          }}
          onSelectCase={(tc) => setSelectedCase(tc)}
          onAddCase={() => {
            setEditingCase(null);
            setOpenCaseModal(true);
          }}
          onAddSteps={() => setOpenStepsModal(true)}
          // --- ADD THESE TWO PROPS ---
          onEditCase={(tc) => {
            setEditingCase(tc);
            setOpenCaseModal(true);
          }}
          onDeleteCase={(testCaseData) => {
            const caseIdToDelete = testCaseData.id || testCaseData.caseId;
            const scenarioIdForCase = selectedScenario?.id;

            // ⭐ FIX 2: Bulletproof fallback to find the Story ID
            const storyIdForCase =
              selectedStory?.id ||
              testStories.find((s) =>
                s.scenarios?.some((sc) => sc.id === scenarioIdForCase),
              )?.id;

            if (caseIdToDelete && scenarioIdForCase && storyIdForCase) {
              handleDeleteCase(
                caseIdToDelete,
                scenarioIdForCase,
                storyIdForCase,
              );
            } else {
              showStatusToast("Error: Could not find case data to delete.", "error");
              console.error("Missing IDs for delete:", {
                caseIdToDelete,
                scenarioIdForCase,
                storyIdForCase,
              });
            }
          }}
        />
      </main>

      {/* -------------------------------- */}
      {/* MODALS */}
      {/* -------------------------------- */}
      {/* -------------------------------- */}
      {/* MODALS */}
      {/* -------------------------------- */}
      {openStoryModal && (
        <AddTestStoryModal
          projectId={projectId}
          storyToEdit={editingStory} // <-- Pass the story to prefill
          onClose={() => {
            setOpenStoryModal(false);
            setEditingStory(null); // <-- Reset on close
          }}
          onCreated={handleStoryCreated}
          testStoryId={editingStory?.id || null}
        />
      )}

      {openScenarioModal && scenarioStory && (
        <AddScenarioModal
          storyId={scenarioStory.id}
          scenarioToEdit={editingScenario} // <-- Pass the scenario data to prefill
          onClose={() => {
            setOpenScenarioModal(false);
            setEditingScenario(null); // <-- Reset on close
          }}
          onCreated={handleScenarioCreated}
        />
      )}
      {openCaseModal && selectedScenario && (
        <AddCaseModal
          scenarioId={selectedScenario.id}
          caseToEdit={editingCase} // <-- Pass the case to prefill
          onClose={() => {
            setOpenCaseModal(false);
            setEditingCase(null); // <-- Reset on close
          }}
          onCreated={handleCaseCreated}
        />
      )}

      {openStepsModal && selectedCase && (
        <AddStepsModal
          caseId={selectedCase.id}
          onClose={() => setOpenStepsModal(false)}
          onCreated={handleStepsCreated}
        />
      )}
    </div>
    </>
  );
}
