// Real API integration for Epic 4 Phase 2 (Tool Pricing) — supersedes the earlier Tool Catalog
// service. Mirrors the axios usage convention already established elsewhere in this module
// (api wrapper + AR base URL + Bearer header).
//
// Endpoint paths extend the /api/ar/... prefix used by Phase 1 — a reasonable inference, not a
// confirmed contract. Confirm against the real backend once available and adjust here only
// (callers are unaffected).
import api from "../../../api/axiosInstance";
import { lookupService } from "../../expense-management/api/expenseReportsApi";

const AR_BASE_URL = window.__APP_CONFIG__?.AR_BASE_URL;
const TOOL_PRICING_PATH = "/api/ar/tool-pricing";

function authHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };
}

function toolPricingUrl(id) {
  return id ? `${AR_BASE_URL}${TOOL_PRICING_PATH}/${id}` : `${AR_BASE_URL}${TOOL_PRICING_PATH}`;
}

/**
 * @returns {Promise<import("../types/toolPricing").ToolPricingItem[]>}
 */
export async function getAll() {
  const response = await api.get(toolPricingUrl(), authHeaders());
  return response.data;
}

/**
 * @returns {Promise<import("../types/toolPricing").ToolPricingItem[]>}
 */
export async function getActive() {
  const response = await api.get(`${toolPricingUrl()}/active`, authHeaders());
  return response.data;
}

/**
 * @param {string} id
 * @returns {Promise<import("../types/toolPricing").ToolPricingItem>}
 */
export async function getById(id) {
  const response = await api.get(toolPricingUrl(id), authHeaders());
  return response.data;
}

/**
 * @param {import("../types/toolPricing").ToolPricingItemInput} payload
 * @returns {Promise<import("../types/toolPricing").ToolPricingItem>}
 */
export async function create(payload) {
  const response = await api.post(toolPricingUrl(), payload, authHeaders());
  return response.data;
}

/**
 * @param {string} id
 * @param {import("../types/toolPricing").ToolPricingItemInput} payload
 * @returns {Promise<import("../types/toolPricing").ToolPricingItem>}
 */
export async function update(id, payload) {
  const response = await api.put(toolPricingUrl(id), payload, authHeaders());
  return response.data;
}

// Backend performs a soft delete (deactivation) — the record is not actually removed.
export async function deleteById(id) {
  const response = await api.delete(toolPricingUrl(id), authHeaders());
  return response.data;
}

// Reuses the existing Currency master API (src/pages/expense-management/api/expenseReportsApi.js
// lookupService.getActiveCurrencies) — the only Currency master endpoint in this codebase.
// Returns [{ currencyCode, currencyName, symbol, ... }] filtered to active currencies.
export async function getActiveCurrencies() {
  return lookupService.getActiveCurrencies();
}
