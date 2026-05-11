import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import FilterListbox from "../../../../../components/filter/FilterListbox";
import { showStatusToast } from "../../../../../components/toastfy/toast";
import Button from "../../../../../components/Button/Button";
import Modal from "../../../../../components/Modal/modal";

// ⭐ 1. Add `storyToEdit` to props
export default function AddTestStoryModal({
  projectId,
  onClose,
  onCreated,
  storyToEdit,
  testStoryId,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linkedStoryId, setLinkedStoryId] = useState("");

  const [pmsStories, setPmsStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [saving, setSaving] = useState(false);

  // ⭐ 2. Prefill form if `storyToEdit` exists
  useEffect(() => {
    if (storyToEdit) {
      setName(storyToEdit.name || "");
      setDescription(storyToEdit.description || "");
      setLinkedStoryId(storyToEdit.linkedStoryId || "");
    }
  }, [storyToEdit]);

  // ---------------------------------------------------------
  // LOAD PMS STORIES
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await axiosInstance.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/stories`,
        );
        setPmsStories(res.data || []);
      } catch (err) {
        console.error("Failed to load PMS stories →", err);
      } finally {
        setLoadingStories(false);
      }
    };

    fetchStories();
  }, [projectId]);

  // ---------------------------------------------------------
  // SAVE / UPDATE TEST STORY
  // ---------------------------------------------------------
  const handleSave = async () => {
    if (!name.trim()) return showStatusToast("Story name is required", "error");

    setSaving(true);

    try {
      const payload = {
        projectId: Number(projectId),
        name: name.trim(),
        description: description.trim(),
        linkedStoryId: linkedStoryId ? Number(linkedStoryId) : null,
      };

      // ⭐ 3. Check if editing vs creating
      if (storyToEdit) {
        await axiosInstance.put(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-stories/project-test-data/${testStoryId}`,
          payload,
        );
        showStatusToast("Test Story updated successfully!", "success");
      } else {
        await axiosInstance.post(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-stories`,
          payload,
        );
        showStatusToast("Test Story created successfully!", "success");
      }

      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error("Save Test Story FAILED →", err);
      showStatusToast(
        storyToEdit ? "Failed to update test story" : "Failed to create test story",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={storyToEdit ? "Edit Test Story" : "Create Test Story"}
      className="max-w-[520px]"
    >
        <div className="space-y-4">
          {/* STORY NAME */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Story Name *
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter test story name"
            />
          </div>

          {/* LINKED PMS STORY DROPDOWN */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Linked PMS Story (optional)
            </label>
            {loadingStories ? (
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50 flex items-center">
                <span className="animate-pulse mr-2">●</span> Loading stories…
              </div>
            ) : (
              <FilterListbox
                options={[{value:"",label:"-- Select a PMS story --"},...pmsStories.map(story=>({value:story.id,label:story.title||story.name||`Story #${story.id}`}))]}
                value={linkedStoryId}
                onChange={setLinkedStoryId}
              />
            )}
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Description
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter story description..."
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving} loading={saving} loadingText="Saving...">
              {storyToEdit ? "Update Story" : "Create Story"}
            </Button>
          </div>
        </div>
    </Modal>
  );
}
