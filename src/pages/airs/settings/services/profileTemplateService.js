// Settings -> JD profile templates (/jd-profile-templates, HR_ADMIN).
// Same conventions as educationFieldService.js.
import api from "@/api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const unwrap = (data) => data?.data ?? data ?? {};

// { templates: [...], evidence_section_options: [...], required_evidence_sections: [...] }
export const getProfileTemplates = async () => {
  const response = await api.get(`${BASE_URL}/jd-profile-templates`, { headers: authHeaders() });
  return unwrap(response.data);
};

// -> { template, changed, candidates_marked_out_of_date }
export const updateProfileTemplate = async (key, payload) => {
  const response = await api.put(`${BASE_URL}/jd-profile-templates/${key}`, payload, { headers: authHeaders() });
  return unwrap(response.data);
};
