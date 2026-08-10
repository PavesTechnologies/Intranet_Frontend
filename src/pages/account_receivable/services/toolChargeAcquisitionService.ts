// Real API integration for Epic 4 (Tool / Software / License Billing) Phase 4, Story 4.3 —
// Tool Charge (Billing Data) Acquisition preview. Mirrors the axios usage convention already
// established in projectToolBillingService.ts / toolCatalogService.ts /
// projectToolAssignmentService.ts (api wrapper + AR base URL + Bearer header).
//
// Path is the exact one given for this phase — POST /api/tool-charge-acquisition/preview
// (no /ar/ segment), same style as the /api/tool-catalog/active path used in Phase 3.
import api from "../../../api/axiosInstance";

const AR_BASE_URL = window.__APP_CONFIG__?.AR_BASE_URL;
const PREVIEW_PATH = "/api/tool-charge-acquisition/preview";

function authHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };
}

/**
 * Previews backend-calculated tool charges for a project and billing period. Purely a
 * read-only preview — nothing is persisted, and no invoice is generated.
 * @param {import("../types/toolChargeAcquisition").ToolChargePreviewRequest} payload
 * @returns {Promise<import("../types/toolChargeAcquisition").ToolChargePreviewRecord[]>}
 */
export async function previewCharges(payload) {
  const response = await api.post(`${AR_BASE_URL}${PREVIEW_PATH}`, payload, authHeaders());
  return response.data;
}
