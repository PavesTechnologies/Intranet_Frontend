import { INVOICES, buildExceptions } from "../../mocks/apFixtures";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";

const MOCK_RESPONSE_DELAY_MS = 400;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const RESOLUTION_ACTIONS = {
  CORRECT_RESUBMIT: "correct_resubmit",
  WAIVE_PROCEED: "waive_proceed",
  ESCALATE_VENDOR: "escalate_vendor",
};

export const RESOLUTION_ACTION_OPTIONS = [
  { value: RESOLUTION_ACTIONS.CORRECT_RESUBMIT, label: "Correct & Resubmit" },
  { value: RESOLUTION_ACTIONS.WAIVE_PROCEED, label: "Waive & Proceed" },
  { value: RESOLUTION_ACTIONS.ESCALATE_VENDOR, label: "Escalate to Vendor" },
];

const matchesSearch = (exception, search) => {
  if (!search) return true;
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (
    exception.invoiceId.toLowerCase().includes(term) ||
    (exception.vendorName || "").toLowerCase().includes(term)
  );
};

export const exceptionService = {
  /**
   * Builds the open-exceptions list fresh from INVOICES every call so
   * statuses mutated elsewhere this session (resolutions, other AP
   * workspaces) are always reflected.
   */
  getExceptions: async ({ search = "", type = "All" } = {}) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return buildExceptions().filter((exception) => {
        const typeMatch = type === "All" || exception.type === type;
        return typeMatch && matchesSearch(exception, search);
      });
    } catch (error) {
      console.error("Error in getExceptions:", error);
      throw error;
    }
  },

  /**
   * Mutates the underlying INVOICES fixture in place so the resolution is
   * reflected across every AP workspace reading it this session.
   */
  resolveException: async (invoiceId, resolutionAction, notes = "") => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      const invoice = INVOICES.find((inv) => inv.id === invoiceId);
      if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

      if (resolutionAction === RESOLUTION_ACTIONS.CORRECT_RESUBMIT) {
        invoice.status = INVOICE_STATUS.PENDING_VALIDATION;
        invoice.exceptionType = null;
        invoice.resolutionNotes = notes;
      } else if (resolutionAction === RESOLUTION_ACTIONS.WAIVE_PROCEED) {
        invoice.status = INVOICE_STATUS.PENDING_APPROVAL;
        invoice.exceptionType = null;
        invoice.resolutionNotes = notes;
      } else if (resolutionAction === RESOLUTION_ACTIONS.ESCALATE_VENDOR) {
        // Stays in Exception status — just records an internal note.
        invoice.internalNote = notes;
      } else {
        throw new Error(`Unknown resolution action: ${resolutionAction}`);
      }

      return invoice;
    } catch (error) {
      console.error(`Error in resolveException for invoice ${invoiceId}:`, error);
      throw error;
    }
  },
};

export default exceptionService;
