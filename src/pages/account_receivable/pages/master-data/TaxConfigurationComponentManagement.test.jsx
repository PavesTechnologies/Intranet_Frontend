import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import TaxConfigurationRegionDetailPage from "./TaxConfigurationRegionDetailPage";
import TaxComponentManagementModal from "../../components/master-data/TaxComponentManagementModal";
import TaxRuleFormModal from "../../components/master-data/TaxRuleFormModal";
import * as taxRegionService from "../../services/taxRegionService";
import * as taxRateConfigService from "../../services/taxRateConfigurationService";
import * as taxStructureService from "../../services/taxStructureService";
import * as toastfy from "../../../../components/toastfy/toast";

vi.mock("../../../../components/toastfy/toast", () => ({
  showStatusToast: vi.fn(),
}));

describe("Tax Configuration Component Management", () => {
  const mockRegion = {
    taxRegionId: "reg-india-001",
    taxRegionCode: "IN",
    taxRegionName: "India",
    taxRegime: "GST",
    currencyCode: "INR",
    description: "Indian Tax Region",
    status: "ACTIVE",
    isActive: true,
  };

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

  const mockConfigInitial = {
    id: "cfg-001",
    taxConfigurationId: "cfg-001",
    taxRegionId: "reg-india-001",
    taxRegionCode: "IN",
    taxRegionName: "India",
    taxRegime: "GST",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    active: true,
    isActive: true,
    status: "ACTIVE",
    components: [
      {
        id: "comp-cgst-1",
        taxConfigurationComponentId: "comp-cgst-1",
        taxTypeId: "tt-cgst-001",
        taxTypeCode: "CGST",
        taxTypeName: "Central GST",
        taxRate: 9,
        applicabilityType: "SAME_JURISDICTION",
        isActive: true,
        status: "ACTIVE",
      },
      {
        id: "comp-sgst-2",
        taxConfigurationComponentId: "comp-sgst-2",
        taxTypeId: "tt-sgst-002",
        taxTypeCode: "SGST",
        taxTypeName: "State GST",
        taxRate: 9,
        applicabilityType: "SAME_JURISDICTION",
        isActive: true,
        status: "ACTIVE",
      },
    ],
  };

  const mockConfigWithIgst = {
    ...mockConfigInitial,
    components: [
      ...mockConfigInitial.components,
      {
        id: "comp-igst-3",
        taxConfigurationComponentId: "comp-igst-3",
        taxTypeId: "tt-igst-003",
        taxTypeCode: "IGST",
        taxTypeName: "Integrated GST",
        taxRate: 18,
        applicabilityType: "DIFFERENT_JURISDICTION",
        isActive: true,
        status: "ACTIVE",
      },
    ],
  };

  const mockIndiaStructure = taxStructureService.normalizeTaxStructure({
    taxRegion: { taxRegionId: "reg-india-001", taxRegionCode: "IN", taxRegionName: "India", currencyCode: "INR" },
    taxRegimes: [
      {
        taxRegimeId: "regime-gst",
        taxRegimeCode: "GST",
        taxRegimeName: "GST",
        components: [
          { taxComponentId: "c-cgst", taxTypeId: "tt-cgst-001", taxTypeCode: "CGST", componentName: "CGST Rate", inputType: "PERCENTAGE", displayOrder: 1 },
          { taxComponentId: "c-sgst", taxTypeId: "tt-sgst-002", taxTypeCode: "SGST", componentName: "SGST Rate", inputType: "PERCENTAGE", displayOrder: 2 },
          { taxComponentId: "c-igst", taxTypeId: "tt-igst-003", taxTypeCode: "IGST", componentName: "IGST Rate", inputType: "PERCENTAGE", displayOrder: 3 },
        ],
      },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(taxStructureService, "getTaxStructureByRegion").mockResolvedValue(mockIndiaStructure);
  });

  const renderDetailPage = () => {
    return render(
      <MemoryRouter initialEntries={["/account-receivable/master-data/tax-configuration/reg-india-001"]}>
        <Routes>
          <Route
            path="/account-receivable/master-data/tax-configuration/:taxRegionId"
            element={<TaxConfigurationRegionDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    );
  };

  // Scenario 1: Existing configurations load correctly
  it("Scenario 1: Existing configurations load correctly and display in Tax Configurations tab", async () => {
    vi.spyOn(taxRegionService, "getTaxRegionById").mockResolvedValue(mockRegion);
    vi.spyOn(taxRateConfigService, "getTaxRateConfigurationsByTaxRegion").mockResolvedValue([mockConfigInitial]);
    vi.spyOn(taxRateConfigService, "getActiveTaxTypes").mockResolvedValue(mockTaxTypes);

    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText("India (IN)")).toBeInTheDocument();
    });

    // Switch to Tax Configurations tab
    const rulesTab = screen.getByRole("button", { name: /tax configurations & rules/i });
    fireEvent.click(rulesTab);

    // Verify configurations table displays
    await waitFor(() => {
      expect(screen.getByText(/2 components/i)).toBeInTheDocument();
      expect(screen.getByText("CGST: 9%")).toBeInTheDocument();
      expect(screen.getByText("SGST: 9%")).toBeInTheDocument();
    });
  });

  // Scenario 2: Configuration details display all persisted components
  it("Scenario 2: Configuration details display all persisted components in modal", async () => {
    const handleClose = vi.fn();
    render(
      <TaxComponentManagementModal
        isOpen={true}
        onClose={handleClose}
        configuration={mockConfigInitial}
        region={mockRegion}
        taxTypes={mockTaxTypes}
      />
    );

    expect(screen.getByText("Manage Tax Components")).toBeInTheDocument();
    expect(screen.getByText("cfg-001")).toBeInTheDocument();
    expect(screen.getByText("Central GST")).toBeInTheDocument();
    expect(screen.getByText("State GST")).toBeInTheDocument();
    expect(screen.getAllByText("9%")).toHaveLength(2);
    expect(screen.getAllByText("Same Jurisdiction")).toHaveLength(2);
  });

  // Scenario 3: Manage Components opens the selected configuration
  it("Scenario 3: Manage Components action opens modal for the selected configuration", async () => {
    vi.spyOn(taxRegionService, "getTaxRegionById").mockResolvedValue(mockRegion);
    vi.spyOn(taxRateConfigService, "getTaxRateConfigurationsByTaxRegion").mockResolvedValue([mockConfigInitial]);
    vi.spyOn(taxRateConfigService, "getActiveTaxTypes").mockResolvedValue(mockTaxTypes);

    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText("India (IN)")).toBeInTheDocument();
    });

    const rulesTab = screen.getByRole("button", { name: /tax configurations & rules/i });
    fireEvent.click(rulesTab);

    await waitFor(() => {
      expect(screen.getByText(/2 components/i)).toBeInTheDocument();
    });

    // Click the 2 Components button in the row
    fireEvent.click(screen.getByText(/2 components/i));

    // Verify component management modal opened
    await waitFor(() => {
      expect(screen.getByText("Manage Tax Components")).toBeInTheDocument();
      expect(screen.getByText("Configured Tax Components")).toBeInTheDocument();
    });
  });

  // Scenarios 4, 5, 6, 7: Add Component submits correct configuration ID, taxTypeId, taxRate, applicabilityType
  it("Scenarios 4-7: Add Component submits correct configuration ID, taxTypeId, rate, and applicability enum", async () => {
    const addSpy = vi.spyOn(taxRateConfigService, "addTaxConfigurationComponent").mockResolvedValue({
      id: "comp-igst-3",
      taxConfigurationComponentId: "comp-igst-3",
      taxTypeId: "tt-igst-003",
      taxTypeCode: "IGST",
      taxTypeName: "Integrated GST",
      taxRate: 18,
      applicabilityType: "DIFFERENT_JURISDICTION",
      isActive: true,
      status: "ACTIVE",
    });
    vi.spyOn(taxRateConfigService, "getTaxRateConfigurationById").mockResolvedValue(mockConfigWithIgst);

    const onSaved = vi.fn();

    render(
      <TaxComponentManagementModal
        isOpen={true}
        onClose={vi.fn()}
        configuration={mockConfigInitial}
        region={mockRegion}
        taxTypes={mockTaxTypes}
        onSaved={onSaved}
      />
    );

    // Click Add Component button
    const addBtn = screen.getByRole("button", { name: /add component/i });
    fireEvent.click(addBtn);

    // Tax type dropdown: select IGST
    const typeSelect = screen.getByRole("combobox", { name: /tax type/i });
    fireEvent.change(typeSelect, { target: { value: "tt-igst-003" } });

    // Rate input: enter 18
    const rateInput = screen.getByPlaceholderText("e.g. 9.00");
    fireEvent.change(rateInput, { target: { value: "18" } });

    // Applicability select
    const applicabilitySelect = screen.getByRole("combobox", { name: /applicability/i });
    fireEvent.change(applicabilitySelect, { target: { value: "DIFFERENT_JURISDICTION" } });

    // Submit form
    const saveBtn = screen.getByRole("button", { name: /save component/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith("cfg-001", {
        taxTypeId: "tt-igst-003",
        taxRate: 18,
        applicabilityType: "DIFFERENT_JURISDICTION",
      });
    });

    expect(toastfy.showStatusToast).toHaveBeenCalledWith("Tax component added successfully.", "success");
  });

  // Scenario 8 & 11: Successful component creation refreshes component list & CGST/SGST remain visible after adding IGST
  it("Scenario 8 & 11: Component list refreshes after add; CGST, SGST, and new IGST all remain visible", async () => {
    vi.spyOn(taxRateConfigService, "addTaxConfigurationComponent").mockResolvedValue({
      id: "comp-igst-3",
      taxConfigurationComponentId: "comp-igst-3",
      taxTypeId: "tt-igst-003",
      taxTypeCode: "IGST",
      taxTypeName: "Integrated GST",
      taxRate: 18,
      applicabilityType: "DIFFERENT_JURISDICTION",
      isActive: true,
      status: "ACTIVE",
    });
    vi.spyOn(taxRateConfigService, "getTaxRateConfigurationById").mockResolvedValue(mockConfigWithIgst);

    render(
      <TaxComponentManagementModal
        isOpen={true}
        onClose={vi.fn()}
        configuration={mockConfigInitial}
        region={mockRegion}
        taxTypes={mockTaxTypes}
      />
    );

    // Initial state: CGST and SGST present
    expect(screen.getByText("Central GST")).toBeInTheDocument();
    expect(screen.getByText("State GST")).toBeInTheDocument();
    expect(screen.queryByText("Integrated GST")).not.toBeInTheDocument();

    // Add IGST
    fireEvent.click(screen.getByRole("button", { name: /add component/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /tax type/i }), { target: { value: "tt-igst-003" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 9.00"), { target: { value: "18" } });
    fireEvent.change(screen.getByRole("combobox", { name: /applicability/i }), { target: { value: "DIFFERENT_JURISDICTION" } });
    fireEvent.click(screen.getByRole("button", { name: /save component/i }));

    // After refresh, all 3 are visible
    await waitFor(() => {
      expect(screen.getByText("Central GST")).toBeInTheDocument();
      expect(screen.getByText("State GST")).toBeInTheDocument();
      expect(screen.getByText("Integrated GST")).toBeInTheDocument();
    });
  });

  // Scenario 9: Duplicate component errors are displayed
  it("Scenario 9: Duplicate component error prevents adding already configured tax type and displays feedback", async () => {
    render(
      <TaxComponentManagementModal
        isOpen={true}
        onClose={vi.fn()}
        configuration={mockConfigInitial}
        region={mockRegion}
        taxTypes={mockTaxTypes}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /add component/i }));

    // Check that CGST (already configured) has disabled option or displays error
    const select = screen.getByRole("combobox", { name: /tax type/i });
    const cgstOption = within(select).getByText(/Central GST \(CGST\)/i);
    expect(cgstOption).toBeDisabled();

    // Force selecting duplicate or submitting invalid
    fireEvent.change(select, { target: { value: "tt-cgst-001" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 9.00"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: /save component/i }));

    await waitFor(() => {
      expect(screen.getByText(/already configured in this configuration/i)).toBeInTheDocument();
    });
  });

  // Scenario 10: Duplicate configuration errors are handled without creating another configuration
  it("Scenario 10: Duplicate configuration error is handled gracefully with link to manage existing configuration", async () => {
    vi.spyOn(taxRateConfigService, "createTaxRateConfiguration").mockRejectedValue({
      response: {
        status: 400,
        data: {
          message: "An active tax configuration already exists for this tax region and effective period.",
        },
      },
    });

    const onOpenManageExisting = vi.fn();

    render(
      <TaxRuleFormModal
        isOpen={true}
        onClose={vi.fn()}
        region={mockRegion}
        taxTypes={mockTaxTypes}
        existingConfigs={[mockConfigInitial]}
        onOpenManageExisting={onOpenManageExisting}
      />
    );

    // Fill valid form
    fireEvent.change(await screen.findByLabelText(/cgst rate/i), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText(/sgst rate/i), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText(/effective from/i), { target: { value: "2026-01-01" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /create configuration/i }));

    await waitFor(() => {
      expect(screen.getByText(/active configuration already exists/i)).toBeInTheDocument();
      expect(
        screen.getByText(/an active tax configuration already exists for this tax region and effective period/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /manage existing components/i })).toBeInTheDocument();
    });

    // Clicking manage existing components triggers callback with existing config
    fireEvent.click(screen.getByRole("button", { name: /manage existing components/i }));
    expect(onOpenManageExisting).toHaveBeenCalledWith(mockConfigInitial);
  });

  // Scenario 12: Existing configuration data is preserved during supported updates
  it("Scenario 12: Editing an existing component preserves all other components in configuration PUT", async () => {
    const updateSpy = vi.spyOn(taxRateConfigService, "updateTaxConfigurationComponent").mockResolvedValue({
      ...mockConfigInitial,
      components: [
        { ...mockConfigInitial.components[0], taxRate: 8 },
        mockConfigInitial.components[1],
      ],
    });

    render(
      <TaxComponentManagementModal
        isOpen={true}
        onClose={vi.fn()}
        configuration={mockConfigInitial}
        region={mockRegion}
        taxTypes={mockTaxTypes}
      />
    );

    // Click Edit on CGST component row
    const editBtns = screen.getAllByRole("button", { name: /edit/i });
    fireEvent.click(editBtns[0]);

    expect(screen.getByText(/edit component: central gst/i)).toBeInTheDocument();

    // Change rate to 8
    const editRateInput = screen.getByDisplayValue("9");
    fireEvent.change(editRateInput, { target: { value: "8" } });

    // Save
    fireEvent.click(screen.getByRole("button", { name: /update component/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        mockConfigInitial,
        "comp-cgst-1",
        {
          taxRate: 8,
          applicabilityType: "SAME_JURISDICTION",
        }
      );
    });

    expect(toastfy.showStatusToast).toHaveBeenCalledWith("Tax component updated successfully.", "success");
  });

  // Scenario 13: Loading and submission states work correctly
  it("Scenario 13: Loading state disables buttons and displays loading text during submission", async () => {
    let resolvePromise;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(taxRateConfigService, "addTaxConfigurationComponent").mockReturnValue(pendingPromise);

    render(
      <TaxComponentManagementModal
        isOpen={true}
        onClose={vi.fn()}
        configuration={mockConfigInitial}
        region={mockRegion}
        taxTypes={mockTaxTypes}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /add component/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /tax type/i }), { target: { value: "tt-igst-003" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 9.00"), { target: { value: "18" } });

    const saveBtn = screen.getByRole("button", { name: /save component/i });
    fireEvent.click(saveBtn);

    // Loading text should be active
    expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();

    // Resolve promise
    resolvePromise({
      id: "comp-igst-3",
      taxTypeId: "tt-igst-003",
      taxRate: 18,
      applicabilityType: "DIFFERENT_JURISDICTION",
    });

    await waitFor(() => {
      expect(screen.queryByText(/saving\.\.\./i)).not.toBeInTheDocument();
    });
  });

  // Scenario 14: API failures do not result in false success messages
  it("Scenario 14: API failures display error and do not show false success message", async () => {
    vi.spyOn(taxRateConfigService, "addTaxConfigurationComponent").mockRejectedValue({
      response: {
        status: 500,
        data: { message: "Internal Tax Engine Error" },
      },
    });

    render(
      <TaxComponentManagementModal
        isOpen={true}
        onClose={vi.fn()}
        configuration={mockConfigInitial}
        region={mockRegion}
        taxTypes={mockTaxTypes}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /add component/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /tax type/i }), { target: { value: "tt-igst-003" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 9.00"), { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: /save component/i }));

    await waitFor(() => {
      expect(screen.getByText("Internal Tax Engine Error")).toBeInTheDocument();
    });

    expect(toastfy.showStatusToast).toHaveBeenCalledWith("Internal Tax Engine Error", "error");
    expect(toastfy.showStatusToast).not.toHaveBeenCalledWith(expect.any(String), "success");
  });

  // Scenario 15: Existing Tax Configuration functionality remains intact
  it("Scenario 15: Existing createTaxRateConfiguration functionality remains functional", async () => {
    const createSpy = vi.spyOn(taxRateConfigService, "createTaxRateConfiguration").mockResolvedValue({
      id: "cfg-new-002",
      taxRegionId: "reg-india-001",
      taxRegime: "GST",
      effectiveFrom: "2027-01-01",
      components: [],
    });

    const onSaved = vi.fn();

    render(
      <TaxRuleFormModal
        isOpen={true}
        onClose={vi.fn()}
        region={mockRegion}
        taxTypes={mockTaxTypes}
        onSaved={onSaved}
      />
    );

    fireEvent.change(await screen.findByLabelText(/cgst rate/i), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText(/sgst rate/i), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText(/effective from/i), { target: { value: "2027-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /create configuration/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalled();
    });
  });
});
