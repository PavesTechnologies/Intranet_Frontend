import api from "../../../../api/axiosInstance";

const AP_BASE_URL = window.__APP_CONFIG__.AP_BASE_URL;

/** Copies error.response.status onto error.status so callers can do error?.status === 404,
 * matching invoiceService.js's withNormalizedStatus convention. */
function withNormalizedStatus(error) {
  error.status = error.status ?? error.response?.status;
  return error;
}

/**
 * Approval Policy configuration API — every route here requires APPROVAL_POLICY_MANAGE
 * server-side (Backend/API_Layer/routes/approval_policy_route.py). Covers policies (+levels),
 * the ROLE/USER approver-metadata lookups, and department-approver mappings, since all three
 * live on the same backend router/permission.
 */
export const approvalPolicyService = {
  /**
   * @param {{departmentId?: number, purchaseCategoryId?: number, isActive?: boolean}} [filters]
   * @returns {Promise<Array>} ApprovalPolicyDTO[]
   */
  async getPolicies({ departmentId, purchaseCategoryId, isActive } = {}) {
    try {
      const response = await api.get(`${AP_BASE_URL}/approval-policies`, {
        params: {
          department_id: departmentId || undefined,
          purchase_category_id: purchaseCategoryId || undefined,
          is_active: isActive ?? undefined,
        },
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** @param {string|number} policyId @returns {Promise<Object>} ApprovalPolicyDTO */
  async getPolicy(policyId) {
    try {
      const response = await api.get(`${AP_BASE_URL}/approval-policies/${Number(policyId)}`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * @param {Object} payload - ApprovalPolicyCreateRequest: {name, department_id,
   *   purchase_category_id, levels, description?, min_amount?, max_amount?, is_active?}
   * @returns {Promise<Object>} ApprovalPolicyResponse {id, message}
   */
  async createPolicy(payload) {
    try {
      const response = await api.post(`${AP_BASE_URL}/approval-policies`, payload);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * @param {string|number} policyId
   * @param {Object} payload - ApprovalPolicyUpdateRequest (all fields optional, but `levels`
   *   when present replaces the full level set)
   * @returns {Promise<Object>} ApprovalPolicyDTO
   */
  async updatePolicy(policyId, payload) {
    try {
      const response = await api.put(`${AP_BASE_URL}/approval-policies/${Number(policyId)}`, payload);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** @param {string|number} policyId @param {boolean} isActive @returns {Promise<Object>} ApprovalPolicyDTO */
  async setPolicyStatus(policyId, isActive) {
    try {
      const response = await api.patch(`${AP_BASE_URL}/approval-policies/${Number(policyId)}/status`, {
        is_active: isActive,
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** @param {string|number} policyId @returns {Promise<Object>} DeleteApprovalPolicyResponse */
  async deletePolicy(policyId) {
    try {
      const response = await api.delete(`${AP_BASE_URL}/approval-policies/${Number(policyId)}`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** @returns {Promise<string[]>} distinct role codes eligible for the ROLE approver type */
  async getApprovalRoles() {
    try {
      const response = await api.get(`${AP_BASE_URL}/approval/roles`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * @param {{roleCode?: string}} [filters]
   * @returns {Promise<Array>} ApproverLookupDTO[] — {user_uuid, employee_uuid, department_uuid,
   *   department_name, is_user_active}. No name/email field exists on this record (CDC-synced
   *   identity data only) — callers must render user_uuid/employee_uuid, not a display name.
   */
  async getApprovers({ roleCode } = {}) {
    try {
      const response = await api.get(`${AP_BASE_URL}/approval/approvers`, {
        params: { role_code: roleCode || undefined },
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * @param {number} departmentId - required by the backend
   * @param {{isActive?: boolean}} [filters]
   * @returns {Promise<Array>} DepartmentApproverDTO[]
   */
  async getDepartmentApprovers(departmentId, { isActive } = {}) {
    try {
      const response = await api.get(`${AP_BASE_URL}/approval/department-approvers`, {
        params: { department_id: Number(departmentId), is_active: isActive ?? undefined },
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /**
   * @param {{departmentId: number, userUuid: string}} data
   * @returns {Promise<Object>} DepartmentApproverDTO
   */
  async addDepartmentApprover({ departmentId, userUuid }) {
    try {
      const response = await api.post(`${AP_BASE_URL}/approval/department-approvers`, {
        department_id: Number(departmentId),
        user_uuid: userUuid,
      });
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },

  /** @param {string|number} mappingId @returns {Promise<Object>} DeleteApprovalPolicyResponse */
  async removeDepartmentApprover(mappingId) {
    try {
      const response = await api.delete(`${AP_BASE_URL}/approval/department-approvers/${Number(mappingId)}`);
      return response.data;
    } catch (error) {
      throw withNormalizedStatus(error);
    }
  },
};

export default approvalPolicyService;
