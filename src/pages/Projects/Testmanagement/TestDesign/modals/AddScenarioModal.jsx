import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import FilterListbox from "../../../../../components/filter/FilterListbox";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { X } from "lucide-react"; // Added X icon import for consistency

export default function AddScenarioModal({
  storyId,
  scenarioToEdit,
  onClose,
  onCreated,
}) {
  const { projectId } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("LOW");

  const [testPlans, setTestPlans] = useState([]);
  const [testPlanId, setTestPlanId] = useState("");

  const [pmsStories, setPmsStories] = useState([]);
  const [linkedStoryId, setLinkedStoryId] = useState("");

  const [loading, setLoading] = useState(false);

  /* ---------------------------------------------------------
     FETCH TEST PLANS
  ---------------------------------------------------------- */
  const fetchTestPlans = async () => {
    try {
      const res = await axiosInstance.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/plans/projects/${projectId}`,
      );
      setTestPlans(res.data || []);
    } catch (err) {
      console.error("❌ Failed to load test plans", err);
      toast.error("Failed to load test plans");
    }
  };

  /* ---------------------------------------------------------
     FETCH PMS STORIES
  ---------------------------------------------------------- */
  const fetchPmsStories = async () => {
    try {
      const res = await axiosInstance.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/stories`,
      );
      setPmsStories(res.data || []);
    } catch (err) {
      console.error("❌ Failed to load PMS stories", err);
      toast.error("Failed to load stories");
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTestPlans();
      fetchPmsStories();
    }
  }, [projectId]);
  /* ---------------------------------------------------------
     PRE-FILL FORM FOR EDIT MODE
  ---------------------------------------------------------- */
  useEffect(() => {
    if (scenarioToEdit) {
      setTitle(scenarioToEdit.title || "");
      setDescription(scenarioToEdit.description || "");
      setPriority(scenarioToEdit.priority || "LOW");

      // If your DTO returns these IDs, pre-fill them.
      // Note: linkedUserStoryId matches the DTO property we defined earlier
      if (scenarioToEdit.testPlanId) setTestPlanId(scenarioToEdit.testPlanId);
      if (scenarioToEdit.linkedUserStoryId)
        setLinkedStoryId(scenarioToEdit.linkedUserStoryId);
    }
  }, [scenarioToEdit]);
  /* ---------------------------------------------------------
     SAVE NEW SCENARIO
  ---------------------------------------------------------- */
  /* ---------------------------------------------------------
     SAVE OR UPDATE SCENARIO
  ---------------------------------------------------------- */
  const handleSave = async () => {
    // Only require testPlanId if we are creating a new scenario
    if (!scenarioToEdit && !testPlanId)
      return toast.error("Test Plan is required");
    if (!title.trim()) return toast.error("Scenario title is required");

    setLoading(true);

    try {
      let res;

      if (scenarioToEdit) {
        // --- EDIT MODE ---
        // Note: We only send mutable fields to the update endpoint
        const updatePayload = {
          title: title.trim(),
          description: description.trim(),
          priority,
        };

        res = await axiosInstance.put(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/scenarios/${scenarioToEdit.id}`,
          updatePayload,
        );
        toast.success("Scenario updated successfully!");
      } else {
        // --- CREATE MODE ---
        const createPayload = {
          testPlanId: Number(testPlanId),
          testStoryId: Number(storyId),
          linkedStoryId: linkedStoryId ? Number(linkedStoryId) : null,
          title: title.trim(),
          description: description.trim(),
          priority,
        };

        res = await axiosInstance.post(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/scenarios`,
          createPayload,
        );
        toast.success("Scenario created successfully!");
      }

      if (onCreated) onCreated(res.data);
      onClose();
    } catch (err) {
      console.error("❌ Action failed", err.response?.data || err);
      toast.error(
        scenarioToEdit
          ? "Failed to update scenario"
          : "Failed to create scenario",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[520px] p-6 rounded-xl shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          {/* Header */}

          <h2 className="text-lg font-semibold text-gray-800">
            {scenarioToEdit ? "Edit Scenario" : "Add Scenario"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Test Plan */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Select Test Plan *
            </label>
            <FilterListbox
              options={[{value:"",label:"-- Select Test Plan --"},...testPlans.map(plan=>({value:plan.id,label:plan.title||plan.name||`Plan ${plan.id}`}))]}
              value={testPlanId}
              onChange={setTestPlanId}
            />
          </div>

          {/* Linked Story */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Link PMS Story (optional)
            </label>
            <FilterListbox
              options={[{value:"",label:"-- None --"},...pmsStories.map(story=>({value:story.id,label:story.title}))]}
              value={linkedStoryId}
              onChange={setLinkedStoryId}
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Scenario Title *
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter scenario title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Priority
            </label>
            <FilterListbox
              options={[{value:"LOW",label:"LOW"},{value:"MEDIUM",label:"MEDIUM"},{value:"HIGH",label:"HIGH"},{value:"CRITICAL",label:"CRITICAL"}]}
              value={priority}
              onChange={setPriority}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Description
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              placeholder="Enter description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <button
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${loading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"}`}
              onClick={handleSave}
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : scenarioToEdit
                  ? "Update Scenario"
                  : "Create Scenario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
