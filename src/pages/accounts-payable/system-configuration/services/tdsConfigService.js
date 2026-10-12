import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;
const BASE = `${AP_BASE_URL}/tds/config`;

/** Copies error.response.status onto error.status, matching every other AP service's convention
 * (approvalPolicyService.js, tdsService.js, etc.) so callers can branch on error?.status. */
function withNormalizedStatus(error) {
  error.status = error.status ?? error.response?.status;
  return error;
}

/**
 * TDS Configuration API — Rules, Nature of Payment, Deductor master data, and the Excel bulk
 * import flow. Every route requires one of TDS_CONFIG_VIEW/CREATE/EDIT/DELETE/IMPORT server-side
 * (see constants/tdsConfigPermissions.js) — this service does not enforce that itself, only
 * calls the endpoint; the backend is authoritative.
 */
export const tdsConfigService = {
  // ── TDS Rules ────────────────────────────────────────────────────────────
  /**
   * @param {{search?: string, status?: string, paymentNature?: string, effectiveDate?: string,
   *   deductorId?: number}} [filters]
   * @returns {Promise<Array>} raw TDS Rule[] (see tdsConfigMapper.mapRuleFromApi)
   */
  async getRules({ search, status, paymentNature, effectiveDate, deductorId } = {}) {
    try {
      const response = await api.get(`${BASE}/rules`, {
        params: {
          search: search || undefined,
          status: status || undefined,
          payment_nature: paymentNature || undefined,
          effective_date: effectiveDate || undefined,
          deductor_id: deductorId || undefined,
        },
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** @param {string|number} ruleId */
  async getRule(ruleId) {
    try {
      const response = await api.get(`${BASE}/rules/${ruleId}`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** @param {Object} payload - see tdsConfigMapper.mapRuleToApi */
  async createRule(payload) {
    try {
      const response = await api.post(`${BASE}/rules`, payload);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** @param {string|number} ruleId @param {Object} payload */
  async updateRule(ruleId, payload) {
    try {
      const response = await api.put(`${BASE}/rules/${ruleId}`, payload);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** @param {string|number} ruleId @param {boolean} isActive */
  async updateRuleStatus(ruleId, isActive) {
    try {
      const response = await api.patch(`${BASE}/rules/${ruleId}/status`, { is_active: isActive });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** @param {string|number} ruleId — backend returns 409 if the rule is referenced/in use. */
  async deleteRule(ruleId) {
    try {
      const response = await api.delete(`${BASE}/rules/${ruleId}`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  // ── Nature of Payment ───────────────────────────────────────────────────
  async getPaymentNatures() {
    try {
      const response = await api.get(`${BASE}/payment-natures`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  async getPaymentNature(id) {
    try {
      const response = await api.get(`${BASE}/payment-natures/${id}`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  async createPaymentNature(payload) {
    try {
      const response = await api.post(`${BASE}/payment-natures`, payload);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  async updatePaymentNature(id, payload) {
    try {
      const response = await api.put(`${BASE}/payment-natures/${id}`, payload);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  async updatePaymentNatureStatus(id, isActive) {
    try {
      const response = await api.patch(`${BASE}/payment-natures/${id}/status`, { is_active: isActive });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** Backend returns 409 if this nature of payment is referenced by a rule. */
  async deletePaymentNature(id) {
    try {
      const response = await api.delete(`${BASE}/payment-natures/${id}`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  // ── Deductor ─────────────────────────────────────────────────────────────
  /** Empty array is a valid, expected result — no deductors are seeded until Finance adds them. */
  async getDeductors() {
    try {
      const response = await api.get(`${BASE}/deductors`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  async getDeductor(id) {
    try {
      const response = await api.get(`${BASE}/deductors/${id}`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  async createDeductor(payload) {
    try {
      const response = await api.post(`${BASE}/deductors`, payload);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  async updateDeductor(id, payload) {
    try {
      const response = await api.put(`${BASE}/deductors/${id}`, payload);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  async updateDeductorStatus(id, isActive) {
    try {
      const response = await api.patch(`${BASE}/deductors/${id}/status`, { is_active: isActive });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** Backend returns 409 if this deductor is referenced by a rule. */
  async deleteDeductor(id) {
    try {
      const response = await api.delete(`${BASE}/deductors/${id}`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  // ── Metadata ─────────────────────────────────────────────────────────────
  /** Backend-supported rate-condition fields/operators/allowed values, threshold types, etc. —
   * exact shape not yet confirmed against a live response, see tdsConfigMapper.js's header note. */
  async getMetadata() {
    try {
      const response = await api.get(`${BASE}/metadata`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  // ── Excel Import ─────────────────────────────────────────────────────────
  /**
   * @param {File} file - .xlsx or .csv
   * @returns {Promise<Object>} validation result — {valid, total_rows, valid_rows, error_rows,
   *   errors: [{row, field, message}]} per the spec; exact shape to be confirmed.
   */
  async validateImport(file) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post(`${BASE}/import/validate`, formData);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** @param {File} file @returns {Promise<Object>} import result */
  async importConfiguration(file) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post(`${BASE}/import`, formData);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },
};

export default tdsConfigService;
