// Real API integration for Epic 4 Phase 7 (Billing History & Duplicate Prevention). Mirrors
// the axios usage convention already established elsewhere in this module (api wrapper + AR
// base URL + Bearer header — see services/toolPricingService.ts).
//
// Path is the exact one given for this phase — /software-billing-history/assets/{assetId},
// without the /api/... segment every other AR endpoint in this module uses. Kept literal since
// that's what was specified; confirm against the real backend once available.
import api from "../../../api/axiosInstance";
import type { SoftwareBillingHistoryItem } from "../types/softwareBillingHistory";

const AR_BASE_URL = window.__APP_CONFIG__?.AR_BASE_URL;
const BILLING_HISTORY_PATH = "/software-billing-history/assets";

function authHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };
}

/**
 * @param assetId
 * @returns Every prior invoice line recorded against this RMS asset, most recent or oldest
 * first as the backend returns it. Used only to decide selection eligibility and to populate
 * the billing history dialog — never to derive amounts.
 */
export async function getBillingHistory(assetId: string): Promise<SoftwareBillingHistoryItem[]> {
  const response = await api.get(`${AR_BASE_URL}${BILLING_HISTORY_PATH}/${assetId}`, authHeaders());
  return response.data;
}
