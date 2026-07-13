// Service layer for the Skill Ontology module.
//
// HYBRID MODE: getSkills / getSkill / createSkill / updateSkill /
// updateSkillStatus / getCategories / searchParents / importSkills /
// exportSkills call the real backend (every GET/POST/PATCH endpoint provided
// so far). Everything else (aliases, similar-skill resolution, merge,
// hierarchy browsing, recent activity, usage breakdown, seeding) still
// operates against the in-memory/localStorage-backed mock dataset in
// mock/skillOntologyMockData.js, since no real endpoint exists for those yet.
//
// Real calls follow the same convention as src/pages/airs/service/campaignservice.js:
// same BASE_URL source, same inline Authorization header, same try/catch/throw shape.

import api from "../../../../api/axiosInstance";
import { loadMockSkills, persistMockSkills, buildActivityForSkill } from "../mock/skillOntologyMockData";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

const ok = (data) => ({ success: true, data });

// Maps the real API's snake_case / is_active-boolean shape into the exact
// camelCase shape every existing component already consumes, so no component
// needs to change. Fields the real API doesn't return yet (embeddingStatus,
// jdCount, candidateCount, campaignCount) get safe, non-fabricated defaults.
// "lastSeen" is fed from created_at, per spec, until the backend adds a real
// last_seen field.
const mapApiSkillToInternal = (raw) => ({
  id: raw.id,
  canonicalName: raw.canonical_name,
  category: raw.category,
  aliases: raw.aliases || [],
  confidence: raw.confidence,
  status: raw.is_active ? "ACTIVE" : "INACTIVE",
  occurrenceCount: raw.occurrence_count,
  createdAt: raw.created_at,
  lastSeen: raw.created_at,
  source: raw.source,
  parentSkillId: raw.parent_skill_id ?? null,
  parentSkillName: raw.parent_skill_name ?? null,
  children: (raw.children || []).map((c) => ({
    id: c.id,
    canonicalName: c.canonical_name || c.canonicalName,
    confidence: c.confidence,
  })),
  embeddingStatus: raw.embedding_status || "PENDING",
  jdCount: raw.jd_count ?? 0,
  candidateCount: raw.candidate_count ?? 0,
  campaignCount: raw.campaign_count ?? 0,
});

// ── Real endpoints ──────────────────────────────────────────────────────

// Accepts: page, page_size, search, category, confidence, is_active.
// Note: this module's Source filter dropdown has no server-side equivalent
// in the given API, so "source" is never sent — the dropdown stays in the UI
// per "don't change component structure" but doesn't currently narrow results.
export const getSkills = async (params = {}) => {
  try {
    const response = await api.get(`${BASE_URL}/skill-ontology`, {
      params: {
        page: params.page,
        page_size: params.page_size,
        search: params.search,
        category: params.category,
        confidence: params.confidence,
        is_active: params.is_active,
      },
      headers: authHeaders(),
    });
    const payload = response.data?.data || {};
    return ok({
      items: (payload.items || []).map(mapApiSkillToInternal),
      total: payload.total ?? 0,
    });
  } catch (error) {
    console.error("Error fetching skills:", error);
    throw error;
  }
};

export const getSkill = async (skillId) => {
  try {
    const response = await api.get(`${BASE_URL}/skill-ontology/${skillId}`, { headers: authHeaders() });
    return ok(mapApiSkillToInternal(response.data?.data || {}));
  } catch (error) {
    console.error("Error fetching skill:", error);
    throw error;
  }
};

export const createSkill = async (payload) => {
  try {
    const response = await api.post(
      `${BASE_URL}/skill-ontology`,
      {
        canonical_name: payload.canonical_name,
        category: payload.category,
        aliases: payload.aliases,
        parent_skill_id: payload.parent_skill_id || null,
        confidence: payload.confidence,
        is_active: payload.status ? payload.status === "ACTIVE" : true,
      },
      { headers: authHeaders() }
    );
    return ok(mapApiSkillToInternal(response.data?.data || {}));
  } catch (error) {
    console.error("Error creating skill:", error);
    throw error;
  }
};

export const updateSkill = async (skillId, payload) => {
  try {
    const response = await api.patch(
      `${BASE_URL}/skill-ontology/${skillId}`,
      {
        canonical_name: payload.canonical_name,
        category: payload.category,
        aliases: payload.aliases,
        parent_skill_id: payload.parent_skill_id || null,
        confidence: payload.confidence,
        is_active: payload.status ? payload.status === "ACTIVE" : undefined,
      },
      { headers: authHeaders() }
    );
    return ok(mapApiSkillToInternal(response.data?.data || {}));
  } catch (error) {
    console.error("Error updating skill:", error);
    throw error;
  }
};

// Dedicated status endpoint used by the Deactivate/Reactivate confirmations —
// separate from the generic updateSkill PATCH above.
export const updateSkillStatus = async (skillId, isActive) => {
  try {
    const response = await api.patch(
      `${BASE_URL}/skill-ontology/${skillId}/status`,
      { is_active: isActive },
      { headers: authHeaders() }
    );
    return ok(response.data?.data || { id: skillId, is_active: isActive });
  } catch (error) {
    console.error("Error updating skill status:", error);
    throw error;
  }
};

export const getCategories = async () => {
  try {
    const response = await api.get(`${BASE_URL}/skill-ontology/categories`, { headers: authHeaders() });
    const items = response.data?.data || [];
    return ok([...items].sort((a, b) => a.category.localeCompare(b.category)));
  } catch (error) {
    console.error("Error fetching skill categories:", error);
    throw error;
  }
};

// Parent-skill autocomplete. Caller is responsible for the "search after 2
// characters" gate and the 500ms debounce (see components/SkillForm.jsx).
export const searchParents = async (query) => {
  try {
    const response = await api.get(`${BASE_URL}/skill-ontology/parents`, {
      params: { search: query },
      headers: authHeaders(),
    });
    const items = response.data?.data || [];
    return ok(items.map((p) => ({ id: p.id, canonicalName: p.canonical_name })));
  } catch (error) {
    console.error("Error searching parent skills:", error);
    throw error;
  }
};

export const importSkills = async (file, onUploadProgress) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`${BASE_URL}/skill-ontology/import`, formData, {
      headers: authHeaders(),
      onUploadProgress: (evt) => {
        if (onUploadProgress && evt.total) onUploadProgress(Math.round((evt.loaded * 100) / evt.total));
      },
    });
    return ok(response.data?.data || response.data || {});
  } catch (error) {
    console.error("Error importing skills:", error);
    throw error;
  }
};

export const exportSkills = async (params = {}) => {
  try {
    const response = await api.get(`${BASE_URL}/skill-ontology/export`, {
      params: {
        search: params.search,
        category: params.category,
        confidence: params.confidence,
        is_active: params.is_active,
      },
      headers: authHeaders(),
      responseType: "blob",
    });
    return response;
  } catch (error) {
    console.error("Error exporting skills:", error);
    throw error;
  }
};

// ── Still mock (no real endpoint provided yet) ──────────────────────────

const withChildCount = (skill, allSkills) => ({
  ...skill,
  childCount: allSkills.filter((s) => s.parentSkillId === skill.id).length,
});

export const seedOntology = async () => {
  await delay();
  localStorage.removeItem("airs_skill_ontology_mock_v1");
  const skills = loadMockSkills();
  return ok({ count: skills.length });
};

export const addAlias = async (skillId, alias) => {
  await delay();
  const all = loadMockSkills();
  persistMockSkills(
    all.map((s) => (s.id === skillId && !s.aliases.includes(alias) ? { ...s, aliases: [...s.aliases, alias] } : s))
  );
  return ok({ id: skillId, alias });
};

export const removeAlias = async (skillId, aliasId) => {
  await delay();
  const all = loadMockSkills();
  persistMockSkills(all.map((s) => (s.id === skillId ? { ...s, aliases: s.aliases.filter((a) => a !== aliasId) } : s)));
  return ok({ id: skillId });
};

export const getSkillActivity = async (skillId) => {
  await delay();
  const all = loadMockSkills();
  const skill = all.find((s) => s.id === skillId);
  if (!skill) return ok({ events: [] });
  return ok({ events: buildActivityForSkill(skill) });
};

export const getSimilarSkills = async (skillId) => {
  await delay();
  const all = loadMockSkills();
  const skill = all.find((s) => s.id === skillId);
  if (!skill) return ok([]);
  const candidates = all.filter((s) => s.id !== skillId && s.category === skill.category).slice(0, 3);
  return ok(candidates.map((c, i) => ({ ...c, similarity: 0.92 - i * 0.12 })));
};

export const mergeSkills = async (sourceSkillId, targetSkillId) => {
  await delay();
  const all = loadMockSkills();
  const source = all.find((s) => s.id === sourceSkillId);
  const updated = all
    .filter((s) => s.id !== sourceSkillId)
    .map((s) =>
      s.id === targetSkillId && source
        ? { ...s, aliases: [...new Set([...s.aliases, source.canonicalName, ...source.aliases])] }
        : s
    );
  persistMockSkills(updated);
  return ok({ mergedInto: targetSkillId });
};

export const addAsAlias = async (sourceSkillId, ofSkillId) => {
  await delay();
  const all = loadMockSkills();
  const source = all.find((s) => s.id === sourceSkillId);
  const updated = all
    .filter((s) => s.id !== sourceSkillId)
    .map((s) => (s.id === ofSkillId && source ? { ...s, aliases: [...new Set([...s.aliases, source.canonicalName])] } : s));
  persistMockSkills(updated);
  return ok({ addedTo: ofSkillId });
};

// parentId omitted/null → root-level nodes (lazy-loading tree).
export const getHierarchy = async (parentId) => {
  await delay();
  const all = loadMockSkills();
  const nodes = all.filter((s) => (parentId ? s.parentSkillId === parentId : !s.parentSkillId));
  return ok({ items: nodes.map((n) => withChildCount(n, all)) });
};

export const getSkillUsage = async (skillId) => {
  await delay();
  const all = loadMockSkills();
  const skill = all.find((s) => s.id === skillId);
  if (!skill) throw new Error("Skill not found");
  const childSkillCount = all.filter((s) => s.parentSkillId === skillId).length;
  return ok({
    jdCount: skill.jdCount,
    candidateCount: skill.candidateCount,
    campaignCount: skill.campaignCount,
    childSkillCount,
  });
};
