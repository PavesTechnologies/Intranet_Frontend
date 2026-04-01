import axios from "axios";

const BASE_URL = import.meta.env.VITE_RMS_BASE_URL;

export const getResources = async (projectId) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/role-off/get-resources/${projectId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getRoleOffProjectKPI = async (projectId) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/role-off/get-role-off-project-kpi/${projectId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});


// ✅ CREATE ROLE-OFF (PM)
export const createRoleOff = async (payload) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/role-off`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const bulkPlannedRoleOff = async (payload) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/role-off/bulk-planned`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const pmCancelRoleOff = async (id) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/role-off/${id}/pm-cancel`,
      null,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};


// ✅ GET ALL ROLE-OFFS
// export const getAllRoleOffs = async () => {
//   try {
//     const response = await axios.get(
//       `${BASE_URL}/api/role-off`,
//       {
//         headers: getAuthHeaders(),
//       }
//     );
//     return response.data;
//   } catch (error) {
//     throw error;
//   }
// };


// ✅ RM APPROVE / REJECT
export const rmApprove = async (id) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/role-off/${id}/rm-approve`,
      null,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const rmReject = async (id, rejectionReason) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/role-off/${id}/rm-reject`,
      null,
      {
        params: { rejectionReason },
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const bulkRmApprove = async (ids) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/role-off/bulk-rm-approve`,
      ids,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const bulkRmReject = async (ids, rejectionReason) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/role-off/bulk-rm-reject`,
      ids,
      {
        params: { rejectionReason },
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};


// ✅ DL ACTION (FULFILL / REJECT)
export const dlFulfill = async (id) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/role-off/${id}/dl-fulfill`,
      null,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const dlReject = async (id, rejectionReason) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/role-off/${id}/dl-reject`,
      null,
      {
        params: { rejectionReason },
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const bulkDlFulfill = async (ids) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/role-off/bulk-dl-fulfill`,
      ids,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const bulkDlReject = async (ids, rejectionReason) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/role-off/bulk-dl-reject`,
      ids,
      {
        params: { rejectionReason },
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllocations = async (projectId) => {
  const response = await axios.get(
    `${BASE_URL}/api/allocation/project/${projectId}`,
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
};

export const getRoleOffReasons = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/role-off/reasons`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};


export const getPendingRoleOffs = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/role-off/get-role-off-rm`,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getPendingRoleOffsForDM = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/role-off/get-role-off-dm`,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ✅ ROLE-OFF REPORTING & EXPORT
export const getFilteredRoleOffs = async (payload) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/reports/role-off/filtered`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const exportRoleOffsCsv = async (payload) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/reports/role-off/export/csv`, payload, {
      headers: getAuthHeaders(),
      responseType: 'blob', // Important: expect binary data
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

