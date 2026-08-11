import api from "../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// âœ… CREATE ASSET CATEGORY
export const createAssetCategory = async (payload) => {
    console.log("Calling Create API", payload);
  try {
    const response = await api.post(
      `${BASE_URL}/api/asset-categories`,
      payload,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… UPDATE ASSET CATEGORY
export const updateAssetCategory = async (categoryId, payload) => {
  try {
    const response = await api.put(
      `${BASE_URL}/api/asset-categories/${categoryId}`,
      payload,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… DELETE ASSET CATEGORY
export const deleteAssetCategory = async (categoryId) => {
  try {
    const response = await api.delete(
      `${BASE_URL}/api/asset-categories/${categoryId}`,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… GET ASSET CATEGORY BY ID
export const getAssetCategoryById = async (categoryId) => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/asset-categories/${categoryId}`,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… GET ALL ASSET CATEGORIES
export const getAllAssetCategories = async () => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/asset-categories`,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… GET ACTIVE ASSET CATEGORIES
export const getActiveAssetCategories = async () => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/asset-categories/active`,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… ENABLE / DISABLE ASSET CATEGORY
export const toggleAssetCategoryStatus = async (
  categoryId,
  activeFlag,
) => {
  try {
    const response = await api.patch(
      `${BASE_URL}/api/asset-categories/${categoryId}/status`,
      activeFlag,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… SEARCH ASSET CATEGORIES (PAGINATION)
export const searchAssetCategories = async ({
  page = 0,
  size = 10,
  sortBy = "displayOrder",
  sortDirection = "ASC",
  categoryCode = "",
  categoryName = "",
  search = "",
}) => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/asset-categories/search`,
      {
        params: {
          page,
          size,
          sortBy,
          sortDirection,
          categoryCode,
          categoryName,
          search,
        },
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… CREATE ASSET TYPE
export const createAssetType = async (payload) => {
  try {
    const response = await api.post(
      `${BASE_URL}/api/asset-types`,
      payload,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… UPDATE ASSET TYPE
export const updateAssetType = async (typeId, payload) => {
  try {
    const response = await api.put(
      `${BASE_URL}/api/asset-types/${typeId}`,
      payload,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… DELETE ASSET TYPE
export const deleteAssetType = async (typeId) => {
  try {
    const response = await api.delete(
      `${BASE_URL}/api/asset-types/${typeId}`,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… GET ASSET TYPE BY ID
export const getAssetTypeById = async (typeId) => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/asset-types/${typeId}`,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… GET ALL ASSET TYPES
export const getAllAssetTypes = async () => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/asset-types`,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… GET ACTIVE ASSET TYPES
export const getActiveAssetTypes = async () => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/asset-types/active`,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… ENABLE / DISABLE ASSET TYPE
export const toggleAssetTypeStatus = async (
  typeId,
  activeFlag,
) => {
  try {
    const response = await api.patch(
      `${BASE_URL}/api/asset-types/${typeId}/status`,
      activeFlag,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// âœ… SEARCH ASSET TYPES (PAGINATION)
export const searchAssetTypes = async ({
  page = 0,
  size = 10,
  sortBy = "displayOrder",
  sortDirection = "ASC",
  search = "",
  categoryId = "",
}) => {
  try {
    const response = await api.get(
      `${BASE_URL}/api/asset-types/search`,
      {
        params: {
          page,
          size,
          sortBy,
          sortDirection,
          search,
          categoryId,
        },
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// CREATE ASSET
export const createAsset = async (payload) => {
  try {
    const response = await api.post(`${BASE_URL}/api/assets`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// UPDATE ASSET
export const updateAsset = async (assetId, payload) => {
  try {
    const response = await api.put(`${BASE_URL}/api/assets/${assetId}`, payload, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// GET ASSET BY ID
export const getAssetById = async (assetId) => {
  try {
    const response = await api.get(`${BASE_URL}/api/assets/${assetId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// GET ALL ASSETS
export const getAllAssets = async ({
  page = 0,
  size = 10,
  sortBy = "assetName",
  sortDirection = "asc",
} = {}) => {
  try {
    const response = await api.get(`${BASE_URL}/api/assets`, {
      params: { page, size, sortBy, sortDirection },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// GET ACTIVE ASSETS
export const getActiveAssets = async () => {
  try {
    const response = await api.get(`${BASE_URL}/api/assets/active`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// DELETE ASSET
export const deleteAsset = async (assetId) => {
  try {
    const response = await api.delete(`${BASE_URL}/api/assets/${assetId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// UPDATE ASSET LIFECYCLE STATUS
export const updateAssetStatus = async (assetId, status) => {
  try {
    const response = await api.patch(
      `${BASE_URL}/api/assets/${assetId}/status`,
      status,
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ENABLE / DISABLE ASSET
export const toggleAssetActive = async (assetId, activeFlag) => {
  try {
    const response = await api.patch(
      `${BASE_URL}/api/assets/${assetId}/active`,
      activeFlag,
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// SEARCH ASSETS
export const searchAssets = async ({
  page = 0,
  size = 10,
  sortBy = "assetName",
  sortDirection = "asc",
  assetCode = "",
  assetName = "",
  categoryId = "",
  typeId = "",
  status = "",
  active,
  search = "",
} = {}) => {
  try {
    const params = {
      page,
      size,
      sortBy,
      sortDirection,
      assetCode,
      assetName,
      categoryId,
      typeId,
      status,
      search,
    };

    if (typeof active === "boolean") {
      params.active = active;
      params.activeFlag = active;
    }

    const response = await api.get(`${BASE_URL}/api/assets/search`, {
      params,
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const normalizePagedResponse = (response = {}) => {
  const payload = Array.isArray(response)
    ? response
    : response?.data ?? response;

  if (Array.isArray(payload)) {
    return {
      records: payload,
      totalElements: payload.length,
      totalPages: 1,
    };
  }

  return {
    records: payload?.records ?? payload?.content ?? [],
    totalElements:
      payload?.totalElements ?? payload?.totalRecords ?? payload?.totalCount ?? 0,
    totalPages:
      payload?.totalPages ??
      (payload?.size
        ? Math.ceil((payload?.totalElements ?? payload?.records?.length ?? 0) / payload.size)
        : 1),
  };
};

export const assetCategoryApi = {
  create: createAssetCategory,
  update: updateAssetCategory,
  delete: deleteAssetCategory,
  getById: getAssetCategoryById,
  getAll: getAllAssetCategories,
  getActive: getActiveAssetCategories,
  setActive: toggleAssetCategoryStatus,
  search: searchAssetCategories,
};

export const assetTypeApi = {
  create: createAssetType,
  update: updateAssetType,
  delete: deleteAssetType,
  getById: getAssetTypeById,
  getAll: getAllAssetTypes,
  getActive: getActiveAssetTypes,
  setActive: toggleAssetTypeStatus,
  search: searchAssetTypes,
};
export const assetInventoryApi = {
  create: createAsset,
  update: updateAsset,
  getById: getAssetById,
  getAll: getAllAssets,
  getActive: getActiveAssets,
  delete: deleteAsset,
  updateStatus: updateAssetStatus,
  toggleActive: toggleAssetActive,
  search: searchAssets,
};
