import api from "../../../../api/axiosInstance";

const PMS_BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;

export const createBug = (data) =>
  api.post(`${PMS_BASE_URL}/api/testing/bugs`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

export const updateBugStatus = (bugId, data) =>
  api.put(`${PMS_BASE_URL}/api/testing/bugs/${bugId}/status`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

export const listBugs = (projectId, page, size) =>
  api.get(`${PMS_BASE_URL}/api/testing/bugs/projects/${projectId}`, {
    params: { page, size },
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

export const bugSummaries = (projectId) =>
  api.get(
    `${PMS_BASE_URL}/api/testing/bugs/projects/${projectId}/summaries`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );

export const getBugsByAssignee = (assigneeId) =>
  api.get(`${PMS_BASE_URL}/api/testing/bugs/assignee/${assigneeId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
