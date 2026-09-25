import { describe, it, expect } from "vitest";
import { buildTaxConfigurationPayload, deriveTaxComponentRows } from "./taxRuleComponents";
import { normalizeTaxRateConfiguration } from "../services/taxRateConfigurationService";

describe("Tax Configuration Component-Based Mapping and Normalization", () => {
  const mockTaxTypes = [
    {
      id: "tt-cgst-001",
      taxTypeId: "tt-cgst-001",
      taxTypeCode: "CGST",
      taxTypeName: "Central GST",
      isActive: true,
    },
    {
      id: "tt-sgst-002",
      taxTypeId: "tt-sgst-002",
      taxTypeCode: "SGST",
      taxTypeName: "State GST",
      isActive: true,
    },
    {
      id: "tt-igst-003",
      taxTypeId: "tt-igst-003",
      taxTypeCode: "IGST",
      taxTypeName: "Integrated GST",
      isActive: true,
    },
  ];

  const mockRegion = {
    taxRegionId: "reg-india-001",
    taxRegionName: "India",
    taxRegionCode: "IN",
  };

  // CASE 1: CGST = 9, SGST = 9, IGST = 0
  it("CASE 1: creates 2 SAME_JURISDICTION components for CGST=9, SGST=9, IGST=0", () => {
    const formData = {
      taxRegime: "GST",
      cgstRate: "9",
      sgstRate: "9",
      igstRate: "0",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      active: true,
    };

    const payload = buildTaxConfigurationPayload(formData, mockRegion, mockTaxTypes);

    expect(payload).toEqual({
      taxRegionId: "reg-india-001",
      taxRegime: "GST",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      components: [
        {
          taxTypeId: "tt-cgst-001",
          taxRate: 9,
          applicabilityType: "SAME_JURISDICTION",
        },
        {
          taxTypeId: "tt-sgst-002",
          taxRate: 9,
          applicabilityType: "SAME_JURISDICTION",
        },
      ],
    });

    // Verify root forbidden fields are not present
    expect(payload.cgstRate).toBeUndefined();
    expect(payload.sgstRate).toBeUndefined();
    expect(payload.igstRate).toBeUndefined();
    expect(payload.taxRegionName).toBeUndefined();
    expect(payload.taxRegionCode).toBeUndefined();
    expect(payload.taxType).toBeUndefined();
    expect(payload.active).toBeUndefined();
    expect(payload.isActive).toBeUndefined();
  });

  // CASE 2: CGST = 0, SGST = 0, IGST = 18
  it("CASE 2: creates 1 DIFFERENT_JURISDICTION component for IGST=18, CGST=0, SGST=0", () => {
    const formData = {
      taxRegime: "GST",
      cgstRate: "0",
      sgstRate: "0",
      igstRate: "18",
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      active: true,
    };

    const payload = buildTaxConfigurationPayload(formData, mockRegion, mockTaxTypes);

    expect(payload).toEqual({
      taxRegionId: "reg-india-001",
      taxRegime: "GST",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      components: [
        {
          taxTypeId: "tt-igst-003",
          taxRate: 18,
          applicabilityType: "DIFFERENT_JURISDICTION",
        },
      ],
    });
  });

  // CASE 3: All zero rates or missing rates
  it("CASE 3: blocks submission when all rates are zero or invalid", () => {
    const formData = {
      taxRegime: "GST",
      cgstRate: "0",
      sgstRate: "0",
      igstRate: "0",
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
    };

    expect(() => buildTaxConfigurationPayload(formData, mockRegion, mockTaxTypes)).toThrow(
      "At least one tax component with a valid positive rate is required."
    );
  });

  // CASE 4: Missing CGST tax type master record
  it("CASE 4: blocks submission with meaningful error when required tax type is missing from master data", () => {
    const formData = {
      taxRegime: "GST",
      cgstRate: "9",
      sgstRate: "9",
      igstRate: "0",
      effectiveFrom: "2026-01-01",
    };

    const partialTaxTypes = [
      { id: "tt-sgst-002", taxTypeCode: "SGST", taxTypeName: "State GST" },
      { id: "tt-igst-003", taxTypeCode: "IGST", taxTypeName: "Integrated GST" },
    ];

    expect(() => buildTaxConfigurationPayload(formData, mockRegion, partialTaxTypes)).toThrow(
      "Active CGST tax type record was not found. Please verify Tax Type Master configuration."
    );
  });

  // CASE 5: GET response with components[]
  it("CASE 5: normalizes component-based GET response into flat UI rates", () => {
    const backendResponse = {
      taxConfigurationId: "cfg-001",
      taxRegionId: "reg-india-001",
      taxRegionCode: "IN",
      taxRegionName: "India",
      taxRegime: "GST",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      isActive: true,
      components: [
        {
          taxConfigurationComponentId: "tcc-1",
          taxTypeId: "tt-cgst-001",
          taxTypeCode: "CGST",
          taxTypeName: "Central GST",
          taxRate: 9,
          applicabilityType: "SAME_JURISDICTION",
          isActive: true,
        },
        {
          taxConfigurationComponentId: "tcc-2",
          taxTypeId: "tt-sgst-002",
          taxTypeCode: "SGST",
          taxTypeName: "State GST",
          taxRate: 9,
          applicabilityType: "SAME_JURISDICTION",
          isActive: true,
        },
      ],
    };

    const normalized = normalizeTaxRateConfiguration(backendResponse);

    expect(normalized.id).toBe("cfg-001");
    expect(normalized.cgstRate).toBe(9);
    expect(normalized.sgstRate).toBe(9);
    expect(normalized.igstRate).toBeNull();
    expect(normalized.components).toHaveLength(2);
    expect(normalized.active).toBe(true);

    // Also verify deriveTaxComponentRows displays both CGST and SGST rows
    const rows = deriveTaxComponentRows([normalized]);
    expect(rows).toHaveLength(2);
    expect(rows[0].component).toBe("CGST");
    expect(rows[0].cgstRate).toBe(9);
    expect(rows[1].component).toBe("SGST");
    expect(rows[1].sgstRate).toBe(9);
  });

  // CASE 6: Legacy GET response with flat fields
  it("CASE 6: retains fallback for legacy GET response with flat fields", () => {
    const legacyResponse = {
      id: "legacy-cfg-002",
      taxRegionId: "reg-india-001",
      taxRegionCode: "IN",
      taxRegionName: "India",
      taxRegime: "GST",
      cgstRate: 9,
      sgstRate: 9,
      igstRate: null,
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      active: true,
    };

    const normalized = normalizeTaxRateConfiguration(legacyResponse);

    expect(normalized.id).toBe("legacy-cfg-002");
    expect(normalized.cgstRate).toBe(9);
    expect(normalized.sgstRate).toBe(9);
    expect(normalized.igstRate).toBeNull();
  });

  // CASE 7: Edit CGST 9 → 8 while SGST remains 9
  it("CASE 7: creates complete component list when editing CGST 9 to 8 with SGST remaining 9", () => {
    const editingFormData = {
      taxRegime: "GST",
      cgstRate: "8",
      sgstRate: "9",
      igstRate: "0",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      active: true,
    };

    const putPayload = buildTaxConfigurationPayload(editingFormData, mockRegion, mockTaxTypes);

    expect(putPayload.components).toEqual([
      {
        taxTypeId: "tt-cgst-001",
        taxRate: 8,
        applicabilityType: "SAME_JURISDICTION",
      },
      {
        taxTypeId: "tt-sgst-002",
        taxRate: 9,
        applicabilityType: "SAME_JURISDICTION",
      },
    ]);
  });
});
