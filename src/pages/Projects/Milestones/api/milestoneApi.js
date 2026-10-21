// src/pages/Projects/Milestones/api/milestoneApi.js
// The shared axios instance attaches the bearer token and handles refresh.
import api from "../../../../api/axiosInstance";

const base = () => window.__APP_CONFIG__.PMS_BASE_URL;

export const fetchMilestones = async ({ projectId, page, size, status, readiness, sortBy, direction }) => {
  const res = await api.get(`${base()}/api/projects/${projectId}/milestones`, {
    params: {
      page,
      size,
      sortBy,
      direction,
      status: status || undefined,
      readiness: readiness || undefined,
    },
  });
  return res.data;
};

export const fetchMilestoneSummary = async (projectId) => {
  const res = await api.get(`${base()}/api/projects/${projectId}/milestones/summary`);
  return res.data;
};

export const fetchMilestone = async (milestoneId) => {
  const res = await api.get(`${base()}/api/milestones/${milestoneId}`);
  return res.data;
};

export const fetchMilestoneHistory = async (milestoneId) => {
  const res = await api.get(`${base()}/api/history/MILESTONE/${milestoneId}`);
  return res.data;
};

export const fetchProjectEpics = async (projectId) => {
  const res = await api.get(`${base()}/api/projects/${projectId}/epics`);
  return res.data;
};

export const createMilestone = async ({ projectId, payload }) => {
  const res = await api.post(`${base()}/api/projects/${projectId}/milestones`, payload);
  return res.data;
};

export const updateMilestone = async ({ milestoneId, payload }) => {
  const res = await api.put(`${base()}/api/milestones/${milestoneId}`, payload);
  return res.data;
};

export const changeMilestoneStatus = async ({ milestoneId, status, version }) => {
  const res = await api.patch(`${base()}/api/milestones/${milestoneId}/status`, { status, version });
  return res.data;
};

export const completeMilestone = async ({ milestoneId, actualCompletionDate, version }) => {
  const res = await api.patch(`${base()}/api/milestones/${milestoneId}/complete`, {
    actualCompletionDate: actualCompletionDate || null,
    version,
  });
  return res.data;
};

export const deleteMilestone = async (milestoneId) => {
  await api.delete(`${base()}/api/milestones/${milestoneId}`);
};
