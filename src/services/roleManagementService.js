import api from "../api/axiosInstance";

const axiosInstance = api;

const ROLE_URL = "/admin/roles";

// Basic Role Management APIs
export const listRoles = () => axiosInstance.get(ROLE_URL);
export const getRole = (id) => axiosInstance.get(`${ROLE_URL}/${id}`);
export const createRole = (roleData) => axiosInstance.post(ROLE_URL, roleData);
export const updateRole = (id, roleData) =>
  axiosInstance.put(`${ROLE_URL}/${id}`, roleData);
export const deleteRole = (id) => axiosInstance.delete(`${ROLE_URL}/${id}`);

// Permission Group Management APIs
export const getPermissionsByRole = (roleId) =>
  axiosInstance.get(`${ROLE_URL}/uuid/${roleId}/permissions`);
export const getPermissionGroupsByRole = (roleId) =>
  axiosInstance.get(`${ROLE_URL}/uuid/${roleId}/groups`);
export const getAvailablePermissionGroupsForRole = (roleId) =>
  axiosInstance.get(`${ROLE_URL}/${roleId}/available-groups`);

export const updatePermissionGroupsForRole = (roleId, groupIds) =>
  axiosInstance.put(`${ROLE_URL}/${roleId}/groups`, { group_ids: groupIds });
export const addPermissionGroupsToRole = (roleId, groupIds) =>
  axiosInstance.post(`${ROLE_URL}/uuid/${roleId}/groups`, {
    group_uuids: groupIds,
  });
export const removePermissionGroupFromRole = (roleId, groupId) =>
  axiosInstance.delete(`${ROLE_URL}/${roleId}/groups/${groupId}`);

// Access Point Management APIs
export const getAccessPointsByRole = (roleId) =>
  axiosInstance.get(`${ROLE_URL}/${roleId}/access-points`);
export const getAvailableAccessPointsForRole = (roleId) =>
  axiosInstance.get(`${ROLE_URL}/${roleId}/access-points/available`);
export const mapAccessPointToRole = (roleId, accessId) =>
  axiosInstance.post(`${ROLE_URL}/${roleId}/access-points/${accessId}`);
export const removeAccessPointFromRole = (roleId, accessId) =>
  axiosInstance.delete(`${ROLE_URL}/${roleId}/access-points/${accessId}`);
// export const getAllAccessPoints = () =>
//   axiosInstance.get(`${ROLE_URL}/access-points/all`);
export const removePermissionGroupsFromRole = (roleId, groupIds) => {
  axiosInstance.post(`${ROLE_URL}/uuid/${roleId}/groups/remove`, {
    group_uuids: groupIds,
  });
};
