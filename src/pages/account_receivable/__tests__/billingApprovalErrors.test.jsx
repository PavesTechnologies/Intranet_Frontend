import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BillingApprovals from "../pages/BillingApprovals";
import {
  approveBillingConfigurationRequest,
  getBillingConfigurationForApproval,
  getPendingApprovalConfigurations,
  rejectBillingConfigurationRequest,
} from "../services/billingApprovalService";
import { fetchBillingConfigurations } from "../services/billingConfigService";
import { showStatusToast } from "../../../components/toastfy/toast";

configure({ asyncUtilTimeout: 4000 });

vi.mock("../services/billingApprovalService", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    approveBillingConfigurationRequest: vi.fn(),
    rejectBillingConfigurationRequest: vi.fn(),
    getPendingApprovalConfigurations: vi.fn(),
    getBillingConfigurationForApproval: vi.fn(),
  };
});
vi.mock("../services/billingConfigService", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchBillingConfigurations: vi.fn() };
});
vi.mock("../../../components/toastfy/toast", () => ({ showStatusToast: vi.fn() }));

// The record-lock hook talks to the backend; here the lock is always granted.
const lock = {
  conflict: null,
  isLockedByOther: () => false,
  ownLockAction: () => null,
  acquire: vi.fn(async () => ({ acquired: true })),
  release: vi.fn(),
  handleMutationConflict: vi.fn(),
};
vi.mock("../hooks/useRecordLock", () => ({ default: () => lock }));

const pending = (id, billingTypeName, projectName) => ({
  billingConfigurationId: id,
  projectName,
  projectCode: "P-1",
  clientName: "Acme",
  billingTypeName,
  billingFrequencyName: "Monthly",
  paymentTermName: "Net 30",
  taxRegionName: "IN",
  approvalStatus: "PENDING_APPROVAL",
  billingStatus: "INACTIVE",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
  changes: [],
  review: {},
});

const MILESTONE = pending("cfg-m", "Milestone Plan", "Milestone Project");
const RECURRING = pending("cfg-r", "Recurring", "Recurring Project");

const CLAIM_CONFLICT =
  "PMS milestone 11 (M-1) is already part of another active billing plan (billing configuration abc).";
const RESTORE_CONFLICT =
  "PMS milestone 3 from the previously approved plan is now part of another billing plan, so this edit cannot be rejected without restoring a conflicting claim. Nothing was changed; release the milestone from the other plan first.";
const http400 = (message) => ({ response: { status: 400, data: { success: false, message } } });

const renderPage = () =>
  render(
    <MemoryRouter>
      <BillingApprovals />
    </MemoryRouter>,
  );

// Opens the review dialog of the row for `projectName`.
const openReview = async (projectName) => {
  const cell = await screen.findByText(projectName);
  const row = cell.closest("tr");
  fireEvent.click(within(row).getByRole("button", { name: "Row actions" }));
  fireEvent.click(await screen.findByText("Review"));
  await screen.findByRole("button", { name: /approve configuration/i });
};

const startReject = async (reason = "Not acceptable") => {
  fireEvent.click(screen.getByRole("button", { name: /reject configuration/i }));
  const box = await screen.findByPlaceholderText(/why this configuration is being rejected/i);
  fireEvent.change(box, { target: { value: reason } });
};

const confirmReject = () => {
  const buttons = screen.getAllByRole("button", { name: /reject configuration/i });
  fireEvent.click(buttons[buttons.length - 1]); // the dialog's confirm button
};

describe("Billing approvals — approve / reject error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lock.acquire.mockImplementation(async () => ({ acquired: true }));
    getPendingApprovalConfigurations.mockResolvedValue([MILESTONE, RECURRING]);
    fetchBillingConfigurations.mockResolvedValue([]);
    getBillingConfigurationForApproval.mockImplementation(async (id) => (id === "cfg-m" ? MILESTONE : RECURRING));
  });

  it("rejection succeeds: success toast, dialog closed, list reloaded, no error shown", async () => {
    rejectBillingConfigurationRequest.mockResolvedValueOnce({});
    renderPage();
    await openReview("Recurring Project");
    await startReject();
    confirmReject();

    await waitFor(() => expect(rejectBillingConfigurationRequest).toHaveBeenCalledWith("cfg-r", "Not acceptable"));
    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith("Billing Configuration rejected successfully.", "success"));
    expect(showStatusToast).not.toHaveBeenCalledWith(expect.anything(), "error");
    await waitFor(() => expect(screen.queryByPlaceholderText(/why this configuration is being rejected/i)).not.toBeInTheDocument());
    expect(getPendingApprovalConfigurations.mock.calls.length).toBeGreaterThan(1); // reloaded
  });

  it("rejection fails with a milestone-restore conflict: shows the backend message, keeps the dialog and reason, no success", async () => {
    rejectBillingConfigurationRequest.mockRejectedValueOnce(http400(RESTORE_CONFLICT));
    renderPage();
    await openReview("Milestone Project");
    await startReject("Wrong milestones");
    confirmReject();

    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith(RESTORE_CONFLICT, "error"));
    expect(showStatusToast).not.toHaveBeenCalledWith("Billing Configuration rejected successfully.", "success");
    // screen state preserved: dialog still open with the typed reason, row still listed as pending
    expect(screen.getByPlaceholderText(/why this configuration is being rejected/i)).toHaveValue("Wrong milestones");
    expect(screen.getByText("Milestone Project")).toBeInTheDocument();
    expect(lock.release).not.toHaveBeenCalled();
    // the list was not reloaded as if something had changed
    expect(getPendingApprovalConfigurations).toHaveBeenCalledTimes(1);
  });

  it("the reject button works again after a failure (loading state reset) and a retry can succeed", async () => {
    rejectBillingConfigurationRequest.mockRejectedValueOnce(http400(RESTORE_CONFLICT)).mockResolvedValueOnce({});
    renderPage();
    await openReview("Milestone Project");
    await startReject();
    confirmReject();
    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith(RESTORE_CONFLICT, "error"));

    const buttons = screen.getAllByRole("button", { name: /reject configuration/i });
    const confirm = buttons[buttons.length - 1];
    await waitFor(() => expect(confirm).not.toBeDisabled());
    expect(screen.getByPlaceholderText(/why this configuration is being rejected/i)).not.toBeDisabled();

    fireEvent.click(confirm);
    await waitFor(() => expect(rejectBillingConfigurationRequest).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith("Billing Configuration rejected successfully.", "success"));
  });

  it("approval fails with a milestone claim conflict: backend message shown, review stays open, status unchanged", async () => {
    approveBillingConfigurationRequest.mockRejectedValueOnce(http400(CLAIM_CONFLICT));
    renderPage();
    await openReview("Milestone Project");
    fireEvent.click(screen.getByRole("button", { name: /approve configuration/i }));

    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith(CLAIM_CONFLICT, "error"));
    expect(showStatusToast).not.toHaveBeenCalledWith(expect.stringMatching(/approved successfully/), "success");
    // review dialog and its actions are still there; lock kept for the retry
    expect(screen.getByRole("button", { name: /approve configuration/i })).toBeInTheDocument();
    expect(lock.release).not.toHaveBeenCalled();
    expect(getPendingApprovalConfigurations).toHaveBeenCalledTimes(1);
  });

  it("approval loading state resets after a failure so the user can retry", async () => {
    approveBillingConfigurationRequest.mockRejectedValueOnce(http400("Effective From date is required.")).mockResolvedValueOnce({});
    renderPage();
    await openReview("Milestone Project");
    fireEvent.click(screen.getByRole("button", { name: /approve configuration/i }));
    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith("Effective From date is required.", "error"));

    const approve = screen.getByRole("button", { name: /approve configuration/i });
    await waitFor(() => expect(approve).not.toBeDisabled());
    expect(screen.queryByText("Approving...")).not.toBeInTheDocument();

    fireEvent.click(approve);
    await waitFor(() => expect(approveBillingConfigurationRequest).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith("Billing Configuration approved successfully.", "success"));
  });

  it("a 409 lock conflict is still routed to the record-lock handler, with the backend message shown", async () => {
    approveBillingConfigurationRequest.mockRejectedValueOnce({ response: { status: 409, data: { message: "Locked by another user" } } });
    renderPage();
    await openReview("Recurring Project");
    fireEvent.click(screen.getByRole("button", { name: /approve configuration/i }));

    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith("Locked by another user", "error"));
    expect(lock.handleMutationConflict).toHaveBeenCalledWith("cfg-r");
  });

  it("a non-milestone approval still succeeds as before", async () => {
    approveBillingConfigurationRequest.mockResolvedValueOnce({});
    renderPage();
    await openReview("Recurring Project");
    fireEvent.click(screen.getByRole("button", { name: /approve configuration/i }));

    await waitFor(() => expect(approveBillingConfigurationRequest).toHaveBeenCalledWith("cfg-r"));
    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith("Billing Configuration approved successfully.", "success"));
    expect(lock.release).toHaveBeenCalled();
    expect(showStatusToast).not.toHaveBeenCalledWith(expect.anything(), "error");
  });

  it("an error without a backend message falls back to the generic text instead of a success state", async () => {
    approveBillingConfigurationRequest.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    renderPage();
    await openReview("Recurring Project");
    fireEvent.click(screen.getByRole("button", { name: /approve configuration/i }));

    await waitFor(() => expect(showStatusToast).toHaveBeenCalledWith("Failed to approve billing configuration.", "error"));
  });
});
