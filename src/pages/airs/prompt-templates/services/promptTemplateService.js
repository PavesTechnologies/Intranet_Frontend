// Service layer for the Prompt Templates module. Same conventions as
// src/pages/airs/skill-ontology/services/skillOntologyService.js — service
// owns request/response shape mapping (snake_case <-> camelCase) and in-flight
// GET de-duplication; callers (hooks/pages) own toasts.

import api from "../../../../api/axiosInstance";

const BASE_URL = window.__APP_CONFIG__.AIRS_BASE_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const ok = (data) => ({ success: true, data });

const inFlightRequests = new Map();

const dedupedRequest = (key, factory) => {
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);
  const promise = factory().finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, promise);
  return promise;
};

const mapApiPromptTemplateToInternal = (raw) => ({
  id: raw.id,
  taskType: raw.task_type,
  name: raw.name,
  promptTemplate: raw.template_text,
  notes: raw.notes || "",
  status: raw.status,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  updatedBy: raw.updated_by,
});

export const getPromptTemplates = async (params = {}) => {
  const url = `${BASE_URL}/prompt-templates`;
  const query = {
    page: params.page,
    page_size: params.page_size,
    search: params.search,
    task_type: params.task_type,
    status: params.status,
    sort_by: params.sort_by,
    sort_order: params.sort_order,
  };
  const key = `GET ${url} ${JSON.stringify(query)}`;

  return dedupedRequest(key, async () => {
    try {
      const response = await api.get(url, { params: query, headers: authHeaders() });
      const payload = response.data?.data || {};
      return ok({
        items: (payload.items || []).map(mapApiPromptTemplateToInternal),
        total: payload.total ?? 0,
      });
    } catch (error) {
      console.error("Error fetching prompt templates:", error);
      throw error;
    }
  });
};

export const getPromptTemplate = async (id) => {
  try {
    const response = await api.get(`${BASE_URL}/prompt-templates/${id}`, { headers: authHeaders() });
    return ok(mapApiPromptTemplateToInternal(response.data?.data || {}));
  } catch (error) {
    console.error("Error fetching prompt template:", error);
    throw error;
  }
};

export const createPromptTemplate = async (payload) => {
  try {
    const response = await api.post(
      `${BASE_URL}/prompt-templates`,
      {
        name: payload.name,
        task_type: payload.taskType,
        template_text: payload.promptTemplate,
        notes: payload.notes || "",
        status: payload.status,
      },
      { headers: authHeaders() }
    );
    return ok(mapApiPromptTemplateToInternal(response.data?.data || {}));
  } catch (error) {
    console.error("Error creating prompt template:", error);
    throw error;
  }
};

export const updatePromptTemplate = async (id, payload) => {
  try {
    const response = await api.put(
      `${BASE_URL}/prompt-templates/${id}`,
      {
        name: payload.name,
        template_text: payload.promptTemplate,
        notes: payload.notes || "",
        status: payload.status,
      },
      { headers: authHeaders() }
    );
    return ok(mapApiPromptTemplateToInternal(response.data?.data || {}));
  } catch (error) {
    console.error("Error updating prompt template:", error);
    throw error;
  }
};

export const deletePromptTemplate = async (id) => {
  try {
    const response = await api.delete(`${BASE_URL}/prompt-templates/${id}`, { headers: authHeaders() });
    return ok(response.data?.data || { id });
  } catch (error) {
    console.error("Error deleting prompt template:", error);
    throw error;
  }
};

// ── Lookups — used by the Job Description (JD Parsing Prompt) and Hiring
// Campaign (Resume Parsing Prompt) forms to populate their prompt template
// dropdowns. Response is a flat array ({id, name}), not the {data: {...}}
// envelope the CRUD endpoints above use — mapped defensively either way.
const mapLookupItem = (raw) => ({ value: raw.id, label: raw.name });

const getPromptTemplateLookup = async (taskTypeSlug) => {
  const url = `${BASE_URL}/prompt-templates/lookups/${taskTypeSlug}`;
  const key = `GET ${url}`;

  return dedupedRequest(key, async () => {
    try {
      const response = await api.get(url, { headers: authHeaders() });
      const items = Array.isArray(response.data) ? response.data : response.data?.data || [];
      return ok(items.map(mapLookupItem));
    } catch (error) {
      console.error(`Error fetching ${taskTypeSlug} prompt template lookup:`, error);
      throw error;
    }
  });
};

export const getJdParsePromptLookup = () => getPromptTemplateLookup("jd-parse");

export const getResumeParsePromptLookup = () => getPromptTemplateLookup("resume-parse");
