import React, { useEffect, useState } from "react";
import {
  Plus,
  Folder,
  ChevronRight,
  Layers,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import { useParams } from "react-router-dom";

import ScenarioPanel from "./panels/ScenarioPanel";
import AddScenarioModal from "./modals/AddScenarioModal";
import AddCaseModal from "./modals/AddCaseModal";
import AddStepsModal from "./modals/AddStepsModal";
import AddTestStoryModal from "./modals/AddTestStoriesModal";

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

  // ---------------------------------------------------------
  // FETCH TEST STORIES
  // ---------------------------------------------------------
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
  const toggleStoryExpand = async (story) => {
    const isExpanded = expandedStories[story.id];

    if (isExpanded) {
      setExpandedStories((p) => ({ ...p, [story.id]: false }));
      return;
    }

    await loadStoryContents(story.id);
    setExpandedStories((p) => ({ ...p, [story.id]: true }));
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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-gray-400">
        <Loader2 className="animate-spin h-8 w-8 mb-4 text-blue-600" />
        <p>Loading Test Design Environment...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">
      {/* -------------------------------- */}
      {/* LEFT SIDEBAR — EXPLORER */}
      {/* -------------------------------- */}
      <aside className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-800 tracking-tight">
              Test Stories
            </h3>
          </div>
          <button
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            onClick={() => setOpenStoryModal(true)}
            title="Add Test Story"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* STORY LIST */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {testStories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
              <AlertCircle className="h-6 w-6 mb-2 opacity-50" />
              <span>No test stories found.</span>
            </div>
          ) : (
            testStories.map((story) => {
              const isExpanded = expandedStories[story.id];

              return (
                <div key={story.id} className="select-none">
                  {/* Story Row */}
                  <div className="group flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors text-gray-700">
                    <div
                      className="flex items-center gap-2 flex-1 overflow-hidden"
                      onClick={() => {
                        setSelectedStory(story);
                        toggleStoryExpand(story);
                      }}
                    >
                      <ChevronRight
                        size={16}
                        className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                      />
                      <Folder
                        size={16}
                        className={
                          isExpanded ? "text-blue-500" : "text-gray-400"
                        }
                      />
                      <span className="text-sm font-medium truncate">
                        {story.name}
                      </span>
                    </div>

                    {/* Add Scenario Button (Visible on hover) */}
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded text-gray-500 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setScenarioStory(story);
                        setOpenScenarioModal(true);
                      }}
                      title="Add Scenario"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Expandable Scenario List */}
                  {isExpanded && (
                    <div className="ml-5 mt-1 border-l border-gray-200 pl-2 space-y-0.5 pb-2">
                      {story.scenarios.length === 0 ? (
                        <div className="px-4 py-2 text-xs text-gray-400 italic">
                          No scenarios inside
                        </div>
                      ) : (
                        story.scenarios.map((scenario) => {
                          const isSelected =
                            selectedScenario?.id === scenario.id;

                          return (
                            <div
                              key={scenario.id}
                              className={`group flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-blue-50 text-blue-700 font-medium"
                                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                              }`}
                              onClick={() => {
                                setSelectedScenario(scenario);
                                setSelectedCase(scenario.cases[0] || null);
                              }}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Layers
                                  size={14}
                                  className={
                                    isSelected
                                      ? "text-blue-500"
                                      : "text-gray-400"
                                  }
                                />
                                <span className="text-sm truncate">
                                  {scenario.title}
                                </span>
                              </div>

                              {/* Add Case Button (Visible on hover) */}
                              <button
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-200 hover:text-blue-800 rounded text-gray-500 transition-opacity ml-2 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedScenario(scenario);
                                  setOpenCaseModal(true);
                                }}
                                title="Add Test Case"
                              >
                                <Plus size={12} />
                              </button>
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

      {/* -------------------------------- */}
      {/* MAIN CONTENT PANEL */}
      {/* -------------------------------- */}
      <main className="flex-1 overflow-auto bg-white border-l border-gray-100">
        <ScenarioPanel
          selectedTestStory={selectedStory}
          selectedScenario={selectedScenario}
          selectedCase={selectedCase}
          onSelectScenario={(sc) => {
            setSelectedScenario(sc);
            setSelectedCase(sc.cases[0] || null);
          }}
          onSelectCase={(tc) => setSelectedCase(tc)}
          onAddCase={() => setOpenCaseModal(true)}
          onAddSteps={() => setOpenStepsModal(true)}
        />
      </main>

      {/* -------------------------------- */}
      {/* MODALS */}
      {/* -------------------------------- */}
      {openStoryModal && (
        <AddTestStoryModal
          projectId={projectId}
          onClose={() => setOpenStoryModal(false)}
          onCreated={handleStoryCreated}
        />
      )}

      {openScenarioModal && scenarioStory && (
        <AddScenarioModal
          storyId={scenarioStory.id}
          onClose={() => setOpenScenarioModal(false)}
          onCreated={handleScenarioCreated}
        />
      )}

      {openCaseModal && selectedScenario && (
        <AddCaseModal
          scenarioId={selectedScenario.id}
          onClose={() => setOpenCaseModal(false)}
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
  );
}
