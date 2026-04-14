import React, { useEffect, useState, useMemo } from "react";
import axiosInstance from "../../api/axiosInstance";
import { ChevronDown, ChevronRight, Folder, FileText } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../../../components/LoadingSpinner";
export default function AddCasesFromProjectModal({ onClose, onAddCases }) {
  const { projectId, runId } = useParams();
  const [stories, setStories] = useState([]);
  const [expandedStories, setExpandedStories] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCases, setSelectedCases] = useState([]);

  const navigate = useNavigate();

  // =====================================================
  // 🚀 LOAD EVERYTHING AT ONCE (NEW ENDPOINT)
  // =====================================================
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-stories/project-test-data/${projectId}`,
      );

      // Ensure structure consistency
      const formatted = (res.data?.stories || []).map((story) => ({
        ...story,
        scenarios: story.scenarios || [],
      }));

      setStories(formatted);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load test data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [projectId]);

  // =====================================================
  // TREE EXPAND/COLLAPSE
  // =====================================================
  const toggleStory = (story) => {
    setExpandedStories((prev) => ({
      ...prev,
      [story.id]: !prev[story.id],
    }));
  };

  // =====================================================
  // SELECTION MANAGEMENT
  // =====================================================
  const getAllCaseIdsInStory = (story) => {
    return story.scenarios.flatMap(
      (sc) => sc.testCases?.map((tc) => tc.id) || [],
    );
  };

  const getAllCaseIdsInScenario = (sc) =>
    sc.testCases?.map((tc) => tc.id) || [];

  const toggleStorySelection = (story, isSelected) => {
    const allIds = getAllCaseIdsInStory(story);
    if (allIds.length === 0) return;

    setSelectedCases((prev) =>
      isSelected
        ? Array.from(new Set([...prev, ...allIds]))
        : prev.filter((id) => !allIds.includes(id)),
    );
  };

  const toggleScenarioSelection = (scenario, isSelected) => {
    const allIds = getAllCaseIdsInScenario(scenario);
    if (allIds.length === 0) return;

    setSelectedCases((prev) =>
      isSelected
        ? Array.from(new Set([...prev, ...allIds]))
        : prev.filter((id) => !allIds.includes(id)),
    );
  };

  const toggleCase = (id) => {
    setSelectedCases((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // =====================================================
  // INDICATOR STATUS (Checkbox Indeterminate)
  // =====================================================
  const selectionStatus = useMemo(() => {
    const status = { stories: {}, scenarios: {} };

    for (const story of stories) {
      const storyCaseIds = getAllCaseIdsInStory(story);
      const selected = storyCaseIds.filter((id) => selectedCases.includes(id));

      status.stories[story.id] =
        storyCaseIds.length === 0
          ? "disabled"
          : selected.length === storyCaseIds.length
            ? "checked"
            : selected.length > 0
              ? "indeterminate"
              : "unchecked";

      story.scenarios.forEach((sc) => {
        const scIds = getAllCaseIdsInScenario(sc);
        const scSelected = scIds.filter((id) => selectedCases.includes(id));

        status.scenarios[sc.id] =
          scIds.length === 0
            ? "disabled"
            : scSelected.length === scIds.length
              ? "checked"
              : scSelected.length > 0
                ? "indeterminate"
                : "unchecked";
      });
    }

    return status;
  }, [stories, selectedCases]);

  // =====================================================
  // SUBMIT → Add cases to Test Run
  // =====================================================
  const handleAddCasesSubmit = async () => {
    try {
      await axiosInstance.post(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-execution/test-runs/${runId}/add-cases`,
        { testCaseIds: selectedCases },
      );

      toast.success("Test cases added successfully");
      navigate(-1);
    } catch (err) {
      toast.error("Failed to add test cases");
    }
  };

  // =====================================================
  // 🔘 INDTERMINATE CHECKBOX COMPONENT
  // =====================================================
  const IndeterminateCheckbox = ({ id, status, onChange }) => {
    const ref = React.useRef(null);

    useEffect(() => {
      if (ref.current) {
        ref.current.indeterminate = status === "indeterminate";
      }
    }, [status]);

    return (
      <input
        ref={ref}
        type="checkbox"
        disabled={status === "disabled"}
        checked={status === "checked"}
        onChange={(e) => onChange(e.target.checked)}
        className="form-checkbox"
      />
    );
  };

  // =====================================================
  // STORY ROW
  // =====================================================
  const StoryRow = ({ story }) => {
    const isExpanded = expandedStories[story.id];
    const status = selectionStatus.stories[story.id];
    const totalCases = getAllCaseIdsInStory(story).length;

    return (
      <div>
        <div className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded">
          <button onClick={() => toggleStory(story)}>
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </button>

          <IndeterminateCheckbox
            id={story.id}
            status={status}
            onChange={(v) => toggleStorySelection(story, v)}
          />

          <Folder size={18} className="text-indigo-600" />

          <span className="font-semibold text-sm">
            {story.name}{" "}
            <span className="text-xs text-gray-500">({totalCases} Cases)</span>
          </span>
        </div>

        {isExpanded && (
          <div className="ml-8 border-l pl-4 mt-2 space-y-2">
            {story.scenarios.length === 0 ? (
              <p className="text-gray-500 text-xs">No scenarios found.</p>
            ) : (
              story.scenarios.map((sc) => (
                <ScenarioBlock key={sc.id} scenario={sc} />
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // SCENARIO BLOCK
  // =====================================================
  const ScenarioBlock = ({ scenario }) => {
    const status = selectionStatus.scenarios[scenario.id];
    const caseCount = scenario.testCases?.length || 0;

    return (
      <div className="border p-3 rounded-lg bg-gray-50 shadow-sm">
        <div className="flex items-center gap-3">
          <IndeterminateCheckbox
            id={scenario.id}
            status={status}
            onChange={(v) => toggleScenarioSelection(scenario, v)}
          />

          <span className="text-sm font-medium text-indigo-700">
            {scenario.title} ({caseCount})
          </span>
        </div>

        <div className="ml-7 mt-2 space-y-1">
          {caseCount === 0 ? (
            <p className="text-gray-400 text-xs">No test cases.</p>
          ) : (
            scenario.testCases.map((tc) => (
              <div
                key={tc.id}
                className="flex items-center gap-2 p-1 hover:bg-white rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedCases.includes(tc.id)}
                  onChange={() => toggleCase(tc.id)}
                />
                <FileText size={14} className="text-gray-500" />
                <span className="text-gray-700 text-sm">{tc.title}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // =====================================================
  // MAIN UI
  // =====================================================
  return (
    <div className="w-full max-h-full flex flex-col rounded-xl shadow-xl">
      {/* HEADER */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">Add Existing Test Cases</h2>
        <p className="text-sm text-gray-500">
          Select stories, scenarios, or individual cases. (
          {selectedCases.length} selected)
        </p>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <p className="text-center py-10 text-gray-500">
            <LoadingSpinner text="Loading..." />
          </p>
        ) : stories.length === 0 ? (
          <p className="text-center py-10 text-gray-500">No stories found.</p>
        ) : (
          stories.map((story) => <StoryRow key={story.id} story={story} />)
        )}
      </div>

      {/* FOOTER */}
      <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
        <button
          className="px-6 py-2 border rounded-lg"
          onClick={() => navigate(-1)}
        >
          Cancel
        </button>

        <button
          disabled={selectedCases.length === 0}
          onClick={handleAddCasesSubmit}
          className={`px-6 py-2 text-white rounded-lg ${
            selectedCases.length > 0
              ? "bg-indigo-600 hover:bg-indigo-700"
              : "bg-indigo-400 cursor-not-allowed"
          }`}
        >
          Add {selectedCases.length} Case(s)
        </button>
      </div>
    </div>
  );
}
