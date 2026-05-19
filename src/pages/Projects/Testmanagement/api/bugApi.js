import axios from "axios";

const PMS_BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;

export const createBug = (data) =>
  axios.post(`${PMS_BASE_URL}/api/testing/bugs`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

export const updateBugStatus = (bugId, data) =>
  axios.put(`${PMS_BASE_URL}/api/testing/bugs/${bugId}/status`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

export const listBugs = (projectId, page, size) =>
  axios.get(`${PMS_BASE_URL}/api/testing/bugs/projects/${projectId}`, {
    params: { page, size },
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

export const bugSummaries = (projectId) =>
  axios.get(
    `${PMS_BASE_URL}/api/testing/bugs/projects/${projectId}/summaries`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );

export const getBugsByAssignee = (assigneeId) =>
  axios.get(`${PMS_BASE_URL}/api/testing/bugs/assignee/${assigneeId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
