import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

import TaxRuleFormModal from "./TaxRuleFormModal";
import * as taxRateConfigService from "../../services/taxRateConfigurationService";
import * as taxStructureService from "../../services/taxStructureService";
import * as toastfy from "../../../../components/toastfy/toast";

vi.mock("../../../../components/toastfy/toast", () => ({
  showStatusToast: vi.fn(),
}));

const component = (id, taxTypeId, name, displayOrder, extra = {}) => ({
  taxComponentId: id,
  taxTypeId,
  taxTypeCode: name,
  componentCode: name,
  componentName: `${name} Rate`,
  inputType: "PERCENTAGE",
  displayOrder,
  ...extra,
});

const structures = {
  "reg-in": taxStructureService.normalizeTaxStructure({
    taxRegion: { taxRegionId: "reg-in", taxRegionCode: "IN", taxRegionName: "India", currencyCode: "INR" },
    taxRegimes: [
      {
        taxRegimeId: "regime-gst",
        taxRegimeCode: "GST",
        taxRegimeName: "GST",
        components: [
          component("c-cgst", "tt-cgst", "CGST", 1),
          component("c-sgst", "tt-sgst", "SGST", 2),
          component("c-igst", "tt-igst", "IGST", 3),
        ],
      },
    ],
  }),
  "reg-uk": taxStructureService.normalizeTaxStructure({
    taxRegion: { taxRegionId: "reg-uk", taxRegionCode: "UK", taxRegionName: "United Kingdom", currencyCode: "GBP" },
    taxRegimes: [
      { taxRegimeId: "regime-vat", taxRegimeCode: "VAT", taxRegimeName: "VAT", components: [component("c-vat", "tt-vat", "VAT", 1)] },
    ],
  }),
  "reg-empty": taxStructureService.normalizeTaxStructure({
    taxRegion: { taxRegionId: "reg-empty", taxRegionCode: "XX", taxRegionName: "Nowhere" },
    taxRegimes: [],
  }),
};

const regions = [
  { taxRegionId: "reg-in", taxRegionCode: "IN", taxRegionName: "India", currencyCode: "INR", label: "India (IN)" },
  { taxRegionId: "reg-uk", taxRegionCode: "UK", taxRegionName: "United Kingdom", currencyCode: "GBP", label: "United Kingdom (UK)" },
];

describe("TaxRuleFormModal (structure-driven)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(taxStructureService, "getTaxStructureByRegion").mockImplementation((id) =>
      structures[id] ? Promise.resolve(structures[id]) : Promise.reject({ response: { status: 500, data: { message: "Boom" } } })
    );
    vi.spyOn(taxRateConfigService, "getActiveTaxRegions").mockResolvedValue(regions);
  });

  it("renders one field per component of the region's regime (UK VAT)", async () => {
    render(<TaxRuleFormModal isOpen onClose={vi.fn()} region={regions[1]} />);

    expect(await screen.findByLabelText("VAT Rate (%)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/cgst/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/tax regime \/ type/i)).toHaveValue("regime-vat");
  });

  it("renders components in displayOrder and submits the existing DTO shape", async () => {
    const createSpy = vi.spyOn(taxRateConfigService, "createTaxRateConfiguration").mockResolvedValue({ id: "new" });
    render(<TaxRuleFormModal isOpen onClose={vi.fn()} region={regions[0]} />);

    await screen.findByLabelText("CGST Rate (%)");
    const labels = screen.getAllByLabelText(/rate \(%\)/i).map((el) => el.name);
    expect(labels).toEqual(["taxComponent-c-cgst", "taxComponent-c-sgst", "taxComponent-c-igst"]);

    fireEvent.change(screen.getByLabelText("IGST Rate (%)"), { target: { value: "18" } });
    fireEvent.change(screen.getByLabelText(/effective from/i), { target: { value: "2027-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: /create configuration/i }));

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith({
        taxRegionId: "reg-in",
        taxRegimeId: "regime-gst",
        taxRegime: "GST",
        effectiveFrom: "2027-01-01",
        effectiveTo: null,
        components: [{ taxTypeId: "tt-igst", taxRate: 18, applicabilityType: "ALL" }],
      })
    );
    expect(toastfy.showStatusToast).toHaveBeenCalledWith("Tax rule created successfully.", "success");
  });

  it("blocks invalid percentages using metadata-driven validation", async () => {
    const createSpy = vi.spyOn(taxRateConfigService, "createTaxRateConfiguration");
    render(<TaxRuleFormModal isOpen onClose={vi.fn()} region={regions[1]} />);

    fireEvent.change(await screen.findByLabelText("VAT Rate (%)"), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: /create configuration/i }));

    expect(await screen.findByText(/between 0 and 100%/i)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("clears previous region's components when the region changes", async () => {
    const createSpy = vi.spyOn(taxRateConfigService, "createTaxRateConfiguration").mockResolvedValue({ id: "new" });
    render(<TaxRuleFormModal isOpen onClose={vi.fn()} />);

    const regionSelect = await screen.findByLabelText(/tax region/i);
    await screen.findByRole("option", { name: "India (IN)" });
    fireEvent.change(regionSelect, { target: { value: "reg-in" } });
    fireEvent.change(await screen.findByLabelText("CGST Rate (%)"), { target: { value: "9" } });

    fireEvent.change(regionSelect, { target: { value: "reg-uk" } });
    fireEvent.change(await screen.findByLabelText("VAT Rate (%)"), { target: { value: "20" } });
    expect(screen.queryByLabelText("CGST Rate (%)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /create configuration/i }));
    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    expect(createSpy.mock.calls[0][0].components).toEqual([{ taxTypeId: "tt-vat", taxRate: 20, applicabilityType: "ALL" }]);
  });

  it("shows an empty state when the region has no tax regime", async () => {
    render(<TaxRuleFormModal isOpen onClose={vi.fn()} region={{ taxRegionId: "reg-empty", label: "Nowhere (XX)" }} />);
    expect(await screen.findByText(/no tax regime is configured for this region/i)).toBeInTheDocument();
  });

  it("shows the API error with a retry when the structure fails to load", async () => {
    render(<TaxRuleFormModal isOpen onClose={vi.fn()} region={{ taxRegionId: "reg-broken", label: "Broken" }} />);
    expect(await screen.findByText("Boom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("edit mode resolves the configured regime and pre-fills values", async () => {
    const updateSpy = vi.spyOn(taxRateConfigService, "updateTaxRateConfiguration").mockResolvedValue({ id: "cfg-1" });
    const editingConfig = {
      id: "cfg-1",
      taxRegionId: "reg-in",
      taxRegime: "GST",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      active: true,
      components: [
        { taxTypeId: "tt-cgst", taxTypeCode: "CGST", taxRate: 9, applicabilityType: "SAME_JURISDICTION" },
        { taxTypeId: "tt-sgst", taxTypeCode: "SGST", taxRate: 9, applicabilityType: "SAME_JURISDICTION" },
      ],
    };

    render(<TaxRuleFormModal isOpen onClose={vi.fn()} region={regions[0]} editingConfig={editingConfig} />);

    expect(await screen.findByLabelText("CGST Rate (%)")).toHaveValue(9);
    expect(screen.getByLabelText("SGST Rate (%)")).toHaveValue(9);
    expect(screen.getByLabelText("IGST Rate (%)")).toHaveValue(null);

    fireEvent.change(screen.getByLabelText("CGST Rate (%)"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: /update configuration/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith("cfg-1", {
        taxRegionId: "reg-in",
        taxRegimeId: "regime-gst",
        taxRegime: "GST",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-12-31",
        components: [
          { taxTypeId: "tt-cgst", taxRate: 8, applicabilityType: "SAME_JURISDICTION" },
          { taxTypeId: "tt-sgst", taxRate: 9, applicabilityType: "SAME_JURISDICTION" },
        ],
      })
    );
  });
});
