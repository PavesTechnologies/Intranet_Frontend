import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../../../api/axiosInstance";
import { clearTaxStructureCache, getTaxStructureByRegion } from "./taxStructureService";
import { normalizeTaxRateConfiguration } from "./taxRateConfigurationService";
import { buildComponentValues, buildTaxConfigurationPayload, resolveConfiguredRegime } from "../utils/taxRuleComponents";

// Responses captured from the AR Spring Boot backend (GET /api/tax-structure/regions/{id}
// and GET /api/v1/tax-rate-configurations), kept verbatim to pin the real wire format.
const realIndiaStructureResponse = {
  success: true,
  message: "Tax structure retrieved successfully.",
  data: {
    taxRegion: {
      taxRegionId: "39262d7c-4787-42b9-91ca-0d558bc7397d",
      taxRegionCode: "IN",
      taxRegionName: "India",
      currencyCode: "INR",
    },
    taxRegimes: [],
  },
  timestamp: null,
};

const realIndiaConfig = {
  taxConfigurationId: "212d8cb0-959e-4ec0-a90f-ecef914ef641",
  taxRegionId: "39262d7c-4787-42b9-91ca-0d558bc7397d",
  taxRegionCode: "IN",
  taxRegionName: "India",
  taxRegimeId: null,
  taxRegime: "GST",
  effectiveFrom: [2026, 1, 1],
  effectiveTo: [2026, 12, 31],
  isActive: true,
  components: [
    { taxConfigurationComponentId: "42f448c6", taxTypeId: "3b3781b6-439a-43be-be65-a128feb794ee", taxTypeCode: "CGST", taxTypeName: "Central Goods and Services Tax", taxRate: 9.0, applicabilityType: "SAME_JURISDICTION", isActive: true },
    { taxConfigurationComponentId: "a67cc248", taxTypeId: "50b8a2a1-87cb-4ff3-86ee-0cc46f3224f4", taxTypeCode: "IGST", taxTypeName: "Integrated Goods and Services Tax", taxRate: 9.0, applicabilityType: "DIFFERENT_JURISDICTION", isActive: true },
    { taxConfigurationComponentId: "b9d8e485", taxTypeId: "d5b07eb3-2317-47cc-b214-06e8ffd56803", taxTypeCode: "SGST", taxTypeName: "State Goods and Services Tax", taxRate: 9.0, applicabilityType: "SAME_JURISDICTION", isActive: true },
  ],
};

// Shape of TaxStructureResponseDto.TaxRegimeStructure / TaxComponentInfo per the
// backend OpenAPI schema (no regimes are seeded yet, so none are returned live).
const regimeFromSchema = {
  taxRegimeId: "regime-gst",
  taxRegimeCode: "GST",
  taxRegimeName: "GST",
  description: null,
  components: [
    { taxComponentId: "tc-sgst", taxTypeId: "d5b07eb3-2317-47cc-b214-06e8ffd56803", taxTypeCode: "SGST", taxTypeName: "State Goods and Services Tax", componentCode: "SGST", componentName: "SGST", description: null, inputType: "PERCENTAGE", displayOrder: 2 },
    { taxComponentId: "tc-cgst", taxTypeId: "3b3781b6-439a-43be-be65-a128feb794ee", taxTypeCode: "CGST", taxTypeName: "Central Goods and Services Tax", componentCode: "CGST", componentName: "CGST", description: null, inputType: "PERCENTAGE", displayOrder: 1 },
    { taxComponentId: "tc-igst", taxTypeId: "50b8a2a1-87cb-4ff3-86ee-0cc46f3224f4", taxTypeCode: "IGST", taxTypeName: "Integrated Goods and Services Tax", componentCode: "IGST", componentName: "IGST", description: null, inputType: "PERCENTAGE", displayOrder: 3 },
  ],
};

describe("Tax structure integration with the real backend wire format", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearTaxStructureCache();
  });

  it("calls GET {AR_BASE_URL}/api/tax-structure/regions/{id} and unwraps the ApiResponse envelope", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({ data: realIndiaStructureResponse });

    const structure = await getTaxStructureByRegion("39262d7c-4787-42b9-91ca-0d558bc7397d");

    expect(getSpy).toHaveBeenCalledWith(
      `${window.__APP_CONFIG__.AR_BASE_URL}/api/tax-structure/regions/39262d7c-4787-42b9-91ca-0d558bc7397d`
    );
    expect(structure.taxRegion).toEqual({
      taxRegionId: "39262d7c-4787-42b9-91ca-0d558bc7397d",
      taxRegionCode: "IN",
      taxRegionName: "India",
      currencyCode: "INR",
    });
    expect(structure.taxRegimes).toEqual([]);
  });

  it("caches per region and re-fetches after a failure", async () => {
    const getSpy = vi
      .spyOn(api, "get")
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValue({ data: realIndiaStructureResponse });

    await expect(getTaxStructureByRegion("r1")).rejects.toThrow("down");
    await getTaxStructureByRegion("r1");
    await getTaxStructureByRegion("r1");
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it("normalizes LocalDate arrays and maps an existing GST config onto a schema-shaped regime", async () => {
    vi.spyOn(api, "get").mockResolvedValue({
      data: { ...realIndiaStructureResponse, data: { ...realIndiaStructureResponse.data, taxRegimes: [regimeFromSchema] } },
    });
    const structure = await getTaxStructureByRegion("39262d7c-4787-42b9-91ca-0d558bc7397d");
    const config = normalizeTaxRateConfiguration(realIndiaConfig);

    expect(config.effectiveFrom).toBe("2026-01-01");
    expect(config.effectiveTo).toBe("2026-12-31");
    expect(structure.taxRegimes[0].components.map((c) => c.componentName)).toEqual(["CGST", "SGST", "IGST"]);

    const regime = resolveConfiguredRegime(structure.taxRegimes, config);
    const values = buildComponentValues(regime, config);
    expect(values.map((v) => [v.value, v.applicabilityType])).toEqual([
      ["9", "SAME_JURISDICTION"],
      ["9", "SAME_JURISDICTION"],
      ["9", "DIFFERENT_JURISDICTION"],
    ]);

    expect(
      buildTaxConfigurationPayload({
        taxRegionId: config.taxRegionId,
        regime,
        componentValues: values,
        effectiveFrom: config.effectiveFrom,
        effectiveTo: config.effectiveTo,
      })
    ).toEqual({
      taxRegionId: "39262d7c-4787-42b9-91ca-0d558bc7397d",
      taxRegimeId: "regime-gst",
      taxRegime: "GST",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      components: [
        { taxTypeId: "3b3781b6-439a-43be-be65-a128feb794ee", taxRate: 9, applicabilityType: "SAME_JURISDICTION" },
        { taxTypeId: "d5b07eb3-2317-47cc-b214-06e8ffd56803", taxRate: 9, applicabilityType: "SAME_JURISDICTION" },
        { taxTypeId: "50b8a2a1-87cb-4ff3-86ee-0cc46f3224f4", taxRate: 9, applicabilityType: "DIFFERENT_JURISDICTION" },
      ],
    });
  });
});
