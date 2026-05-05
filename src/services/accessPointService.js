// accessPointService.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: window.__APP_CONFIG__.USER_MANAGEMENT_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Add token before every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

const ACCESS_POINT_URL = "/admin/access-points/";

const UNMAPPED_ACCESS_POINTS_URL = `${ACCESS_POINT_URL}unmapped-access-points`;

export const listAccessPointsumapped = () =>
  axiosInstance.get(UNMAPPED_ACCESS_POINTS_URL);
export const listAccessPoints = () => axiosInstance.get(ACCESS_POINT_URL);
export const getAccessPoint = (id) =>
  axiosInstance.get(`${ACCESS_POINT_URL}${id}`);
export const createAccessPoint = (data) =>
  axiosInstance.post(ACCESS_POINT_URL, data);
export const updateAccessPoint = (id, data) =>
  axiosInstance.put(`${ACCESS_POINT_URL}${id}`, data);
export const deleteAccessPoint = (id) =>
  axiosInstance.delete(`${ACCESS_POINT_URL}${id}`);

// Module List API for dropdown
export const listModules = () =>
  axiosInstance.get(`${ACCESS_POINT_URL}modules`);

// Get unmapped permissions (permissions not assigned to any access point)
export const getUnmappedPermissions = () =>
  axiosInstance.get("/admin/permissions/");

// Assign permission to access point
export const assignPermissionToAccessPoint = (accessPointId, permissionId) =>
  axiosInstance.post(
    `${ACCESS_POINT_URL}${accessPointId}/map-permission/${permissionId}`,
  );

export const uploadBulkPermissionMappingFile = (formData) =>
  axiosInstance.post(
    `/admin/access-points/bulk-permission-mapping-upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );

export const mapPermissionBulkFile = (formData) =>
  axiosInstance.post(
    `/admin/access-points/access-point-map-permission-bulk`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );

// console.log(`${ACCESS_POINT_URL}${accessPointId}/map-permission/${permissionId}`);
