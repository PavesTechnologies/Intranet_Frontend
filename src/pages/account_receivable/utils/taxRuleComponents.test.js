import { describe, it, expect } from "vitest";
import {
  buildComponentValues,
  buildTaxConfigurationPayload,
  deriveTaxComponentRows,
  findUnmappedConfigComponents,
  getComponentLabel,
  resolveConfiguredRegime,
  validateComponentValues,
} from "./taxRuleComponents";
import { normalizeTaxRateConfiguration } from "../services/taxRateConfigurationService";
import { normalizeTaxStructure } from "../services/taxStructureService";

const comp = (id, taxTypeId, name, displayOrder, extra = {}) => ({
  taxComponentId: id,
  taxTypeId,
  taxTypeCode: name.toUpperCase(),
  taxTypeName: name,
  componentCode: name.toUpperCase(),
  componentName: `${name} Rate`,
  inputType: "PERCENTAGE",
  displayOrder,
  ...extra,
});

const indiaStructure = normalizeTaxStructure({
  taxRegion: { taxRegionId: "reg-in", taxRegionCode: "IN", taxRegionName: "India", currencyCode: "INR" },
  taxRegimes: [
    {
      taxRegimeId: "regime-gst",
      taxRegimeCode: "GST",
      taxRegimeName: "GST",
      // Deliberately out of order: the form must sort by displayOrder.
      components: [
        comp("c-igst", "tt-igst", "IGST", 3),
        comp("c-cgst", "tt-cgst", "CGST", 1),
        comp("c-sgst", "tt-sgst", "SGST", 2),
      ],
    },
  ],
});
const gst = indiaStructure.taxRegimes[0];

const ukStructure = normalizeTaxStructure({
  taxRegion: { taxRegionId: "reg-uk", taxRegionCode: "UK", taxRegionName: "United Kingdom", currencyCode: "GBP" },
  taxRegimes: [
    {
      taxRegimeId: "regime-vat",
      taxRegimeCode: "VAT",
      taxRegimeName: "VAT",
      components: [comp("c-vat", "tt-vat", "VAT", 1), comp("c-fee", "tt-fee", "Env Fee", 2, { inputType: "FIXED_AMOUNT" })],
    },
  ],
});
const vat = ukStructure.taxRegimes[0];

const valuesFor = (regime, map) =>
  buildComponentValues(regime).map((v) => ({ ...v, ...(map[v.taxComponentId] || {}) }));

describe("Tax structure normalization", () => {
  it("sorts regime components by displayOrder", () => {
    expect(gst.components.map((c) => c.taxComponentId)).toEqual(["c-cgst", "c-sgst", "c-igst"]);
  });

  it("labels fields by input type without knowing the component", () => {
    expect(getComponentLabel(vat.components[0], "GBP")).toBe("VAT Rate (%)");
    expect(getComponentLabel(vat.components[1], "GBP")).toBe("Env Fee Rate (GBP)");
  });
});

describe("buildTaxConfigurationPayload (TaxConfigurationRequestDto)", () => {
  it("maps CGST=9, SGST=9 to two components and omits blank/zero IGST", () => {
    const payload = buildTaxConfigurationPayload({
      taxRegionId: "reg-in",
      regime: gst,
      componentValues: valuesFor(gst, {
        "c-cgst": { value: "9", applicabilityType: "SAME_JURISDICTION" },
        "c-sgst": { value: "9", applicabilityType: "SAME_JURISDICTION" },
        "c-igst": { value: "0" },
      }),
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
    });

    expect(payload).toEqual({
      taxRegionId: "reg-in",
      taxRegimeId: "regime-gst",
      taxRegime: "GST",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      components: [
        { taxTypeId: "tt-cgst", taxRate: 9, applicabilityType: "SAME_JURISDICTION" },
        { taxTypeId: "tt-sgst", taxRate: 9, applicabilityType: "SAME_JURISDICTION" },
      ],
    });
    expect(payload.active).toBeUndefined();
    expect(payload.cgstRate).toBeUndefined();
  });

  it("works for a single-component regime without any region-specific code", () => {
    const payload = buildTaxConfigurationPayload({
      taxRegionId: "reg-uk",
      regime: vat,
      componentValues: valuesFor(vat, { "c-vat": { value: "20" } }),
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
    });

    expect(payload).toEqual({
      taxRegionId: "reg-uk",
      taxRegimeId: "regime-vat",
      taxRegime: "VAT",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      components: [{ taxTypeId: "tt-vat", taxRate: 20, applicabilityType: "ALL" }],
    });
  });

  it("never sends values that do not belong to the selected regime", () => {
    const leftovers = [
      ...valuesFor(gst, { "c-cgst": { value: "9" } }),
      ...valuesFor(vat, { "c-vat": { value: "20" } }),
    ];
    const payload = buildTaxConfigurationPayload({
      taxRegionId: "reg-uk",
      regime: vat,
      componentValues: leftovers,
      effectiveFrom: "2026-01-01",
    });
    expect(payload.components.map((c) => c.taxTypeId)).toEqual(["tt-vat"]);
  });

  it("blocks submission when every value is blank or zero", () => {
    expect(() =>
      buildTaxConfigurationPayload({
        taxRegionId: "reg-in",
        regime: gst,
        componentValues: valuesFor(gst, { "c-cgst": { value: "0" } }),
        effectiveFrom: "2026-01-01",
      })
    ).toThrow("At least one tax component with a valid positive rate is required.");
  });
});

describe("validateComponentValues", () => {
  it("rejects negative and out-of-range percentages from metadata, not component names", () => {
    const errors = validateComponentValues(
      gst,
      valuesFor(gst, { "c-cgst": { value: "-1" }, "c-sgst": { value: "101" }, "c-igst": { value: "abc" } })
    );
    expect(errors["c-cgst"]).toMatch(/between 0 and 100/);
    expect(errors["c-sgst"]).toMatch(/between 0 and 100/);
    expect(errors["c-igst"]).toBe("Enter a valid percentage");
  });

  it("allows fixed amounts above 100 but not negative", () => {
    expect(validateComponentValues(vat, valuesFor(vat, { "c-fee": { value: "250" } }))).toEqual({});
    expect(validateComponentValues(vat, valuesFor(vat, { "c-fee": { value: "-5" } }))["c-fee"]).toMatch(
      /cannot be less than 0/
    );
  });

  it("honours backend min/max/required metadata", () => {
    const regime = normalizeTaxStructure({
      taxRegimes: [
        { taxRegimeId: "r", taxRegimeCode: "X", components: [comp("c1", "t1", "X", 1, { maxValue: 15, required: true })] },
      ],
    }).taxRegimes[0];
    expect(validateComponentValues(regime, valuesFor(regime, {}))["c1"]).toBe("This value is required");
    expect(validateComponentValues(regime, valuesFor(regime, { c1: { value: "16" } }))["c1"]).toMatch(/0 and 15/);
  });

  it("requires at least one positive value", () => {
    expect(validateComponentValues(gst, valuesFor(gst, {}))._components).toBeDefined();
  });
});

describe("Edit mode helpers", () => {
  const existing = normalizeTaxRateConfiguration({
    taxConfigurationId: "cfg-001",
    taxRegionId: "reg-in",
    taxRegime: "GST",
    effectiveFrom: "2026-01-01",
    isActive: true,
    components: [
      { taxConfigurationComponentId: "tcc-1", taxTypeId: "tt-cgst", taxTypeCode: "CGST", taxRate: 9, applicabilityType: "SAME_JURISDICTION" },
      { taxConfigurationComponentId: "tcc-2", taxTypeId: "tt-sgst", taxTypeCode: "SGST", taxRate: 9, applicabilityType: "SAME_JURISDICTION" },
    ],
  });

  it("resolves the configured regime and pre-fills values and applicability", () => {
    const regime = resolveConfiguredRegime(indiaStructure.taxRegimes, existing);
    expect(regime.taxRegimeId).toBe("regime-gst");
    expect(buildComponentValues(regime, existing)).toEqual([
      { taxComponentId: "c-cgst", value: "9", applicabilityType: "SAME_JURISDICTION" },
      { taxComponentId: "c-sgst", value: "9", applicabilityType: "SAME_JURISDICTION" },
      { taxComponentId: "c-igst", value: "", applicabilityType: "ALL" },
    ]);
  });

  it("falls back to component overlap when the stored regime label does not match", () => {
    const regime = resolveConfiguredRegime(indiaStructure.taxRegimes, { ...existing, taxRegime: "Goods & Services" });
    expect(regime.taxRegimeId).toBe("regime-gst");
  });

  it("reports configured components the regime has no field for", () => {
    expect(findUnmappedConfigComponents(gst, existing)).toEqual([]);
    expect(findUnmappedConfigComponents(vat, existing)).toHaveLength(2);
  });

  it("re-submitting an edited config keeps every component", () => {
    const values = buildComponentValues(gst, existing).map((v) => (v.taxComponentId === "c-cgst" ? { ...v, value: "8" } : v));
    const payload = buildTaxConfigurationPayload({
      taxRegionId: "reg-in",
      regime: gst,
      componentValues: values,
      effectiveFrom: "2026-01-01",
    });
    expect(payload.components).toEqual([
      { taxTypeId: "tt-cgst", taxRate: 8, applicabilityType: "SAME_JURISDICTION" },
      { taxTypeId: "tt-sgst", taxRate: 9, applicabilityType: "SAME_JURISDICTION" },
    ]);
  });
});

describe("Configuration normalization and rows", () => {
  it("derives one row per configured component", () => {
    const normalized = normalizeTaxRateConfiguration({
      taxConfigurationId: "cfg-001",
      taxRegionId: "reg-in",
      taxRegime: "GST",
      components: [
        { taxTypeId: "tt-cgst", taxTypeCode: "CGST", taxRate: 9 },
        { taxTypeId: "tt-sgst", taxTypeCode: "SGST", taxRate: 9 },
      ],
    });
    const rows = deriveTaxComponentRows([normalized]);
    expect(rows.map((r) => [r.component, r.taxRate])).toEqual([
      ["CGST", 9],
      ["SGST", 9],
    ]);
  });

  it("keeps a row for a configuration with no components", () => {
    const rows = deriveTaxComponentRows([{ taxRegime: "VAT", components: [] }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].component).toBe("VAT");
  });

  it("retains fallback for legacy GET response with flat fields", () => {
    const normalized = normalizeTaxRateConfiguration({
      id: "legacy-cfg-002",
      taxRegionId: "reg-in",
      taxRegime: "GST",
      cgstRate: 9,
      sgstRate: 9,
      igstRate: null,
      effectiveFrom: "2026-01-01",
      active: true,
    });
    expect(normalized.id).toBe("legacy-cfg-002");
    expect(normalized.cgstRate).toBe(9);
  });
});
