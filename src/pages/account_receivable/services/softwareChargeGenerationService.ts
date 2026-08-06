// Real API integration for Epic 4 Phase 5 (Software Charge Generation). Mirrors the axios
// usage convention already established elsewhere in this module (api wrapper + AR base URL +
// Bearer header — see services/toolChargeAcquisitionService.ts).
//
// Purely a calculation preview — nothing is persisted, and no invoice total is touched. The
// backend performs all calculation; the frontend only renders calculatedAmount as returned.
import api from "../../../api/axiosInstance";
import type { InvoiceSoftwareSelectionItem } from "../types/invoiceSoftwareSelection";
import type { SoftwareChargeLine } from "../types/softwareChargeLine";

const AR_BASE_URL = window.__APP_CONFIG__?.AR_BASE_URL;
const CHARGE_GENERATION_PATH = "/api/invoice/software-charge-generation";

function authHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };
}

/**
 * @param selectedAssets The software/tool/license line items Finance selected in Invoice
 * Software Selection.
 * @returns Backend-calculated charge lines for the selected assets.
 */
export async function generateSoftwareCharges(
  selectedAssets: InvoiceSoftwareSelectionItem[]
): Promise<SoftwareChargeLine[]> {
  const response = await api.post(`${AR_BASE_URL}${CHARGE_GENERATION_PATH}`, selectedAssets, authHeaders());
  return response.data;
}
