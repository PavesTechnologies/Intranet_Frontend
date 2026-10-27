import React from "react";
import { render, screen } from "@testing-library/react";
import { LineItemAllocationDetails, LineItemTaxDetails } from "../LineItemDetailSections";

const formatAmount = (v) => Number(v).toFixed(2);

const lineItem = {
  currencyCode: "INR",
  baseCurrencyCode: "INR",
  taxAmount: 39.9,
  tax: {
    taxCode: "GST5",
    taxType: "CGST_SGST",
    taxRatePercent: 5,
    taxTreatment: "INCLUSIVE",
    taxableAmount: 798,
    taxAmount: 39.9,
    taxSource: "OCR",
    itcRecoverablePercent: 100,
    recoverableTaxAmount: 39.9,
    nonRecoverableTaxAmount: 0,
    itcStatus: "UNVERIFIED",
    supplierGstin: "27AAACS8577K1Z5",
    components: [
      { componentCode: "CGST", label: "CGST", ratePercent: 2.5, taxAmount: 19.95 },
      { componentCode: "SGST", label: "SGST", ratePercent: 2.5, taxAmount: 19.95 },
    ],
  },
};

describe("LineItemTaxDetails", () => {
  it("shows the tax code, each component, where the tax came from, and the ITC", () => {
    render(<LineItemTaxDetails lineItem={lineItem} formatAmount={formatAmount} />);
    expect(screen.getByText(/GST5/)).toBeInTheDocument();
    expect(screen.getByText("CGST")).toBeInTheDocument();
    expect(screen.getByText("SGST")).toBeInTheDocument();
    expect(screen.getAllByText("19.95 INR")).toHaveLength(2);
    expect(screen.getByText("Read from the receipt")).toBeInTheDocument();
    expect(screen.getByText("Including tax")).toBeInTheDocument();
    expect(screen.getByText("27AAACS8577K1Z5")).toBeInTheDocument();
    expect(screen.getByText("Awaiting Finance")).toBeInTheDocument();
  });

  it("renders nothing for a line with no tax code and no tax", () => {
    const { container } = render(
      <LineItemTaxDetails lineItem={{ taxAmount: 0, tax: { taxCode: null, components: [] } }} formatAmount={formatAmount} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("LineItemAllocationDetails", () => {
  it("lists each split share in base currency, in split order", () => {
    const splits = [
      { splitId: "b", costCenterName: "HR", splitType: "PERCENTAGE", percentage: 40, allocatedAmount: 335.16, splitOrder: 2 },
      { splitId: "a", costCenterName: "Engineering", splitType: "PERCENTAGE", percentage: 60, allocatedAmount: 502.74, splitOrder: 1 },
    ];
    render(<LineItemAllocationDetails lineItem={lineItem} splits={splits} formatAmount={formatAmount} />);
    expect(screen.getByText("Split across 2 cost centers")).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Engineering60%502.74 INR");
    expect(rows[1]).toHaveTextContent("HR40%335.16 INR");
  });

  it("shows the cross-department reason", () => {
    render(<LineItemAllocationDetails lineItem={{ ...lineItem, allocationReason: "Joint hiring event" }} formatAmount={formatAmount} />);
    expect(screen.getByText(/Joint hiring event/)).toBeInTheDocument();
  });

  it("renders nothing for an ordinary single-cost-center line", () => {
    const { container } = render(<LineItemAllocationDetails lineItem={lineItem} splits={[]} formatAmount={formatAmount} />);
    expect(container).toBeEmptyDOMElement();
  });
});
