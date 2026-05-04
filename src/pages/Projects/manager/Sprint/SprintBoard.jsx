import React, { useEffect, useState } from "react";
import axios from "axios";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import StoryCard from "./StoryCard";
import CreateSprintModal from "./CreateSprintModal";
import SprintColumn from "./SprintColumn";
import Button from "../../../../components/Button/Button";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SprintPendingModal from "./SprintPendingModal";

const SprintBoard = ({ projectId, projectName }) => {
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);

  const token = localStorage.getItem("token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  // Debug: log when modal state changes
  useEffect(() => {
    console.log("🔄 Modal state changed:", { showPendingModal, pendingData });
  }, [showPendingModal, pendingData]);

  /** ==============================
   * Fetch Stories
   ============================== */
  const fetchStories = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/stories`,
        { headers },
      );

      console.log("📘 Stories API Response:", res.data);
      const storyList = Array.isArray(res.data)
        ? res.data
        : res.data.content || res.data.stories || [];

      setStories(Array.isArray(storyList) ? storyList : []);
    } catch (err) {
      console.error(
        "❌ Failed to load stories:",
        err.response?.data || err.message,
      );
      toast.error("Failed to load stories. Check console for details.");
      setStories([]);
    }
  };

  /** ==============================
   * Fetch Sprints
   ============================== */
  const fetchSprints = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/sprints`,
        { headers },
      );

      console.log("🏃 Sprint API Response:", res.data);

      // Handle multiple possible backend response formats
      const sprintList = Array.isArray(res.data)
        ? res.data
        : res.data.content || res.data.sprints || [];

      setSprints(Array.isArray(sprintList) ? sprintList : []);
    } catch (err) {
      console.error(
        "❌ Failed to load sprints:",
        err.response?.data || err.message,
      );
      toast.error("Failed to load sprints. Check console for details.");
      setSprints([]);
    }
  };

  /** ==============================
   * Assign Story to Sprint (Drag & Drop)
   ============================== */
  const handleDropStory = async (storyId, sprintId) => {
    try {
      await axios.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/${storyId}/assign-sprint`,
        { sprintId },
        { headers },
      );
      toast.success("Story assigned to sprint successfully!");
      await fetchStories();
    } catch (err) {
      console.error(
        "Error assigning story to sprint:",
        err.response?.data || err.message,
      );
      toast.error("Failed to assign story to sprint.");
    }
  };

  /** ==============================
   * Change Sprint Status
   ============================== */
  const handleStatusChange = async (sprintId, action) => {
    try {
      const response = await axios.put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/sprints/${sprintId}/${action}`,
        {},
        { headers },
      );

      // success UI
      toast.success(`Sprint ${action} successful`);
      fetchStories();
      fetchSprints();
    } catch (error) {
      const errorData = error.response?.data || {};

      console.log("❌ Error Response:", {
        code: errorData.code,
        message: errorData.message,
        data: errorData.data,
        fullError: error,
      });

      // Handle structured error response (preferred)
      if (
        action === "complete" &&
        errorData.code === "SPRINT_COMPLETION_VALIDATION_ERROR"
      ) {
        const { pendingTasks = [], pendingStories = [] } = errorData.data || {};

        console.log("✅ Modal triggered with:", {
          pendingTasks,
          pendingStories,
        });

        setPendingData({
          sprintId,
          tasks: Array.isArray(pendingTasks) ? pendingTasks : [],
          stories: Array.isArray(pendingStories) ? pendingStories : [],
        });
        setShowPendingModal(true);
        return;
      }

      // Fallback: handle old API response format with string parsing
      if (
        action === "complete" &&
        errorData.message?.includes("Cannot complete sprint")
      ) {
        try {
          const raw = errorData.message;
          let tasks = raw.match(/Tasks not done: \[(.*?)\]/);
          let stories = raw.match(/Stories not done: \[(.*?)\]/);

          tasks = tasks
            ? tasks[1]
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [];
          stories = stories
            ? stories[1]
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];

          if (tasks.length > 0 || stories.length > 0) {
            setPendingData({
              sprintId,
              tasks,
              stories,
            });
            setShowPendingModal(true);
            return;
          }
        } catch (parseErr) {
          console.error("Failed to parse pending items:", parseErr);
        }
      }

      if (errorData.message?.toLowerCase().includes("another active sprint")) {
          toast.warn(
              "Cannot start sprint: Another active sprint already exists in this project.",
              { autoClose: 3000, containerId: "global" }
          );
          fetchSprints();
          return;
      }

      // Generic error message
      const errorMsg = errorData.message || error.message || "Operation failed";
      toast.error(errorMsg);
    }
  };

  /** ==============================
   * Lifecycle
   ============================== */
  useEffect(() => {
    fetchSprints();
    fetchStories();
  }, [projectId]);

  /** ==============================
   * Filtered Sprints
   ============================== */
  const filteredSprints =
    filter === "ALL" ? sprints : sprints.filter((s) => s.status === filter);

  /** ==============================
   * Render
   ============================== */
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 space-y-6">
        {/* ===== Page Header ===== */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-indigo-900">
            Sprint Planning of {projectName}
          </h2>
          <Button
            className="bg-indigo-900 text-white rounded hover:bg-indigo-800 px-4 py-2"
            onClick={() => setShowModal(true)}
          >
            + Create Sprint
          </Button>
        </div>

        {/* ===== Filter Dropdown ===== */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="sprintFilter"
            className="text-base font-medium text-gray-700"
          >
            Filter Sprints:
          </label>
          <select
            id="sprintFilter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 text-base w-48 
                      focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">ALL</option>
            <option value="PLANNING">PLANNING</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          {/* ✅ Debug Reload Button */}
          {/* <Button
            onClick={() => {
              fetchSprints();
              fetchStories();
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            🔄 Reload Data
          </Button> */}
        </div>

        {/* ===== Sprint Columns ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative">
          {filteredSprints.length > 0 ? (
            filteredSprints.map((sprint) => (
              <div key={sprint.id} className="bg-white rounded-2xl shadow p-6">
                <SprintColumn
                  sprint={sprint}
                  stories={stories.filter(
                    (story) =>
                      story.sprintId === sprint.id ||
                      story.sprint?.id === sprint.id, // fallback for nested sprint reference
                  )}
                  onDropStory={handleDropStory}
                  onChangeStatus={handleStatusChange}
                />
              </div>
            ))
          ) : (
            <p className="text-gray-600 font-medium mt-4">
              {filter === "ALL"
                ? "loading..."
                : `No ${filter.toLowerCase()} sprints found.`}
            </p>
          )}
        </div>

        {/* ===== Create Sprint Modal ===== */}
        <CreateSprintModal
          projectId={projectId}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onCreated={(newSprint) => setSprints((prev) => [...prev, newSprint])}
        />

        <SprintPendingModal
          isOpen={showPendingModal}
          pendingData={pendingData}
          sprints={sprints}
          onClose={() => setShowPendingModal(false)}
          refresh={() => {
            fetchSprints();
            fetchStories();
          }}
        />
      </div>
    </DndProvider>
  );
};

export default SprintBoard;
