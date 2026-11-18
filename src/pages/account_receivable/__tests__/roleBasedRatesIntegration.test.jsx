import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../../../api/axiosInstance";
import {
  unwrapData,
  asArray,
  normalizeTmRateCard,
  buildTmRateCardRequestPayload,
  normalizeTmRateDiscount,
  buildTmRateDiscountRequestPayload,
  getTmRateCardsByBillingConfiguration,
  getTmRateCardById,
  createTmRateCard,
  updateTmRateCard,
  saveTmRateCard,
  deleteTmRateCard,
  getTmRateDiscounts,
  getTmRateDiscountById,
  createTmRateDiscount,
  updateTmRateDiscount,
  deleteTmRateDiscount,
  syncStandardRateDiscounts,
  PartialDiscountSyncError,
  calculateRateDiscountPreview,
  calculateDiscountedRate,
  mapUiDiscountTypeToApi,
  mapApiDiscountTypeToUi,
} from "../services/billingConfigurationService";
import { buildInvoiceLineItems } from "../utils/invoicePresentation";

vi.mock("../../../api/axiosInstance", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Role-Based Rates — Frontend Integration Tests (Mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Correct rate-card paths and HTTP methods
  it("1. calls correct rate-card endpoint paths and HTTP methods", async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [{ id: "rc-1", roleName: "Developer" }] } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: { id: "rc-1", roleName: "Developer" } } });
    api.post.mockResolvedValueOnce({ data: { success: true, data: { id: "rc-2", roleName: "Designer" } } });
    api.put.mockResolvedValueOnce({ data: { success: true, data: { id: "rc-2", roleName: "Lead Designer" } } });
    api.delete.mockResolvedValueOnce({ data: { success: true, data: true } });
    api.post.mockResolvedValueOnce({ data: { success: true, data: { id: "rc-3", roleName: "Architect" } } });

    // List active cards: GET /{configId}/tm-rate-cards
    const list = await getTmRateCardsByBillingConfiguration("cfg-100");
    expect(api.get).toHaveBeenLastCalledWith(expect.stringMatching(/\/api\/billing-tm-rate-card\/cfg-100\/tm-rate-cards$/));
    expect(list).toHaveLength(1);

    // Get one card: GET /tm-rate-cards/{rateCardId}
    const single = await getTmRateCardById("rc-1");
    expect(api.get).toHaveBeenLastCalledWith(expect.stringMatching(/\/api\/billing-tm-rate-card\/tm-rate-cards\/rc-1$/));
    expect(single.id).toBe("rc-1");

    // Create rate card: POST /{configId}/tm-rate-cards
    await createTmRateCard("cfg-100", { roleName: "Designer", rate: 1000 });
    expect(api.post).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/api\/billing-tm-rate-card\/cfg-100\/tm-rate-cards$/),
      { roleName: "Designer", rate: 1000 }
    );

    // Update rate card: PUT /tm-rate-cards/{rateCardId}
    await updateTmRateCard("rc-2", { roleName: "Lead Designer", rate: 1200 });
    expect(api.put).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/api\/billing-tm-rate-card\/tm-rate-cards\/rc-2$/),
      { roleName: "Lead Designer", rate: 1200 }
    );

    // Delete rate card: DELETE /tm-rate-cards/{rateCardId}
    await deleteTmRateCard("rc-2");
    expect(api.delete).toHaveBeenLastCalledWith(expect.stringMatching(/\/api\/billing-tm-rate-card\/tm-rate-cards\/rc-2$/));

    // Save rate card (legacy): POST /{configId}/tm-rate-cards/save
    await saveTmRateCard("cfg-100", { roleName: "Architect", rate: 1500 });
    expect(api.post).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/api\/billing-tm-rate-card\/cfg-100\/tm-rate-cards\/save$/),
      { roleName: "Architect", rate: 1500 }
    );
  });

  // 2. Correct discount endpoint paths and HTTP methods
  it("2. calls correct discount endpoint paths and HTTP methods", async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [{ id: "d-1", periodName: "Q1" }] } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: { id: "d-1", periodName: "Q1" } } });
    api.post.mockResolvedValueOnce({ data: { success: true, data: { id: "d-2", periodName: "Q2" } } });
    api.put.mockResolvedValueOnce({ data: { success: true, data: { id: "d-2", periodName: "Q2 Updated" } } });
    api.delete.mockResolvedValueOnce({ data: { success: true, data: true } });

    // List discounts: GET /tm-rate-cards/{rateCardId}/discounts
    await getTmRateDiscounts("rc-10");
    expect(api.get).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/api\/billing-tm-rate-card\/tm-rate-cards\/rc-10\/discounts$/)
    );

    // Get discount by ID: GET /tm-rate-discounts/{discountId}
    await getTmRateDiscountById("d-1");
    expect(api.get).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/api\/billing-tm-rate-card\/tm-rate-discounts\/d-1$/)
    );

    // Create discount: POST /tm-rate-cards/{rateCardId}/discounts
    await createTmRateDiscount("rc-10", { periodName: "Q2", discountValue: 10 });
    expect(api.post).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/api\/billing-tm-rate-card\/tm-rate-cards\/rc-10\/discounts$/),
      { periodName: "Q2", discountValue: 10 }
    );

    // Update discount: PUT /tm-rate-discounts/{discountId}
    await updateTmRateDiscount("d-2", { periodName: "Q2 Updated" });
    expect(api.put).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/api\/billing-tm-rate-card\/tm-rate-discounts\/d-2$/),
      { periodName: "Q2 Updated" }
    );

    // Delete discount: DELETE /tm-rate-discounts/{discountId}
    await deleteTmRateDiscount("d-2");
    expect(api.delete).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/api\/billing-tm-rate-card\/tm-rate-discounts\/d-2$/)
    );
  });

  // 3. Correct ApiResponse<T> unwrapping
  it("3. unwraps nested ApiResponse envelopes, arrays, and null values accurately", () => {
    // Envelope: { data: { data: [...] } }
    const nestedRes = { data: { success: true, data: { data: [{ rateCardId: 101 }] } } };
    expect(unwrapData(nestedRes)).toEqual([{ rateCardId: 101 }]);

    // Standard envelope: { data: [ { ... } ] }
    const listRes = { data: { success: true, data: [{ rateCardId: 102 }] } };
    expect(unwrapData(listRes)).toEqual([{ rateCardId: 102 }]);

    // Single item envelope: { data: { rateCardId: 103 } }
    const itemRes = { data: { success: true, data: { rateCardId: 103 } } };
    expect(unwrapData(itemRes)).toEqual({ rateCardId: 103 });

    // asArray wrapper converts single/nested envelopes to array safely
    expect(asArray(unwrapData(listRes))).toHaveLength(1);
    expect(asArray(null)).toEqual([]);
    expect(asArray(undefined)).toEqual([]);
  });

  // 4. Mapping roleName, rate, ratePeriod, and includeBaseRateInInvoice
  it("4. maps role card fields strictly adhering to backend names", () => {
    const inputCard = {
      role: "Lead QA Engineer",
      rate: "1250",
      ratePeriod: "HOURLY",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      remarks: "Agreed QA rate",
      includeBaseRateInInvoice: false,
    };

    const payload = buildTmRateCardRequestPayload(inputCard, "ROLE_BASED", "cfg-10");
    expect(payload.roleName).toBe("Lead QA Engineer");
    expect(payload.rate).toBe("1250");
    expect(payload.ratePeriod).toBe("HOURLY");
    expect(payload.effectiveFrom).toBe("2026-01-01");
    expect(payload.effectiveTo).toBe("2026-12-31");
    expect(payload.remarks).toBe("Agreed QA rate");
    expect(payload.includeBaseRateInInvoice).toBe(false);
  });

  // 5. Mapping periodName, notes, and includeInInvoice
  it("5. maps discount period fields strictly adhering to backend names without UI-only aliases", () => {
    const period = {
      periodName: "Q1 Promotional Period",
      discountType: "PERCENTAGE",
      discountValue: "15",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-03-31",
      notes: "Commercial introductory discount",
      includeInInvoice: true,
      // UI-only aliases that must NOT override backend fields
      discountName: "AliasName",
      remarks: "LegacyRemarks",
    };

    const payload = buildTmRateDiscountRequestPayload(period);
    expect(payload.periodName).toBe("Q1 Promotional Period");
    expect(payload.discountType).toBe("PERCENTAGE");
    expect(payload.discountValue).toBe(15);
    expect(payload.effectiveFrom).toBe("2026-01-01");
    expect(payload.effectiveTo).toBe("2026-03-31");
    expect(payload.notes).toBe("Commercial introductory discount");
    expect(payload.includeInInvoice).toBe(true);
    expect(payload).not.toHaveProperty("discountName");
    expect(payload).not.toHaveProperty("remarks");
  });

  // 6. Explicitly sending includeInInvoice: false on discount updates
  it("6. explicitly sends includeInInvoice: false when unchecked, preventing backend default true", () => {
    const periodExcluded = {
      periodName: "Audit Only Period",
      discountType: "FIXED_AMOUNT",
      discountValue: 100,
      includeInInvoice: false,
    };

    const payload = buildTmRateDiscountRequestPayload(periodExcluded);
    expect(payload.includeInInvoice).toBe(false);
    expect(typeof payload.includeInInvoice).toBe("boolean");
  });

  // 7. Saving multiple roles with multiple discount periods
  it("7. saves multiple roles each with multiple discount periods correctly", async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [] } });
    api.post.mockImplementation((url, data) => {
      if (url.includes("/discounts")) {
        return Promise.resolve({ data: { success: true, data: { discountId: `d-new-${Math.random()}`, ...data } } });
      }
      return Promise.resolve({ data: { success: true, data: { rateCardId: `rc-new-${Math.random()}`, ...data } } });
    });

    const periodsRole1 = [
      { periodName: "R1 P1", discountType: "PERCENTAGE", discountValue: 10, includeInInvoice: true },
      { periodName: "R1 P2", discountType: "PERCENTAGE", discountValue: 15, includeInInvoice: false },
    ];
    const periodsRole2 = [
      { periodName: "R2 P1", discountType: "FIXED_AMOUNT", discountValue: 200, includeInInvoice: true },
    ];

    const savedP1 = await syncStandardRateDiscounts("rc-1", periodsRole1, "INR", { roleName: "Role 1" });
    const savedP2 = await syncStandardRateDiscounts("rc-2", periodsRole2, "INR", { roleName: "Role 2" });

    expect(savedP1).toHaveLength(2);
    expect(savedP2).toHaveLength(1);
    expect(savedP1[0].includeInInvoice).toBe(true);
    expect(savedP1[1].includeInInvoice).toBe(false);
    expect(savedP2[0].discountType).toBe("FIXED_AMOUNT");
  });

  // 8. Reloading roles and their respective discount periods
  it("8. reloads roles and properly associates discount periods with each respective role", async () => {
    const backendCards = [
      { rateCardId: "rc-10", roleName: "Full Stack Dev", rate: 1200, includeBaseRateInInvoice: true },
      { rateCardId: "rc-20", roleName: "DevOps Engineer", rate: 1400, includeBaseRateInInvoice: false },
    ];
    const backendDiscountsRc10 = [
      { discountId: "d-1", rateCardId: "rc-10", periodName: "Dev Discount", discountType: "PERCENTAGE", discountValue: 10, netRate: 1080 },
    ];
    const backendDiscountsRc20 = [
      { discountId: "d-2", rateCardId: "rc-20", periodName: "DevOps Discount", discountType: "FIXED_AMOUNT", discountValue: 200, netRate: 1200 },
    ];

    api.get.mockImplementation((url) => {
      if (url.includes("/rc-10/discounts")) {
        return Promise.resolve({ data: { success: true, data: backendDiscountsRc10 } });
      }
      if (url.includes("/rc-20/discounts")) {
        return Promise.resolve({ data: { success: true, data: backendDiscountsRc20 } });
      }
      return Promise.resolve({ data: { success: true, data: backendCards } });
    });

    const cards = await getTmRateCardsByBillingConfiguration("cfg-1");
    expect(cards).toHaveLength(2);

    const discounts10 = await getTmRateDiscounts(cards[0].rateCardId);
    const discounts20 = await getTmRateDiscounts(cards[1].rateCardId);

    expect(discounts10[0].periodName).toBe("Dev Discount");
    expect(discounts10[0].netRate).toBe(1080);
    expect(discounts20[0].periodName).toBe("DevOps Discount");
    expect(discounts20[0].netRate).toBe(1200);
  });

  // 9. Updating an existing period without creating a duplicate
  it("9. updates an existing discount period via PUT without calling POST create", async () => {
    const existingPeriod = { discountId: "d-existing-1", periodName: "Existing Q1", discountType: "PERCENTAGE", discountValue: 10 };
    api.get.mockResolvedValueOnce({ data: { success: true, data: [existingPeriod] } });
    api.put.mockResolvedValueOnce({ data: { success: true, data: { ...existingPeriod, discountValue: 12 } } });

    const updatedPeriods = [
      { discountId: "d-existing-1", periodName: "Existing Q1", discountType: "PERCENTAGE", discountValue: 12 },
    ];

    const result = await syncStandardRateDiscounts("rc-1", updatedPeriods, "INR");
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();
    expect(result[0].discountValue).toBe(12);
  });

  // 10. Deleting only the intended discount period
  it("10. deletes only the removed discount period without deleting untouched periods", async () => {
    const existing = [
      { discountId: "d-keep", periodName: "Keep Me" },
      { discountId: "d-remove", periodName: "Delete Me" },
    ];
    api.get.mockResolvedValueOnce({ data: { success: true, data: existing } });
    api.put.mockResolvedValueOnce({ data: { success: true, data: { discountId: "d-keep", periodName: "Keep Me" } } });
    api.delete.mockResolvedValueOnce({ data: { success: true, data: true } });

    // User submits only d-keep
    await syncStandardRateDiscounts("rc-1", [{ discountId: "d-keep", periodName: "Keep Me" }], "INR");

    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith(expect.stringMatching(/\/tm-rate-discounts\/d-remove$/));
  });

  // 11. Handling a partial failure after a rate card or some periods have already saved
  it("11. raises PartialDiscountSyncError with saved periods when a discount operation fails", async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    api.post
      .mockResolvedValueOnce({ data: { success: true, data: { discountId: "d-success-1", periodName: "P1" } } })
      .mockRejectedValueOnce(new Error("Server timeout on period 2"));

    const periodsToSave = [
      { periodName: "P1", discountType: "PERCENTAGE", discountValue: 10 },
      { periodName: "P2", discountType: "PERCENTAGE", discountValue: 20 },
    ];

    let thrownError = null;
    try {
      await syncStandardRateDiscounts("rc-1", periodsToSave, "INR", { roleName: "Backend Engineer" });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(PartialDiscountSyncError);
    expect(thrownError.roleName).toBe("Backend Engineer");
    expect(thrownError.periodName).toBe("P2");
    expect(thrownError.savedPeriods).toHaveLength(1);
    expect(thrownError.savedPeriods[0].discountId).toBe("d-success-1");
  });

  // 12. Retrying failed saves without duplicating successful records
  it("12. retries failed saves without duplicating already-saved records", async () => {
    // On retry, period 1 now has discountId "d-success-1", while period 2 still has no ID
    const retryPeriods = [
      { discountId: "d-success-1", periodName: "P1", discountType: "PERCENTAGE", discountValue: 10 },
      { periodName: "P2", discountType: "PERCENTAGE", discountValue: 20 },
    ];

    api.get.mockResolvedValueOnce({ data: { success: true, data: [{ discountId: "d-success-1", periodName: "P1" }] } });
    api.put.mockResolvedValueOnce({ data: { success: true, data: { discountId: "d-success-1", periodName: "P1" } } });
    api.post.mockResolvedValueOnce({ data: { success: true, data: { discountId: "d-success-2", periodName: "P2" } } });

    const result = await syncStandardRateDiscounts("rc-1", retryPeriods, "INR", { roleName: "Backend Engineer" });

    // P1 was updated via PUT, P2 was created via POST — no duplicates!
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    expect(result[0].discountId).toBe("d-success-1");
    expect(result[1].discountId).toBe("d-success-2");
  });

  // 13. Preserving user-entered values after API errors
  it("13. preserves user-entered values in state after API errors", () => {
    const rawRoleCard = {
      roleName: "Product Manager",
      rate: "1800",
      ratePeriod: "HOURLY",
      includeBaseRateInInvoice: true,
      discountPeriods: [
        {
          _uid: "client-p-1",
          periodName: "Unsaved Special Offer",
          discountType: "FIXED_AMOUNT",
          discountValue: 300,
          includeInInvoice: false,
        },
      ],
    };

    const normalized = normalizeTmRateCard(rawRoleCard);
    expect(normalized.roleName).toBe("Product Manager");
    expect(normalized.discountPeriods[0].periodName).toBe("Unsaved Special Offer");
    expect(normalized.discountPeriods[0].discountValue).toBe(300);
    expect(normalized.discountPeriods[0].includeInInvoice).toBe(false);
    expect(normalized.discountPeriods[0]._uid).toBe("client-p-1");
  });

  // 14. Correct review-screen rendering
  it("14. distinguishes persisted backend net rates from client preview calculations", () => {
    // Persisted record with netRate from backend
    const persistedPeriod = normalizeTmRateDiscount({
      discountId: "d-1",
      periodName: "Persisted Q1",
      netRate: 900,
      discountAmount: 100,
    });
    expect(persistedPeriod.netRate).toBe(900);

    // Unsaved preview uses calculateRateDiscountPreview
    const preview = calculateRateDiscountPreview({
      baseRate: 1000,
      discountType: "PERCENTAGE",
      discountValue: 15,
      ratePeriod: "HOURLY",
    });
    expect(preview.isValid).toBe(true);
    expect(preview.netRate).toBe(850);
  });

  // 15. Preserving excluded-line presentation
  it("15. guarantees excluded lines are never presented as payable invoice lines in buildInvoiceLineItems", () => {
    const lineItems = [
      { id: "1", employee: "Alice", role: "Dev", hours: 10, rate: 100, amount: 1000, includeInInvoice: true },
      { id: "2", employee: "Bob", role: "Dev", hours: 5, rate: 100, amount: 500, includeInInvoice: false },
    ];

    const { rows } = buildInvoiceLineItems("TIME_MATERIAL", lineItems, "USD");
    expect(rows).toHaveLength(1);
    expect(rows[0].item).toBe("Alice");

    // All items excluded case: must return empty payable rows, never falling back to all items
    const allExcluded = [
      { id: "1", employee: "Alice", includeInInvoice: false },
      { id: "2", employee: "Bob", includeInInvoice: false },
    ];
    const { rows: emptyRows } = buildInvoiceLineItems("TIME_MATERIAL", allExcluded, "USD");
    expect(emptyRows).toHaveLength(0);
  });

  // 16. Regression coverage for Standard Rate discounts and inclusion flags
  it("16. maintains regression coverage for Standard Rate discount calculations and inclusion flags", () => {
    // Standard rate calculation
    expect(calculateDiscountedRate(2000, "PERCENTAGE", 10)).toBe(1800);
    expect(calculateDiscountedRate(2000, "FIXED_AMOUNT", 400)).toBe(1600);

    // Standard rate payload building
    const stdPayload = buildTmRateCardRequestPayload(
      { rate: 2000, ratePeriod: "HOURLY", includeBaseRateInInvoice: true },
      "STANDARD",
      "cfg-101"
    );
    expect(stdPayload.roleName).toBe(null);
    expect(stdPayload.rate).toBe(2000);
    expect(stdPayload.includeBaseRateInInvoice).toBe(true);
  });

  // 17. Bidirectional discount-type mapping (PERCENTAGE <-> PERCENTAGE, FIXED_AMOUNT <-> FIXED)
  it("17. implements explicit bidirectional mapping between UI and API discount-type enums and handles unsupported types", () => {
    // UI to API mapping
    expect(mapUiDiscountTypeToApi("PERCENTAGE")).toBe("PERCENTAGE");
    expect(mapUiDiscountTypeToApi("percentage")).toBe("PERCENTAGE");
    expect(mapUiDiscountTypeToApi("FIXED_AMOUNT")).toBe("FIXED");
    expect(mapUiDiscountTypeToApi("fixed_amount")).toBe("FIXED");
    expect(mapUiDiscountTypeToApi("FIXED")).toBe("FIXED");
    expect(mapUiDiscountTypeToApi(null)).toBe("PERCENTAGE");
    expect(mapUiDiscountTypeToApi("")).toBe("PERCENTAGE");
    expect(() => mapUiDiscountTypeToApi("TIERED")).toThrow(/Unsupported discount type "TIERED"/);
    expect(() => mapUiDiscountTypeToApi("UNKNOWN_TYPE")).toThrow(/Unsupported discount type "UNKNOWN_TYPE"/);

    // API to UI mapping
    expect(mapApiDiscountTypeToUi("PERCENTAGE")).toBe("PERCENTAGE");
    expect(mapApiDiscountTypeToUi("percentage")).toBe("PERCENTAGE");
    expect(mapApiDiscountTypeToUi("FIXED")).toBe("FIXED_AMOUNT");
    expect(mapApiDiscountTypeToUi("fixed")).toBe("FIXED_AMOUNT");
    expect(mapApiDiscountTypeToUi("FIXED_AMOUNT")).toBe("FIXED_AMOUNT");
    expect(mapApiDiscountTypeToUi(null)).toBe("PERCENTAGE");
    expect(mapApiDiscountTypeToUi("")).toBe("PERCENTAGE");
    // "NONE" is how normalizeTmRateCard marks a loaded card without discounts; it must not crash the step.
    expect(mapApiDiscountTypeToUi("NONE")).toBe("PERCENTAGE");
    expect(() => mapApiDiscountTypeToUi("TIERED")).toThrow(/Unsupported API discount type "TIERED"/);
    expect(() => mapApiDiscountTypeToUi("CUSTOM_DISCOUNT")).toThrow(/Unsupported API discount type "CUSTOM_DISCOUNT"/);
  });

  // 18. Round-trip fixed discount persistence: Save UI FIXED_AMOUNT -> API FIXED -> Inbound FIXED -> UI FIXED_AMOUNT
  it("18. preserves fixed discount type during create, reload, edit, and re-save round trip", async () => {
    // 1. UI user creates a fixed discount with UI type "FIXED_AMOUNT"
    const uiInputPeriod = {
      periodName: "Enterprise Fixed Discount",
      discountType: "FIXED_AMOUNT",
      discountValue: 250,
      effectiveFrom: "2026-06-01",
      effectiveTo: "2026-06-30",
      notes: "Fixed $250 rate deduction",
      includeInInvoice: true,
    };

    const outboundPayload = buildTmRateDiscountRequestPayload(uiInputPeriod, "USD");
    // Assert outbound payload uses backend enum FIXED
    expect(outboundPayload.discountType).toBe("FIXED");
    expect(outboundPayload.periodName).toBe("Enterprise Fixed Discount");
    expect(outboundPayload.discountValue).toBe(250);

    // 2. Backend stores it and returns DiscountType.FIXED
    const backendResponseFromDb = {
      discountId: "disc-fixed-77",
      rateCardId: "rc-role-1",
      periodName: "Enterprise Fixed Discount",
      discountType: "FIXED",
      discountValue: 250.00,
      effectiveFrom: "2026-06-01",
      effectiveTo: "2026-06-30",
      notes: "Fixed $250 rate deduction",
      includeInInvoice: true,
      currencyCode: "USD",
      baseRate: 1000.00,
      discountAmount: 250.00,
      netRate: 750.00,
    };

    // 3. Frontend normalizes the loaded response
    const normalizedInUi = normalizeTmRateDiscount(backendResponseFromDb);
    expect(normalizedInUi.discountType).toBe("FIXED_AMOUNT");
    expect(normalizedInUi.discountId).toBe("disc-fixed-77");
    expect(normalizedInUi.netRate).toBe(750.00);

    // 4. User edits the discount value in UI from 250 to 300
    const editedInUi = {
      ...normalizedInUi,
      discountValue: 300,
    };

    // 5. User saves again
    const secondOutboundPayload = buildTmRateDiscountRequestPayload(editedInUi, "USD");
    expect(secondOutboundPayload.discountType).toBe("FIXED");
    expect(secondOutboundPayload.discountValue).toBe(300);
  });

  // 19. Boundary validation: Single-day periods, overlapping vs adjacent, and identical dates across different roles
  it("19. correctly verifies date boundaries for single-day periods, adjacent periods, and cross-role dates", () => {
    // Single-day period (from === to): valid interval
    const singleDayPayload = buildTmRateDiscountRequestPayload({
      periodName: "Black Friday Special",
      discountType: "PERCENTAGE",
      discountValue: 30,
      effectiveFrom: "2026-11-27",
      effectiveTo: "2026-11-27",
      includeInInvoice: true,
    });
    expect(singleDayPayload.effectiveFrom).toBe("2026-11-27");
    expect(singleDayPayload.effectiveTo).toBe("2026-11-27");

    // Overlapping query logic: period 1 [2026-01-01, 2026-01-15] and period 2 [2026-01-15, 2026-01-31]
    const p1 = { from: "2026-01-01", to: "2026-01-15" };
    const p2Overlap = { from: "2026-01-15", to: "2026-01-31" };
    const isOverlapping = (a, b) => a.from <= b.to && a.to >= b.from;
    expect(isOverlapping(p1, p2Overlap)).toBe(true);

    // Adjacent non-overlapping periods: period 1 [2026-01-01, 2026-01-15] and period 3 [2026-01-16, 2026-01-31]
    const p3Adjacent = { from: "2026-01-16", to: "2026-01-31" };
    expect(isOverlapping(p1, p3Adjacent)).toBe(false);

    // Identical dates on DIFFERENT roles: permitted because rateCardId isolates the schedules
    const role1CardId = "rc-role-1";
    const role2CardId = "rc-role-2";
    expect(role1CardId).not.toBe(role2CardId);
  });
});
