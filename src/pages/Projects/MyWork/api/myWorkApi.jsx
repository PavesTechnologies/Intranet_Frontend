// src/pages/Projects/MyWork/api/myWorkApi.js
import axios from "axios";

const BASE = window.__APP_CONFIG__.PMS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Fetch the full My Work payload for a user.
 * One call → all projects, items, test work, snapshot counts.
 */
export const fetchMyWork = async (userId) => {
  const res = await axios.get(`${BASE}/api/my-work`, {
    params: { userId },
    headers: authHeaders(),
  });
  return res.data;
};

/**
 * Fetch completed items lazily (only called when user expands Completed section).
 */
export const fetchMyWorkCompleted = async (userId) => {
  const res = await axios.get(`${BASE}/api/my-work/completed`, {
    params: { userId },
    headers: authHeaders(),
  });
  return res.data;
};

/**
 * Fetch project-level statuses for the status change dropdown.
 * Cached aggressively — statuses rarely change.
 */
export const fetchProjectStatuses = async (projectId) => {
  const res = await axios.get(`${BASE}/api/projects/${projectId}/statuses`, {
    headers: authHeaders(),
  });
  return res.data; // [{ id, name, sortOrder }]
};

// ── Status update endpoints (match existing controllers exactly) ──────────────

export const updateTaskStatus = async ({ taskId, statusId }) => {
  const res = await axios.patch(
    `${BASE}/api/tasks/${taskId}/status`,
    { statusId },
    { headers: authHeaders() },
  );
  return res.data;
};

export const updateStoryStatus = async ({ storyId, statusId }) => {
  const res = await axios.patch(
    `${BASE}/api/stories/${storyId}/status`,
    { statusId },
    { headers: authHeaders() },
  );
  return res.data;
};

export const updateBugStatus = async ({ bugId, status }) => {
  const res = await axios.put(
    `${BASE}/api/testing/bugs/${bugId}/status`,
    { status },
    { headers: authHeaders() },
  );
  return res.data;
};
