const MOCK_RESPONSE_DELAY_MS = 400;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Module-scoped mock datasets (admin-only config — not shared transactional
// fixtures, so they live here rather than in ../../mocks/apFixtures.js).
// ─────────────────────────────────────────────────────────────────────────────

let taxRules = [
  {
    id: "tax-001",
    jurisdiction: "California, USA",
    taxType: "Sales Tax",
    ratePct: 7.25,
    effectiveDate: "2025-01-01",
    active: true,
  },
  {
    id: "tax-002",
    jurisdiction: "New York, USA",
    taxType: "Sales Tax",
    ratePct: 4.0,
    effectiveDate: "2025-01-01",
    active: true,
  },
  {
    id: "tax-003",
    jurisdiction: "Texas, USA",
    taxType: "Sales Tax",
    ratePct: 6.25,
    effectiveDate: "2024-07-01",
    active: true,
  },
  {
    id: "tax-004",
    jurisdiction: "Illinois, USA",
    taxType: "Sales Tax",
    ratePct: 6.25,
    effectiveDate: "2024-07-01",
    active: false,
  },
  {
    id: "tax-005",
    jurisdiction: "Florida, USA",
    taxType: "Sales Tax",
    ratePct: 6.0,
    effectiveDate: "2024-01-01",
    active: true,
  },
  {
    id: "tax-006",
    jurisdiction: "United Kingdom",
    taxType: "VAT",
    ratePct: 20.0,
    effectiveDate: "2024-01-01",
    active: true,
  },
];

let notificationSettings = {
  invoicePendingApprovalOverdue: true,
  paymentBatchScheduled: true,
  vendorBankDetailsChanged: true,
  newExceptionRaised: true,
  invoiceOverdue: false,
  approvalThresholdBreached: true,
};

let apConfig = {
  paymentTerms: "Net 30",
  currency: "USD",
  escalationDays: 3,
  matchTolerancePct: 2,
  straightThroughEnabled: true,
};

const generateTaxRuleId = () => `tax-${Date.now()}`;

export const apConfigService = {
  /**
   * Fetches all configured tax rules
   */
  getTaxRules: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return [...taxRules];
    } catch (error) {
      console.error("Error in getTaxRules:", error);
      throw error;
    }
  },

  /**
   * Creates a new tax rule (no id) or updates an existing one in place
   * @param {Object} payload
   */
  saveTaxRule: async (payload) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);

      if (payload?.id) {
        const index = taxRules.findIndex((rule) => rule.id === payload.id);
        if (index === -1) {
          throw new Error(`Tax rule ${payload.id} not found`);
        }
        taxRules[index] = { ...taxRules[index], ...payload };
        return taxRules[index];
      }

      const newRule = { ...payload, id: generateTaxRuleId() };
      taxRules = [...taxRules, newRule];
      return newRule;
    } catch (error) {
      console.error("Error in saveTaxRule:", error);
      throw error;
    }
  },

  /**
   * Deletes a tax rule by id
   * @param {string} id
   */
  deleteTaxRule: async (id) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      taxRules = taxRules.filter((rule) => rule.id !== id);
      return { id };
    } catch (error) {
      console.error(`Error in deleteTaxRule for ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Fetches current notification settings
   */
  getNotificationSettings: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return { ...notificationSettings };
    } catch (error) {
      console.error("Error in getNotificationSettings:", error);
      throw error;
    }
  },

  /**
   * Updates notification settings
   * @param {Object} settings
   */
  updateNotificationSettings: async (settings) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      notificationSettings = { ...notificationSettings, ...settings };
      return { ...notificationSettings };
    } catch (error) {
      console.error("Error in updateNotificationSettings:", error);
      throw error;
    }
  },

  /**
   * Fetches general AP configuration
   */
  getAPConfig: async () => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      return { ...apConfig };
    } catch (error) {
      console.error("Error in getAPConfig:", error);
      throw error;
    }
  },

  /**
   * Updates general AP configuration
   * @param {Object} payload
   */
  updateAPConfig: async (payload) => {
    try {
      await wait(MOCK_RESPONSE_DELAY_MS);
      apConfig = { ...apConfig, ...payload };
      return { ...apConfig };
    } catch (error) {
      console.error("Error in updateAPConfig:", error);
      throw error;
    }
  },
};

export default apConfigService;
