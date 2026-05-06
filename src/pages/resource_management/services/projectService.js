import axios from "axios";

const BASE_URL = window.__APP_CONFIG__?.RMS_BASE_URL;

export const getProjects = async ({ page, size, search, filters }) => {
  const params = {
    page,
    size,
  };

  if (search) params.search = search;
  // if (filters.readinessStatus) params.readinessStatus = filters.readinessStatus;
  // if (filters.projectStatus) params.projectStatus = filters.projectStatus;
  // if (filters.priorityLevel) params.priorityLevel = filters.priorityLevel;
  // if (filters.riskLevel) params.riskLevel = filters.riskLevel;

  try {
    const res = await axios.get(`${BASE_URL}/api/projects/get-projects`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const getProjectById = async (projectId) => {
  try {
    const res = await axios.get(
      `${BASE_URL}/api/projects/get-project-by-id/${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const checkDemandCreation = async (projectId) => {
  try {
    const res = await axios.get(
      `${BASE_URL}/api/projects/check-demand-creation/${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const createDemand = async (demandData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/demand/create`,
      demandData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const statusUpdate = async (readinessData) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/api/projects/readiness-status-update`,
      readinessData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const getProjectEscalations = async (projectId) => {
  try {
    const res = await axios.get(
      `${BASE_URL}/api/projects/${projectId}/escalations`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    return res.data;
  } catch (err) {
    throw err;
  }
};

// 🔹 CREATE new escalation mapping (existing or new contact)
export const createProjectEscalation = async (payload) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/api/projects/escalations`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      },
    );

    return res.data;
  } catch (err) {
    throw err;
  }
};

// 🔹 DELETE escalation mapping from project
export const deleteProjectEscalation = async (escalationId) => {
  try {
    const res = await axios.delete(
      `${BASE_URL}/api/projects/escalations/${escalationId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    return res.data;
  } catch (err) {
    throw err;
  }
};

export const getLocations = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/api/projects/get-locations`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const updateDemandStatus = async (payload) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/api/demand/update/pm`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const getProjectKPIs = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/api/projects/kpi`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};
