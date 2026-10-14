import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import BankVerificationCell, { verificationLabel } from "./BankVerificationCell";
import bankVerificationService from "../services/bankVerificationService";

vi.mock("../services/bankVerificationService", () => ({
  default: { forVendor: vi.fn(), pennyDrop: vi.fn(), document: vi.fn(), approve: vi.fn(), reject: vi.fn() },
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const renderCell = (verification, canVerify = true) => render(
  <QueryClientProvider client={new QueryClient()}>
    <BankVerificationCell vendorId={17} bankId={3} verification={verification} canVerify={canVerify} />
  </QueryClientProvider>,
);

beforeEach(() => vi.clearAllMocks());

describe("verificationLabel", () => {
  it("names each state", () => {
    expect(verificationLabel(undefined).text).toBe("Not verified");
    expect(verificationLabel({ status: "VERIFIED", approval_status: "PENDING" }).text).toBe("Verified · awaiting approval");
    expect(verificationLabel({ status: "VERIFIED", approval_status: "APPROVED" }).text).toBe("Approved for payment");
    expect(verificationLabel({ status: "NAME_MISMATCH" }).text).toBe("Name mismatch");
  });
});

describe("BankVerificationCell", () => {
  it("checks an unverified account with the bank", async () => {
    bankVerificationService.pennyDrop.mockResolvedValue({ status: "VERIFIED" });
    renderCell({ status: "UNVERIFIED", approval_status: "PENDING" });
    await userEvent.click(screen.getByRole("button", { name: "Check with bank" }));
    expect(bankVerificationService.pennyDrop).toHaveBeenCalledWith(17, 3);
  });

  it("offers approval once verified, and nothing once approved", async () => {
    bankVerificationService.approve.mockResolvedValue({ status: "VERIFIED", approval_status: "APPROVED" });
    const { unmount } = renderCell({ status: "VERIFIED", approval_status: "PENDING", name_at_bank: "WEWORK INDIA", name_match_score: 98 });
    expect(screen.getByText(/At bank: WEWORK INDIA \(98%\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(bankVerificationService.approve).toHaveBeenCalledWith(17, 3, null);
    unmount();
    renderCell({ status: "VERIFIED", approval_status: "APPROVED" });
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Check with bank" })).toBeNull();
  });

  it("is read-only without the permission", () => {
    renderCell({ status: "UNVERIFIED" }, false);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
