import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VendorAgreementsTab from "./VendorAgreementsTab";
import {
  useRejectAgreementMutation,
  useVendorAgreements,
  useVerifyAgreementMutation,
} from "../../invoice/hooks/useInvoicePaymentTerms";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useAuth } from "../../../../contexts/AuthContext";

vi.mock("../../invoice/hooks/useInvoicePaymentTerms", () => ({
  useVendorAgreements: vi.fn(),
  useVerifyAgreementMutation: vi.fn(),
  useRejectAgreementMutation: vi.fn(),
  useExtractAgreementMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCreateAgreementMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));
vi.mock("../../hooks/useApPermissions", () => ({ useApPermissions: vi.fn() }));
vi.mock("../../../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));

const agreement = (overrides) => ({
  agreement_id: 1,
  vendor_id: 5,
  agreement_type: "LEASE",
  reference_no: "TST-AGR-01",
  title: "Office Lease Agreement",
  valid_from: "2026-04-01",
  valid_to: "2027-03-31",
  term_days: 15,
  due_basis: "INVOICE_DATE",
  status: "PENDING_VERIFICATION",
  is_expired: false,
  days_to_expiry: 173,
  uploaded_by: "intake-1",
  documents: [],
  ...overrides,
});

let verify;

function setup(agreements, permissions = {}, userId = "finance-1") {
  useApPermissions.mockReturnValue({
    canViewAgreements: true,
    canUploadAgreements: true,
    canVerifyAgreements: true,
    ...permissions,
  });
  useAuth.mockReturnValue({ user: { user_id: userId } });
  useVendorAgreements.mockReturnValue({ data: agreements, isLoading: false, isError: false });
  verify = { mutate: vi.fn(), isPending: false };
  useVerifyAgreementMutation.mockReturnValue(verify);
  useRejectAgreementMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  render(<VendorAgreementsTab vendorId={5} />);
}

describe("VendorAgreementsTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets a different user verify a pending agreement", async () => {
    const user = userEvent.setup();
    setup([agreement()]);
    await user.click(screen.getByRole("button", { name: /^verify$/i }));
    await user.click(screen.getAllByRole("button", { name: /^verify$/i }).at(-1));
    expect(verify.mutate).toHaveBeenCalledWith({ agreementId: 1, remarks: "" }, expect.any(Object));
  });

  it("does not offer verification to the uploader (four-eyes)", () => {
    setup([agreement()], {}, "intake-1");
    expect(screen.queryByRole("button", { name: /^verify$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/needs another user to verify/i)).toBeInTheDocument();
  });

  it("flags an active but expired agreement", () => {
    setup([agreement({ status: "ACTIVE", is_expired: true, days_to_expiry: -101, valid_to: "2026-06-30" })]);
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("hides upload and verify without the permissions", () => {
    setup([agreement()], { canUploadAgreements: false, canVerifyAgreements: false });
    expect(screen.queryByRole("button", { name: /upload agreement/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^verify$/i })).not.toBeInTheDocument();
  });
});
