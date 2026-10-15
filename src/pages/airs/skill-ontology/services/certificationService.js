// Skill Ontology -> Certifications (/certifications, HR_ADMIN): a certification
// and its name variants map to catalogue skills (Phase 3 Step 5, scoring v2).
import api from "@/api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const unwrap = (data) => data?.data ?? data ?? [];

export const getCertifications = async () => {
  const response = await api.get(`${BASE_URL}/certifications`, { headers: authHeaders() });
  return unwrap(response.data);
};

// [{ canonical_skill_id, skill, senses: [{ sense_key, label }] }] - ambiguous skills only.
export const getSkillMeanings = async () => {
  const response = await api.get(`${BASE_URL}/certifications/meanings`, { headers: authHeaders() });
  return unwrap(response.data);
};

export const addCertification = async ({ name, nameVariants, note }) => {
  const response = await api.post(`${BASE_URL}/certifications`,
    { name, name_variants: nameVariants, note: note || null }, { headers: authHeaders() });
  return unwrap(response.data);
};

export const removeCertification = async (certificationId) => {
  await api.delete(`${BASE_URL}/certifications/${certificationId}`, { headers: authHeaders() });
};

export const addCertificationSkill = async (certificationId, canonicalSkillId, senseKey) => {
  await api.post(`${BASE_URL}/certifications/${certificationId}/skills`,
    { canonical_skill_id: canonicalSkillId, sense_key: senseKey || null }, { headers: authHeaders() });
};

export const removeCertificationSkill = async (certificationId, canonicalSkillId) => {
  await api.delete(`${BASE_URL}/certifications/${certificationId}/skills/${canonicalSkillId}`,
    { headers: authHeaders() });
};
