import axios from "axios";

const RMS_BASE_URL = window.__APP_CONFIG__?.RMS_BASE_URL;

/**
 * Fetches High-Level KPI data for the Admin Dashboard
 * URL: /api/client/get-admin-kpi
 */
export const getAdminKPI = async () => {
  try {
    const response = await axios.get(
      `${RMS_BASE_URL}/api/client/get-admin-kpi`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    });
    return response.data;
  } catch (error) {
    console.error("KPI Fetch Error:", error);
    throw error;
  }
};

// ../services/clientservice.js

// ... existing imports

export const getClientPageData = async (clientId) => {
  // Assuming you have an axios instance or fetch wrapper
  // const response = await axios.get(`api/client/${clientId}/page-data`);
  // return response.data;

  // Mocking the call based on your request for now:
  // return fetch(`/api/client/${clientId}/page-data`).then(res => res.json());
  try {
    const response = await axios.get(
      `${RMS_BASE_URL}/api/client/${clientId}/page-data`,
      {headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },}
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const searchClients = async (filters, page = 0, size = 10) => {
  try {
    const response = await axios.get(`${RMS_BASE_URL}/api/client/search`, {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
      params: {
        // Mapping Frontend Filter state -> Backend ClientFilterDTO
        clientName: filters.search,
        countryName: filters.region,
        clientType: filters.type,
        priorityLevel: filters.priority,
        status: filters.status,
        createdFrom: filters.startDate,
        createdTo: filters.endDate,
        // Pagination
        page: page,
        size: size,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createClient = async (clientData) => {
  try {
    const response = await axios.post(
      `${RMS_BASE_URL}/api/client/create`,
      clientData,
      {headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },}
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getClients = async () => {
  try {
    const response = await axios.get(
      `${RMS_BASE_URL}/api/client/get-all-clients`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getClientById = async (clientId) => {
  try {
    const response = await axios.get(`${RMS_BASE_URL}/api/client/${clientId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createClientSLA = async (slaData) => {
  try {
    const response = await axios.post(
      `${RMS_BASE_URL}/api/client-sla/create`,
      slaData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateClientSLA = async (slaData) => {
  try {
    const response = await axios.put(
      `${RMS_BASE_URL}/api/client-sla/update`,
      slaData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteClientSLA = async (slaId) => {
  try {
    const response = await axios.delete(
      `${RMS_BASE_URL}/api/client-sla/delete/${slaId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getClientSLA = async (clientId) => {
  try {
    const response = await axios.get(
      `${RMS_BASE_URL}/api/client-sla/clientSLA/${clientId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createClientCompliance = async (complianceData) => {
  try {
    const response = await axios.post(
      `${RMS_BASE_URL}/api/client-compliance/create`,
      complianceData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateClientCompliance = async (complianceData) => {
  try {
    const response = await axios.put(
      `${RMS_BASE_URL}/api/client-compliance/update`,
      complianceData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteClientCompliance = async (complianceId) => {
  try {
    const response = await axios.delete(
      `${RMS_BASE_URL}/api/client-compliance/delete/${complianceId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getClientCompliance = async (clientId) => {
  try {
    const responce = await axios.get(
      `${RMS_BASE_URL}/api/client-compliance/clientCompliance/${clientId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return responce.data;
  } catch (error) {
    throw error;
  }
};

export const createClientEscalation = async (escalationData) => {
  try {
    const response = await axios.post(
      `${RMS_BASE_URL}/api/client-contact/create`,
      escalationData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateClientContact = async (complianceData) => {
  try {
    const response = await axios.put(
      `${RMS_BASE_URL}/api/client-contact/update`,
      complianceData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteClientContact = async (contactId) => {
  try {
    const response = await axios.delete(
      `${RMS_BASE_URL}/api/client-contact/delete/${contactId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getClientEscalation = async (clientId) => {
  try {
    const responce = await axios.get(
      `${RMS_BASE_URL}/api/client-contact/clientContact/${clientId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return responce.data;
  } catch (error) {
    throw error;
  }
};

export const createClientAsset = async (assetData, clientId) => {
  try {
    const response = await axios.post(
      `${RMS_BASE_URL}/api/client-assets/clients/${clientId}/assets`,
      assetData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/* ===============================
   UPDATE CLIENT ASSET
   =============================== */
export const updateClientAsset = async (assetId, assetData) => {
  try {
    const response = await axios.put(
      `${RMS_BASE_URL}/api/client-assets/${assetId}`,
      assetData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/* ===============================
   DELETE (SOFT DELETE) CLIENT ASSET
   =============================== */
export const deleteClientAsset = async (assetId) => {
  try {
    const response = await axios.delete(
      `${RMS_BASE_URL}/api/client-assets/${assetId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/* ===============================
   GET ASSETS BY CLIENT ID
   =============================== */
export const getAssetsByClient = async (clientId) => {
  try {
    const response = await axios.get(
      `${RMS_BASE_URL}/api/client-assets/client/${clientId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
// export const getAssetById = async (assetId) => {
//   try {
//     const response = await axios.get(
//       `${RMS_BASE_URL}/api/client-assets/${assetId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("token")}`,
//         },
//       }
//     );
//     return response.data;
//   } catch (error) {
//     throw error;
//   }
// };
/* ===============================
   GET ASSET BY ID
   =============================== */
export const getClientAssetAssignments = async (assetId) => {
  try {
    // 1. Ensure this URL matches your @GetMapping in Java EXACTLY
    // 2. Double check if your backend expects /api/client-assets/54
    //    or perhaps /api/assets/54
    const response = await axios.get(
      `${RMS_BASE_URL}/api/client-asset-assignments/by-asset/${assetId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Fetch Asset Error:", error);
    throw error;
  }
};

export const getAssetById = async (assetId) => {
  try {
    const response = await axios.get(
      `${RMS_BASE_URL}/api/client-assets/${assetId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Fetch Asset Error:", error);
    throw error;
  }
};

/* ===============================
   ASSIGN ASSET TO RESOURCE
   =============================== */
export const assignClientAsset = async (assignmentData) => {
  try {
    const id =
      assignmentData.asset?.assetId ||
      assignmentData.assetId;

    const response = await axios.post(
      `${RMS_BASE_URL}/api/client-asset-assignments/${id}`,
      assignmentData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Asset Assignment Error:", error);
    throw error;
  }
};
export const updateClient = async (clientData) => {
  try {
    const response = await axios.put(
      `${RMS_BASE_URL}/api/client/update-client`,
      clientData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update client with status change
 */
export const updateClientStatus = async (clientId, clientData) => {
  try {
    const response = await axios.put(
      `${RMS_BASE_URL}/api/client/update-client`,
      {
        clientId: clientId,
        ...clientData,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error("Error updating client status:", error);
    throw error;
  }
};

export const assignUpdateClientAsset = async (assignmentId, assignmentData) => {
  try {
    const response = await axios.put(
      `${RMS_BASE_URL}/api/client-asset-assignments/${assignmentId}`,
      assignmentData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Update Assignment Error:", error);
    throw error;
  }
};

export const returnAssetAssignment = async (
  assignmentId,
  actualReturnDate,
  remarks,
) => {
  try {
    const response = await axios.put(
      `${RMS_BASE_URL}/api/client-asset-assignments/return/${assignmentId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
          actualReturnDate: actualReturnDate,
          remarks: remarks,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAssignmentKPI = async (assetId) => {
  try {
    const response = await axios.get(
      `${RMS_BASE_URL}/api/client-asset-assignments/kpi/${assetId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteClient = async (clientId) => {
  try {
    const response = await axios.delete(
      `${RMS_BASE_URL}/api/client/delete-client/${clientId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/* ===============================
   DELETE CLIENT ASSET ASSIGNMENT
   =============================== */
export const deleteClientAssignment = async (assignmentId) => {
  try {
    const response = await axios.delete(
      `${RMS_BASE_URL}/api/client-asset-assignments/${assignmentId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Delete Assignment Error:", error);
    throw error;
  }
};

export const getAssetDashboard = async () => {
  const res = await axios.get(
    `${RMS_BASE_URL}/api/client-assets/dashboard`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );
  return res.data;
};

export const getAssetDashboardByClient = async (clientId) => {
  try {
    const response = await axios.get(
      `${RMS_BASE_URL}/api/client-assets/dashboard/client/${clientId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data.data;
  } catch (error) {
    console.error("Client KPI Fetch Error:", error);
    throw error;
  }
};
/* ===============================
   GET OVERLAPPING PROJECTS
   =============================== */
export const getProjectOverlaps = async (projectId) => {
  try {
    const response = await axios.get(
      `${RMS_BASE_URL}/api/projects/${projectId}/overlaps`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Fetch Overlapping Projects Error:", error);
    throw error;
  }
};

export const getProjectsByClient = async (clientId) => {
  const res = await axios.get(
    `${RMS_BASE_URL}/api/projects/get-project-by-client-id/${clientId}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );

  return res.data; // { success, message, data: [...] }
};

export const getProjectSLA = async (projectId) => {
  const res = await axios.get(
    `${RMS_BASE_URL}/api/project-sla/project/${projectId}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );
  return res.data;
};

export const getProjectCompliance = async (projectId) => {
  const res = await axios.get(
    `${RMS_BASE_URL}/api/project-compliance/project/${projectId}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );
  return res.data;
};

export const getProjectEscalations = async (projectId) => {
  const res = await axios.get(
    `${RMS_BASE_URL}/api/projects/${projectId}/escalations`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );
  return res.data;
};
//GET ASSETS BY PROJECT ID
export const getAssetsByProjectId = async (projectId) => {
  const res = await axios.get(
    `${RMS_BASE_URL}/api/client-asset-assignments/project/${projectId}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );

  return res.data;
};

export const getSkills = async () => {
  try {
    const response = await axios.get(`${RMS_BASE_URL}/api/skills/active`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getCertificates = async () => {
  try {
    const response = await axios.get(`${RMS_BASE_URL}/api/certificates`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/* ===============================
   GET AVAILABLE SERIAL NUMBERS BY ASSET ID
   =============================== */
export const getAvailableSerialsByAssetId = async (assetId) => {
  try {
    const response = await axios.get(
      `${RMS_BASE_URL}/api/client-assets/${assetId}/available-serials`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data; // [{ serialNumber, status }]
  } catch (error) {
    console.error("Fetch Available Serials Error:", error);
    throw error;
  }
};

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * ===============================
 * CREATE Company Escalation Contact
 * POST /api/company-contact/create
 * ===============================
 */
export const createCompanyContact = async (companyContactData) => {
  try {
    const response = await axios.post(
      `${RMS_BASE_URL}/api/company-contact/create`,
      companyContactData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ===============================
 * GET Company Escalation Contacts by Company ID
 * GET /api/company-contact/companyContact/{companyId}
 * ===============================
 */
export const getCompanyContactsByCompanyId = async () => {
  try {
    const response = await axios.get(
      `${RMS_BASE_URL}/api/company-contact/all`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ===============================
 * UPDATE Company Escalation Contact
 * PUT /api/company-contact/update
 * ===============================
 */
export const updateCompanyContact = async (companyContactData) => {
  try {
    const response = await axios.put(
      `${RMS_BASE_URL}/api/company-contact/update/${companyContactData.contactId}`,
      companyContactData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ===============================
 * DELETE Company Escalation Contact
 * DELETE /api/company-contact/delete/{id}
 * ===============================
 */
export const deleteCompanyContact = async (contactId) => {
  try {
    const response = await axios.delete(
      `${RMS_BASE_URL}/api/company-contact/delete/${contactId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
