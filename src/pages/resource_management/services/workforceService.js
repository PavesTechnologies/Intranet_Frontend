import axios from "axios";

const BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;
const LMS_BASE_URL = window.__APP_CONFIG__.BASE_URL;
const TSM_BASE_URL = window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT;

export const getWorkforceFilters = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/resource/get-all-resource-filters`,
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

export const getWorkforceKPI = async (filters) => {
  try {
    const params = {};
    if (filters.role && filters.role !== "All Roles")
      params.role = filters.role;
    if (filters.location && filters.location !== "All Locations")
      params.location = filters.location;
    if (filters.employmentType && filters.employmentType !== "All Types")
      params.employmentType = filters.employmentType;
    if (filters.experienceRange?.[0] > 0)
      params.minExperience = filters.experienceRange[0];
    if (filters.experienceRange?.[1] < 15)
      params.maxExperience = filters.experienceRange[1];
    if (filters.allocationPercentage && filters.allocationPercentage > 0)
      params.allocationPercentage = filters.allocationPercentage;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.project && filters.project !== "All Projects")
      params.project = filters.project;

    const response = await axios.get(`${BASE_URL}/api/rms/kpis`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    return response.data;
  } catch (err) {
    throw err;
  }
};

export const getAvailabilityTimeline = async (filters, pagination) => {
  try {
    const params = {};

    // Pagination params
    if (pagination.page !== undefined && pagination.page !== null)
      params.page = pagination.page;
    if (pagination.size !== undefined && pagination.size !== null)
      params.size = pagination.size;

    // Date params - prioritizing pagination if provided, else filters
    if (pagination.startDate) {
      params.startDate = pagination.startDate;
    } else if (filters.startDate) {
      params.startDate = filters.startDate;
    }

    if (pagination.endDate) {
      params.endDate = pagination.endDate;
    } else if (filters.endDate) {
      params.endDate = filters.endDate;
    }

    // Filter params
    if (filters.role && filters.role !== "All Roles")
      params.designation = filters.role;
    if (filters.location && filters.location !== "All Locations")
      params.location = filters.location;
    if (filters.employmentType && filters.employmentType !== "All Types")
      params.employmentType = filters.employmentType;
    if (filters.search && filters.search.trim() !== "") {
      params.search = filters.search.trim();
    }
    if (filters.experienceRange?.[0] > 0)
      params.minExp = filters.experienceRange[0];
    if (filters.experienceRange?.[1] < 15)
      params.maxExp = filters.experienceRange[1];
    if (filters.allocationPercentage && filters.allocationPercentage > 0)
      params.allocationPercentage = filters.allocationPercentage;
    if (filters.status) params.status = filters.status;
    if (filters.project && filters.project !== "All Projects")
      params.project = filters.project;

    const response = await axios.get(
      `${BASE_URL}/api/availability/timeline/window`,
      {
        params,
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

export const getHolidaysByYear = async (year) => {
  try {
    const response = await axios.get(
      `${LMS_BASE_URL}/api/holidays/year/${year}`,
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

export const getUtilization = async (resourceId, month, year) => {
  try {
    const now = new Date();
    const targetMonth = month || (now.getMonth() + 1);
    const targetYear = year || now.getFullYear();

    const response = await axios.get(
      `${TSM_BASE_URL}/api/utilization/monthly/${resourceId}`,
      {
        params: {
          year: targetYear,
          month: targetMonth,
        },
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

export const getDashboardSummaryDateRangeMonths = async (resourceId, months = 3) => {
  try {
    const params = { months };
    if (resourceId) params.employeeId = resourceId;

    const response = await axios.get(
      `${TSM_BASE_URL}/api/dashboard/summary/dateRangeMonths`,
      {
        params,
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

export const getDashboardSummaryDateRange = async (resourceId, startDate, endDate) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (resourceId) params.employeeId = resourceId;

    const response = await axios.get(`${TSM_BASE_URL}/api/dashboard/summary`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const getSkillCategoriesTree = async () => {
  const response = await axios.get(`${BASE_URL}/api/skill-categories/tree`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return response.data;
};

export const createRoleExpectation = async (payload) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/admin/role-expectations`,
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

export const updateRoleExpectation = async (roleId, payload) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/api/admin/role-expectations/${roleId}`,
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

export const getRoleExpectations = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/admin/role-expectations`,
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

export const deleteRoleExpectation = async (roleName) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/api/admin/role-expectations/${roleName}`,
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


export const getProficiencyLevels = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/proficiency/get-all-proficiency-levels`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response;
  } catch (err) {
    throw err;
  }
};

// ─── Skill Gap Analysis APIs ────────────────────────────────────────────────

export const fetchDemands = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/demand/rm/demands`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data.data; // Return the actual array
  } catch (err) {
    throw err;
  }
};

// export const fetchResources = async () => {
//   try {
//     const response = await axios.get(
//       `${BASE_URL}/api/availability/timeline/window`,
//       {
//         params: { page: 0, size: 500 },
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("token")}`,
//         },
//       }
//     );
//     return response.data.data; // Return the actual array
//   } catch (err) {
//     throw err;
//   }
// };

export const getSkillGapAnalysis = async (demandId, resourceId) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/matching/skill-gap-analysis`,
      { demandId, resourceId },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data.data; // Return the analysis object
  } catch (err) {
    throw err;
  }
};
