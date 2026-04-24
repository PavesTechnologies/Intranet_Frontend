// src/pages/Projects/manager/Backlog.jsx
import React, { useEffect, useState } from "react";

import { Plus, List, X } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import StoryCard from "../UserSprint/StoryCard";
import SprintColumn from "../UserSprint/SprintColumn";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Button from "../../../../components/Button/Button";

const Backlog = ({ projectId, projectName }) => {
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [noEpicStories, setNoEpicStories] = useState([]);
  const [projects, setProjects] = useState([]);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const handleCloseForms = () => {
    setShowIssueForm(false);
    setShowSprintForm(false);
  };

  const fetchProjects = () => {
    axios
      .get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects`, { headers })
      .then((res) => setProjects(res.data.content || res.data || []))
      .catch((err) => console.error("Failed to fetch projects", err));
  };

  const fetchStories = () => {
    axios
      .get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/stories`,
        { headers },
      )
      .then((res) => setStories(res.data))
      .catch((err) => console.error("Failed to fetch stories", err));
  };

  const fetchNoEpicStories = () => {
    axios
      .get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/no-epic`, {
        params: { projectId },
        headers,
      })
      .then((res) => setNoEpicStories(res.data))
      .catch((err) => console.error("Failed to fetch no epic stories", err));
  };

  const fetchSprints = () => {
    axios
      .get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/sprints`,
        { headers },
      )
      .then((res) => setSprints(res.data))
      .catch((err) => console.error("Failed to fetch sprints", err));
  };

  useEffect(() => {
    fetchProjects();
    fetchStories();
    fetchSprints();
    fetchNoEpicStories();
  }, [projectId]);

  const handleDropStory = (storyId, sprintId) => {
    axios
      .put(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/stories/${storyId}/assign-sprint`,
        { sprintId },
        { headers },
      )
      .then(() => {
        // ✅ Update story’s sprintId locally
        setStories((prev) =>
          prev.map((s) => (s.id === storyId ? { ...s, sprintId } : s)),
        );

        // ✅ Optional: remove it from no-epic list if you maintain it separately
        setNoEpicStories((prev) => prev.filter((s) => s.id !== storyId));
      })
      .catch((err) => console.error("Failed to assign story to sprint", err));
  };

  const selectedProject = projects.find((p) => p.id === projectId);

  // ✅ Navigate to Issue Tracker
  const goToIssueTracker = () => {
    navigate(`/projects/${projectId}/user/userissuetracker`, {
      state: { projectId },
    });
  };

  const filteredNoEpicStories = noEpicStories || [];
  const filteredStories = stories || [];

  // ✅ Sort sprints by createdAt (latest first)
  const sortedSprints = [...sprints].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="max-w-6xl mx-auto mt-6 px-4 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-medium text-indigo-900">
            Backlog of {projectName}
          </h1>
          <div className="flex gap-3">
            <Button
              size="medium"
              variant="outline"
              className="flex items-center gap-2"
              onClick={goToIssueTracker}
            >
              <List size={18} /> Issue Tracker
            </Button>
          </div>
        </div>

        {/* ✅ Modal: Create Issue */}

        {/* ✅ Modal: Create Sprint */}
        {showSprintForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6 overflow-y-auto max-h-[90vh]">
              <button
                onClick={handleCloseForms}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              ></button>
              <CreateSprint onClose={handleCloseForms} projectId={projectId} />
            </div>
          </div>
        )}

        {/* ✅ Unassigned (Backlog) Stories Section */}
        <div className="bg-white border p-4 rounded-lg shadow-sm min-h-[120px]">
          <h2 className="text-base font-medium text-indigo-900 mb-3">
            Backlog Stories
          </h2>
          {filteredNoEpicStories.length === 0 ? (
            <p className="text-gray-400 italic">No unassigned stories</p>
          ) : (
            <div className="space-y-2">
              {filteredNoEpicStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={{ ...story, status: "BACKLOG" }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ✅ Sprint List Section */}
        <div>
          <h2 className="text-base font-medium text-indigo-900 mb-3">
            Assign to Sprint
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedSprints.map((sprint) => (
              <SprintColumn
                key={sprint.id}
                sprint={sprint}
                stories={filteredStories.filter(
                  (s) => s.sprintId === sprint.id,
                )}
                onDropStory={handleDropStory}
                onChangeStatus={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default Backlog;
