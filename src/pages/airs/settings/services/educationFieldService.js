// Settings -> Related education fields (/education-fields/relations, HR_ADMIN).
// Same conventions as aiProviderService.js.
import api from "@/api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const unwrap = (data) => data?.data ?? data ?? {};

// { relations: [...], fields: [...], role_domains: [...] }
export const getEducationFieldRelations = async () => {
  const response = await api.get(`${BASE_URL}/education-fields/relations`, { headers: authHeaders() });
  return unwrap(response.data);
};

export const addEducationFieldRelation = async (payload) => {
  const response = await api.post(`${BASE_URL}/education-fields/relations`, payload, { headers: authHeaders() });
  return unwrap(response.data);
};

export const removeEducationFieldRelation = async (relationId) => {
  await api.delete(`${BASE_URL}/education-fields/relations/${relationId}`, { headers: authHeaders() });
};
