import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useApPermissions } from "./useApPermissions";
import * as AuthContext from "../../../contexts/AuthContext";

function mockAuth(permissions = []) {
  const upper = new Set(permissions.map((p) => p.toUpperCase()));
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    hasRole: () => false,
    hasPermission: (p) => upper.has(String(p).toUpperCase()),
    hasAnyPermission: (list = []) => list.some((p) => upper.has(String(p).toUpperCase())),
    hasAllPermissions: (list = []) => list.every((p) => upper.has(String(p).toUpperCase())),
  });
}

describe("useApPermissions — Invoice Approval Workflow flags", () => {
  it("grants canManageApprovalPolicy only to a user holding APPROVAL_POLICY_MANAGE", () => {
    mockAuth(["APPROVAL_POLICY_MANAGE"]);
    const { result } = renderHook(() => useApPermissions());
    expect(result.current.canManageApprovalPolicy).toBe(true);
    expect(result.current.canSendForApproval).toBe(false);
    expect(result.current.canApproveInvoice).toBe(false);
  });

  it("denies canManageApprovalPolicy to a user without it — config UI stays hidden", () => {
    mockAuth(["INVOICE_APPROVE", "INVOICE_REJECT"]);
    const { result } = renderHook(() => useApPermissions());
    expect(result.current.canManageApprovalPolicy).toBe(false);
  });

  it("grants an AP Executive canSendForApproval from INVOICE_SEND_FOR_APPROVAL alone", () => {
    mockAuth(["INVOICE_SEND_FOR_APPROVAL"]);
    const { result } = renderHook(() => useApPermissions());
    expect(result.current.canSendForApproval).toBe(true);
    expect(result.current.canApproveInvoice).toBe(false);
    expect(result.current.canRejectInvoice).toBe(false);
  });

  it("grants an approver canApproveInvoice/canRejectInvoice independently", () => {
    mockAuth(["INVOICE_APPROVE"]);
    const { result: approveOnly } = renderHook(() => useApPermissions());
    expect(approveOnly.current.canApproveInvoice).toBe(true);
    expect(approveOnly.current.canRejectInvoice).toBe(false);

    mockAuth(["INVOICE_REJECT"]);
    const { result: rejectOnly } = renderHook(() => useApPermissions());
    expect(rejectOnly.current.canApproveInvoice).toBe(false);
    expect(rejectOnly.current.canRejectInvoice).toBe(true);
  });

  it("derives canViewInvoiceApproval from holding ANY of view/approve/reject", () => {
    mockAuth(["INVOICE_APPROVAL_VIEW"]);
    expect(renderHook(() => useApPermissions()).result.current.canViewInvoiceApproval).toBe(true);

    mockAuth(["INVOICE_APPROVE"]);
    expect(renderHook(() => useApPermissions()).result.current.canViewInvoiceApproval).toBe(true);

    mockAuth([]);
    expect(renderHook(() => useApPermissions()).result.current.canViewInvoiceApproval).toBe(false);
  });

  it("a user with none of the approval permissions gets every approval flag denied", () => {
    mockAuth([]);
    const { result } = renderHook(() => useApPermissions());
    expect(result.current.canManageApprovalPolicy).toBe(false);
    expect(result.current.canSendForApproval).toBe(false);
    expect(result.current.canViewInvoiceApproval).toBe(false);
    expect(result.current.canApproveInvoice).toBe(false);
    expect(result.current.canRejectInvoice).toBe(false);
  });
});
