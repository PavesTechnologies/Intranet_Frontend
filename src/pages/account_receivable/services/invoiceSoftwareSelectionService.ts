// Real API integration for Epic 4 Phase 4 (Invoice Software Selection). Mirrors the axios
// usage convention already established elsewhere in this module (api wrapper + AR base URL +
// Bearer header — see services/toolPricingService.ts).
//
// This screen only selects invoice line items — it never calculates totals, persists a
// selection, or checks for duplicates. Selection state stays in the component until Phase 5
// consumes it.
import api from "../../../api/axiosInstance";
import type { InvoiceSoftwareSelectionItem } from "../types/invoiceSoftwareSelection";

const AR_BASE_URL = window.__APP_CONFIG__?.AR_BASE_URL;
const SOFTWARE_SELECTION_PATH = "/api/invoice/software-selection/projects";

/**
 * @param projectId
 * @returns RMS-assigned assets for the project, each already joined with AR Tool Pricing and
 * flagged with the backend's own selection eligibility.
 */
export async function getSelectableAssets(projectId: string): Promise<InvoiceSoftwareSelectionItem[]> {
  const response = await api.get(`${AR_BASE_URL}${SOFTWARE_SELECTION_PATH}/${projectId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return response.data;
}
