// Service layer for the Skill Ontology module. Every call here hits the real
// backend — same convention as src/pages/airs/service/campaignservice.js:
// same BASE_URL source, same inline Authorization header, same
// try/catch/throw shape.

import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const ok = (data) => ({ success: true, data });

// In-flight request de-duplication, keyed per-call-shape (the "query key").
// getSkills and getCategories never share a key — categories always uses the
// fixed key "categories", skills is keyed by its own serialized filter params
// — so two unrelated requests can never collide or overwrite one another,
// while two *identical* concurrent calls (e.g. the list page's own fetch and
// a form mounting at the same moment) share a single network request instead
// of firing twice.
const inFlightRequests = new Map();

const dedupedRequest = (key, factory) => {
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);
  const promise = factory().finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, promise);
  return promise;
};

// Maps a hierarchy/children node into the shape HierarchyTree.jsx expects.
// Field names are defensive (child_count/children_count/has_children) since
// the exact response shape wasn't specified beyond "same envelope as other
// skill-ontology endpoints".
const mapHierarchyNode = (raw) => ({
  id: raw.id,
  canonicalName: raw.canonical_name || raw.canonicalName,
  confidence: raw.confidence,
  status: raw.is_active !== undefined ? (raw.is_active ? "ACTIVE" : "INACTIVE") : raw.status,
  childCount: raw.child_count ?? raw.children_count ?? 0,
  hasChildren: raw.has_children ?? (raw.child_count ?? raw.children_count ?? 0) > 0,
});

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

// Raw/unrecognized skill mentions — a distinct resource from canonical
// skills (note the different path: /skills/unknown, not /skill-ontology).
// Field names are defensive since the exact response shape wasn't specified.
const mapUnknownSkill = (raw) => ({
  id: raw.id,
  rawSkill: raw.raw_skill ?? raw.rawSkill ?? raw.raw_text ?? "",
  normalizedKey: raw.normalized_key ?? raw.normalizedKey ?? "",
  frequency: raw.frequency ?? raw.occurrence_count ?? raw.count ?? 0,
  firstSeen: raw.first_seen ?? raw.firstSeen ?? null,
  lastSeen: raw.last_seen ?? raw.lastSeen ?? null,
  status: raw.status ?? "PENDING",
});

export const getUnknownSkills = async (params = {}) => {
  const url = `${BASE_URL}/skills/unknown`;
  const query = { page: params.page, page_size: params.page_size, search: params.search };
  // Own query-key prefix ("GET .../skills/unknown ...") — never collides with
  // getSkills' ("GET .../skill-ontology ...") or getCategories' ("categories")
  // keys, so the two tabs' in-flight requests can never be mistaken for one another.
  const key = `GET ${url} ${JSON.stringify(query)}`;

  return dedupedRequest(key, async () => {
    try {
      console.log("[skillOntologyService] GET", url, query);
      const response = await api.get(url, { params: query, headers: authHeaders() });
      const payload = response.data?.data || {};
      const items = payload.items || (Array.isArray(payload) ? payload : []);
      return ok({
        items: items.map(mapUnknownSkill),
        total: payload.total ?? items.length,
      });
    } catch (error) {
      console.error("Error fetching unknown skills:", error);
      throw error;
    }
  });
};

// Accepts: page, page_size, search, category, confidence, is_active.
// Note: this module's Source filter dropdown has no server-side equivalent
// in the given API, so "source" is never sent — the dropdown stays in the UI
// per "don't change component structure" but doesn't currently narrow results.
// Unknown Skill Suggestions (HR_ADMIN verification workflow) — four
// independent match-suggestion feeds for one raw/unknown skill. Each tab is
// fetched lazily and cached by useUnknownSkillSuggestions, so this layer only
// owns the network call + response mapping, keyed per suggestion type so the
// four tabs' in-flight requests/dedup keys never collide with one another.
const SUGGESTION_ENDPOINT_BY_TYPE = {
  rapidfuzz_canonical: "rapidfuzz-canonical",
  semantic_canonical: "semantic-canonical",
  rapidfuzz_alias: "rapidfuzz-alias",
  semantic_alias: "semantic-alias",
};

const isAliasSuggestionType = (type) => type === "rapidfuzz_alias" || type === "semantic_alias";

// Field names are defensive (snake_case/camelCase) since the exact response
// shape wasn't specified beyond "same envelope as other skill-ontology
// endpoints". Values are surfaced exactly as returned — no re-sorting or
// re-scoring here.
const mapSuggestion = (raw, isAlias) => ({
  skillId: raw.skill_id ?? raw.id ?? raw.canonical_skill_id ?? raw.canonicalSkillId ?? "",
  skillName: raw.skill_name ?? raw.skillName ?? raw.canonical_name ?? raw.canonicalName ?? "",
  ...(isAlias ? { alias: raw.matched_alias ?? raw.alias ?? raw.matchedAlias ?? "" } : {}),
  similarity: raw.similarity ?? raw.similarity_score ?? raw.similarityScore ?? raw.score ?? 0,
});

// params.limit / params.threshold are optional — omitted entirely when not
// provided so the backend applies its own default configuration.
// HR_ADMIN-only hard delete of a raw/unknown skill mention. payload (reason,
// comments) is sent as the DELETE body for the audit trail the confirmation
// modal collects; the backend only strictly requires the id in the path.
export const deleteUnknownSkill = async (unknownSkillId, payload = {}) => {
  try {
    console.log("[skillOntologyService] DELETE", `${BASE_URL}/skills/unknown/${unknownSkillId}`, payload);
    const response = await api.delete(`${BASE_URL}/skills/unknown/${unknownSkillId}`, {
      headers: authHeaders(),
      data: payload,
    });
    return ok({ message: response.data?.message, ...(response.data?.data || {}) });
  } catch (error) {
    console.error("Error deleting unknown skill:", error);
    throw error;
  }
};

// HR_ADMIN-only bulk approve — creates a canonical skill for each selected
// unknown skill in one call. Response carries a per-item results array
// (partial success is normal: some ids can succeed while others fail), plus
// aggregate succeeded/failed counts the caller surfaces in its confirmation
// summary.
export const bulkApproveUnknownSkills = async (unknownSkillIds) => {
  try {
    const url = `${BASE_URL}/skills/unknown/bulk-approve`;
    const body = { unknown_skill_ids: unknownSkillIds };
    console.log("[skillOntologyService] POST", url, body);
    const response = await api.post(url, body, { headers: authHeaders() });
    return ok({ message: response.data?.message, ...(response.data?.data || {}) });
  } catch (error) {
    console.error("Error bulk approving unknown skills:", error);
    throw error;
  }
};

// HR_ADMIN-only bulk hard-delete — same per-item results/succeeded/failed
// shape as bulkApproveUnknownSkills above.
export const bulkDeleteUnknownSkills = async (unknownSkillIds) => {
  try {
    const url = `${BASE_URL}/skills/unknown/bulk-delete`;
    const body = { unknown_skill_ids: unknownSkillIds };
    console.log("[skillOntologyService] POST", url, body);
    const response = await api.post(url, body, { headers: authHeaders() });
    return ok({ message: response.data?.message, ...(response.data?.data || {}) });
  } catch (error) {
    console.error("Error bulk deleting unknown skills:", error);
    throw error;
  }
};

// HR_ADMIN-only resolution of a raw/unknown skill mention — maps it onto an
// existing canonical skill (or records it as a new alias of one), per the
// chosen `type`. Both ids are supplied by the caller (path param +
// canonical_skill_id from the suggestion the user picked); this layer only
// owns the request shape + response envelope.
export const resolveUnknownSkill = async (unknownSkillId, payload) => {
  try {
    const url = `${BASE_URL}/unknown-skills/${unknownSkillId}/resolve`;
    const body = {
      canonical_skill_id: payload.canonical_skill_id,
      canonical_name: payload.canonical_name,
      type: payload.type,
    };
    console.log("[skillOntologyService] POST", url, body);
    const response = await api.post(url, body, { headers: authHeaders() });
    return ok({ message: response.data?.message, ...(response.data?.data || {}) });
  } catch (error) {
    console.error("Error resolving unknown skill:", error);
    throw error;
  }
};

// HR_ADMIN-only — creates a brand new canonical skill directly from a raw/
// unknown skill mention (as opposed to mapping it onto one that already
// exists via resolveUnknownSkill above). Field mapping mirrors createSkill's
// convention so SkillForm/validateSkillForm can be reused as-is.
export const createCanonicalSkillFromUnknown = async (unknownSkillId, payload) => {
  try {
    const url = `${BASE_URL}/skills/unknown/${unknownSkillId}/create-canonical`;
    const body = {
      canonical_name: payload.canonical_name,
      category: payload.category,
      aliases: payload.aliases,
      parent_skill_id: payload.parent_skill_id || null,
      confidence: payload.confidence?.toLowerCase(),
    };
    console.log("[skillOntologyService] POST", url, body);
    const response = await api.post(url, body, { headers: authHeaders() });
    return ok({ message: response.data?.message, ...(response.data?.data || {}) });
  } catch (error) {
    console.error("Error creating canonical skill from unknown skill:", error);
    throw error;
  }
};

export const getUnknownSkillSuggestions = async (unknownSkillId, suggestionType, params = {}) => {
  const endpoint = SUGGESTION_ENDPOINT_BY_TYPE[suggestionType];
  const url = `${BASE_URL}/unknown-skills/${unknownSkillId}/suggestions/${endpoint}`;
  const query = {};
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.threshold !== undefined) query.threshold = params.threshold;
  const key = `GET ${url} ${JSON.stringify(query)}`;

  return dedupedRequest(key, async () => {
    try {
      console.log("[skillOntologyService] GET", url, query);
      const response = await api.get(url, { params: query, headers: authHeaders() });
      const items = response.data?.data || [];
      const isAlias = isAliasSuggestionType(suggestionType);
      return ok(items.map((raw) => mapSuggestion(raw, isAlias)));
    } catch (error) {
      console.error(`Error fetching ${suggestionType} suggestions:`, error);
      throw error;
    }
  });
};

export const getSkills = async (params = {}) => {
  // Built fresh from the caller's params every call — never mutated in place
  // and never shared with getCategories' request below, so filter state from
  // one can't leak into or collide with the other.
  const url = `${BASE_URL}/skill-ontology`;
  const query = {
    page: params.page,
    page_size: params.page_size,
    search: params.search,
    category: params.category,
    confidence: params.confidence,
    source: params.source,
    is_active: params.is_active,
  };
  // Query key = url + exact filters. Two callers requesting the identical
  // page/filters at the same time share one network request; any different
  // filter combination gets its own key and is never deduped against it.
  const key = `GET ${url} ${JSON.stringify(query)}`;

  return dedupedRequest(key, async () => {
    try {
      console.log("[skillOntologyService] GET", url, query);
      const response = await api.get(url, { params: query, headers: authHeaders() });
      const payload = response.data?.data || {};
      return ok({
        items: (payload.items || []).map(mapApiSkillToInternal),
        total: payload.total ?? 0,
      });
    } catch (error) {
      console.error("Error fetching skills:", error);
      throw error;
    }
  });
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
        confidence: payload.confidence?.toLowerCase(),
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
        confidence: payload.confidence?.toLowerCase(),
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
// separate from the generic updateSkill PATCH above. The same endpoint also
// performs usage/child-hierarchy validation server-side: deactivating a skill
// with child skills fails unless childHandling ("PROMOTE" | "ROOT") is given.
export const updateSkillStatus = async (skillId, isActive, childHandling) => {
  try {
    const response = await api.patch(
      `${BASE_URL}/skill-ontology/${skillId}/status`,
      { is_active: isActive, ...(childHandling ? { child_handling: childHandling } : {}) },
      { headers: authHeaders() }
    );
    return ok(response.data?.data || { id: skillId, is_active: isActive });
  } catch (error) {
    console.error("Error updating skill status:", error);
    throw error;
  }
};

// Fixed query key ("categories" — it takes no params) — distinct from any
// getSkills key (always prefixed "GET .../skill-ontology ..."), so the two
// endpoints' in-flight requests can never be mistaken for one another.
export const getCategories = async () => {
  const url = `${BASE_URL}/skill-ontology/categories`;

  return dedupedRequest("categories", async () => {
    try {
      console.log("[skillOntologyService] GET", url);
      const response = await api.get(url, { headers: authHeaders() });
      const items = response.data?.data || [];
      return ok([...items].sort((a, b) => a.category.localeCompare(b.category)));
    } catch (error) {
      console.error("Error fetching skill categories:", error);
      throw error;
    }
  });
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

// Field names are defensive (snake_case/camelCase, alternate error-array
// names) since the exact response shape wasn't specified beyond "same
// envelope as other skill-ontology endpoints".
const mapValidationResult = (raw) => {
  const invalidRows = raw.invalid_rows ?? raw.invalidRows ?? 0;
  return {
    totalRows: raw.total_rows ?? raw.totalRows ?? 0,
    validRows: raw.valid_rows ?? raw.validRows ?? 0,
    invalidRows,
    isValid: raw.is_valid ?? raw.valid ?? invalidRows === 0,
    errors: (raw.errors || raw.row_errors || raw.validation_errors || []).map((e) => ({
      row: e.row ?? e.row_number ?? e.rowNumber,
      field: e.field ?? e.column ?? "",
      message: e.message ?? e.error ?? e.detail ?? "",
    })),
  };
};

const mapImportResult = (raw) => ({
  inserted: raw.inserted ?? 0,
  updated: raw.updated ?? 0,
  skipped: raw.skipped ?? 0,
  failed: raw.failed ?? 0,
  importId: raw.import_id ?? raw.importId ?? null,
});

// S07/T01 — dry-run validation of the uploaded file. Never mutates data;
// the Import button (S07/T02) only unlocks once this returns isValid:true.
export const validateImportFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`${BASE_URL}/skill-ontology/import/validate`, formData, {
      headers: authHeaders(),
    });
    return ok(mapValidationResult(response.data?.data || response.data || {}));
  } catch (error) {
    console.error("Error validating import file:", error);
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
    return ok(mapImportResult(response.data?.data || response.data || {}));
  } catch (error) {
    console.error("Error importing skills:", error);
    throw error;
  }
};

// S07/T03 — direct browser download, no preview page.
export const getImportErrorReport = async (importId) => {
  try {
    const response = await api.get(`${BASE_URL}/skill-ontology/import/errors/${importId}`, {
      headers: authHeaders(),
      responseType: "blob",
    });
    return response;
  } catch (error) {
    console.error("Error downloading import error report:", error);
    throw error;
  }
};

// Root skills only (S05/T02) — the tree lazy-loads deeper levels via
// getSkillChildren below rather than this endpoint ever taking a parent id.
export const getSkillHierarchy = async () => {
  try {
    const response = await api.get(`${BASE_URL}/skill-ontology/hierarchy`, { headers: authHeaders() });
    const payload = response.data?.data;
    const items = payload?.items || payload || [];
    return ok({ items: items.map(mapHierarchyNode) });
  } catch (error) {
    console.error("Error fetching skill hierarchy:", error);
    throw error;
  }
};

// Immediate children of one node, fetched only when that node is expanded.
export const getSkillChildren = async (skillId) => {
  try {
    const response = await api.get(`${BASE_URL}/skill-ontology/${skillId}/children`, { headers: authHeaders() });
    const payload = response.data?.data;
    const items = payload?.items || payload || [];
    return ok({ items: items.map(mapHierarchyNode) });
  } catch (error) {
    console.error("Error fetching child skills:", error);
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
        source: params.source,
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

// Alias add/remove has no dedicated endpoint — both go through the generic
// updateSkill PATCH with the full aliases array, so the current skill is
// fetched first to avoid clobbering its other fields.
export const addAlias = async (skillId, alias) => {
  const current = await getSkill(skillId);
  const skill = current?.data || current;
  const aliases = skill.aliases.includes(alias) ? skill.aliases : [...skill.aliases, alias];
  return updateSkill(skillId, {
    canonical_name: skill.canonicalName,
    category: skill.category,
    aliases,
    parent_skill_id: skill.parentSkillId,
    confidence: skill.confidence,
    status: skill.status,
  });
};

export const removeAlias = async (skillId, alias) => {
  const current = await getSkill(skillId);
  const skill = current?.data || current;
  return updateSkill(skillId, {
    canonical_name: skill.canonicalName,
    category: skill.category,
    aliases: skill.aliases.filter((a) => a !== alias),
    parent_skill_id: skill.parentSkillId,
    confidence: skill.confidence,
    status: skill.status,
  });
};

