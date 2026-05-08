import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import FilterListbox from "../../../../../components/filter/FilterListbox";
import { X } from "lucide-react";
import toast from "react-hot-toast";

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
    if (!name.trim()) return toast.error("Story name is required");

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
        toast.success("Test Story updated successfully!");
      } else {
        await axiosInstance.post(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/test-design/test-stories`,
          payload,
        );
        toast.success("Test Story created successfully!");
      }

      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error("Save Test Story FAILED →", err);
      // ⭐ 4. Dynamic error message
      toast.error(
        storyToEdit
          ? "Failed to update test story"
          : "Failed to create test story",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[520px] p-6 rounded-xl shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          {/* ⭐ 5. Dynamic Modal Title */}
          <h2 className="text-lg font-semibold text-gray-800">
            {storyToEdit ? "Edit Test Story" : "Add Test Story"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

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
            <button
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className={`px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors ${saving ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"}`}
              onClick={handleSave}
              disabled={saving}
            >
              {/* ⭐ 6. Dynamic Button Text */}
              {saving
                ? "Saving..."
                : storyToEdit
                  ? "Update Story"
                  : "Create Story"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
