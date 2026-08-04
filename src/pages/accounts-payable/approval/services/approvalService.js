import { INVOICES, APPROVAL_RULES, getVendorNameById } from "../../mocks/apFixtures";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import { getApprovalTierForAmount, APPROVAL_DECISION } from "../../constants/approvalTiers";

const MOCK_RESPONSE_DELAY_MS = 400;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock "signed in" approver used to attribute decisions in this session.
const CURRENT_APPROVER = "V. Balada";

const todayIso = () => new Date().toISOString().slice(0, 10);

const enrichInvoice = (invoice) => ({
  ...invoice,
  vendorName: getVendorNameById(invoice.vendorId),
  tier: invoice.approvalTier || getApprovalTierForAmount(invoice.amount).tier,
});

export const approvalService = {
  /**
   * Invoices currently sitting in the approval queue, enriched with
   * vendor name and approval tier for display.
   */
  getPendingApprovals: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return INVOICES.filter((invoice) => invoice.status === INVOICE_STATUS.PENDING_APPROVAL).map(enrichInvoice);
    } catch (error) {
      console.error("Error in getPendingApprovals:", error);
      throw error;
    }
  },

  /**
   * Invoices that have already been decided (approved or rejected).
   */
  getApprovalHistory: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return INVOICES.filter(
        (invoice) => invoice.status === INVOICE_STATUS.APPROVED || invoice.status === INVOICE_STATUS.REJECTED
      ).map(enrichInvoice);
    } catch (error) {
      console.error("Error in getApprovalHistory:", error);
      throw error;
    }
  },

  /**
   * Records an approve / reject / return-for-correction decision against
   * an invoice. Mutates the shared INVOICES fixture in place so other AP
   * workspaces reading the same data see the update immediately.
   * @param {string} invoiceId
   * @param {string} decision one of APPROVAL_DECISION values
   * @param {string} comment
   */
  decideInvoice: async (invoiceId, decision, comment = "") => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);

      const invoice = INVOICES.find((inv) => inv.id === invoiceId);
      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      const decidedDate = todayIso();

      if (decision === APPROVAL_DECISION.APPROVE) {
        invoice.status = INVOICE_STATUS.APPROVED;
        invoice.approvedBy = CURRENT_APPROVER;
        invoice.approvedDate = decidedDate;
        invoice.approvalComment = comment;
      } else if (decision === APPROVAL_DECISION.REJECT) {
        if (!comment || !comment.trim()) {
          throw new Error("A comment is required to reject an invoice");
        }
        invoice.status = INVOICE_STATUS.REJECTED;
        invoice.rejectedBy = CURRENT_APPROVER;
        invoice.rejectedDate = decidedDate;
        invoice.rejectedReason = comment;
      } else if (decision === APPROVAL_DECISION.RETURN) {
        invoice.status = INVOICE_STATUS.PENDING_VALIDATION;
        invoice.returnedBy = CURRENT_APPROVER;
        invoice.returnedDate = decidedDate;
        invoice.returnReason = comment;
      } else {
        throw new Error(`Unknown approval decision: ${decision}`);
      }

      return enrichInvoice(invoice);
    } catch (error) {
      console.error(`Error in decideInvoice for ${invoiceId}:`, error);
      throw error;
    }
  },

  /**
   * Configured approval tiers / routing rules.
   */
  getApprovalRules: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return APPROVAL_RULES;
    } catch (error) {
      console.error("Error in getApprovalRules:", error);
      throw error;
    }
  },

  /**
   * Updates an approval rule in place (escalation days, approver role, active flag).
   * @param {string} id
   * @param {Object} payload
   */
  updateApprovalRule: async (id, payload) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);

      const rule = APPROVAL_RULES.find((r) => r.id === id);
      if (!rule) {
        throw new Error(`Approval rule ${id} not found`);
      }

      Object.assign(rule, payload);
      return rule;
    } catch (error) {
      console.error(`Error in updateApprovalRule for ${id}:`, error);
      throw error;
    }
  },
};

export default approvalService;
