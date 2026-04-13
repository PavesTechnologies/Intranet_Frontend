import axios from "axios";

const BASE_URL = import.meta.env.VITE_RMS_BASE_URL;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Fetches resources currently on bench
 */
export const getBenchResources = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/bench/bench-resources`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch bench resources", error);
    throw error;
  }
};

/**
 * Fetches resources in the internal pool
 */
export const getPoolResources = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/bench/pool-resources`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch pool resources", error);
    throw error;
  }
};

/**
 * Common fetcher to get all resource supply (Bench + Pool)
 */
export const getAllResources = async () => {
  try {
    const [benchResponse, poolResponse] = await Promise.all([
      getBenchResources(),
      getPoolResources()
    ]);

    // Handle standard response wrapper if present (success/data)
    const benchData = benchResponse?.data || (Array.isArray(benchResponse) ? benchResponse : []);
    const poolData = poolResponse?.data || (Array.isArray(poolResponse) ? poolResponse : []);

    return {
      success: true,
      data: [...benchData, ...poolData]
    };
  } catch (error) {
    console.error("Failed to fetch consolidated resources", error);
    throw error;
  }
};

/**
 * Fetches KPI metrics for the bench dashboard
 */
export const getBenchKPIs = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/bench/kpi`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch bench KPI data", error);
    throw error;
  }
};

export const updateStatusResource = async (payload) => {
  try {
    const response = await axios.put(`${BASE_URL}/api/bench/update-resource-state`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Failed to update resource status", error);
    throw error;
  }
};
/**
 * Fetches demand matches and scores for a specific benched resource
 */
export const getBenchMatches = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/bench/matches`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch bench demand matches", error);
    throw error;
  }
};

/**
 * Fetches all open/approved demands available for quick allocation
 */
export const getOpenDemands = async () => {
  try {
    // Using /api/demand/rm/demands as generic /api/demand/* paths are being intercepted by UUID routers
    const response = await axios.get(`${BASE_URL}/api/demand/rm/demands`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch demands from role-scoped endpoint", error);
    throw error;
  }
};

/**
 * Performs a quick allocation for a benched resource to a specific demand
 * Uses application/x-www-form-urlencoded as per backend requirement
 */
export const quickAllocate = async (resourceId, demandId, allocationPercentage = 100) => {
  try {
    const params = new URLSearchParams();
    params.set("resourceId", resourceId);
    params.set("demandId", demandId);
    params.set("allocationPercentage", String(allocationPercentage));

    const response = await axios.post(`${BASE_URL}/api/bench/quick-allocate`, params, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Quick allocation failed", error);
    throw error;
  }
};

/**
 * Fetches the bench pool report for reporting and dashboards
 */
export const getBenchPoolReport = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/reports/bench-pool`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch bench pool report", error);
    throw error;
  }
};

/**
 * Exports the bench pool report as a CSV/Blob file
 */
export const exportBenchPoolReport = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/reports/bench-pool/export`, {
      headers: getAuthHeaders(),
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    console.error("Failed to export bench pool report", error);
    throw error;
  }
};
