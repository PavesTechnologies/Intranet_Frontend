import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import InvoiceOcrReviewPanel from "./InvoiceOcrReviewPanel";

const baseInvoice = { id: 1, inboundDocumentId: 99 };

describe("InvoiceOcrReviewPanel", () => {
  it("says a permission is missing for an invoice still awaiting OCR review", () => {
    render(<InvoiceOcrReviewPanel invoice={{ ...baseInvoice, status: "OCR Review Pending" }} />);
    expect(screen.getByText(/you don't have permission to edit it/i)).toBeInTheDocument();
  });

  it("says the same for a Returned for Review invoice viewed without permission", () => {
    render(<InvoiceOcrReviewPanel invoice={{ ...baseInvoice, status: "Returned for Review" }} />);
    expect(screen.getByText(/you don't have permission to edit it/i)).toBeInTheDocument();
  });

  it("describes the OCR Review Queue instead once the invoice has moved past this stage", () => {
    render(<InvoiceOcrReviewPanel invoice={{ ...baseInvoice, status: "Pending Approval" }} />);
    expect(screen.getByText(/OCR Review Queue/i)).toBeInTheDocument();
    expect(screen.queryByText(/you don't have permission/i)).not.toBeInTheDocument();
  });
});
