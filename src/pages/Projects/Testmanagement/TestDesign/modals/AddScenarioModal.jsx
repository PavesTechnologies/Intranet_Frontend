import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import FilterListbox from "../../../../../components/filter/FilterListbox";
import { useParams } from "react-router-dom";
import { showStatusToast } from "../../../../../components/toastfy/toast";
import Button from "../../../../../components/Button/Button";
import Modal from "../../../../../components/Modal/modal";

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
      showStatusToast("Failed to load test plans", "error");
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
      showStatusToast("Failed to load stories", "error");
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
      return showStatusToast("Test Plan is required", "error");
    if (!title.trim()) return showStatusToast("Scenario title is required", "error");

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
        showStatusToast("Scenario updated successfully!", "success");
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
        showStatusToast("Scenario created successfully!", "success");
      }

      if (onCreated) onCreated(res.data);
      onClose();
    } catch (err) {
      console.error("❌ Action failed", err.response?.data || err);
      showStatusToast(
        scenarioToEdit ? "Failed to update scenario" : "Failed to create scenario",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={scenarioToEdit ? "Edit Scenario" : "Add Scenario"}
      className="max-w-[520px]"
    >
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
            <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>

            <Button variant="primary" onClick={handleSave} disabled={loading} loading={loading} loadingText="Saving...">
              {scenarioToEdit ? "Update Scenario" : "Create Scenario"}
            </Button>
          </div>
        </div>
    </Modal>
  );
}
