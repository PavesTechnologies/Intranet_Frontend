import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("../reportsApi", () => ({ itcRegisterApi: { get: vi.fn(), claim: vi.fn(), unclaim: vi.fn() } }));
vi.mock("@/pages/expense-management/approval-engine/hooks/useEmployeeDirectory", () => ({
  useEmployeeDirectory: () => ({ data: new Map([["E1", { name: "Asha Rao" }], ["E2", { name: "Ravi Kumar" }]]) }),
}));

import { itcRegisterApi } from "../reportsApi";
import ItcRegisterPage from "../ItcRegisterPage";
import { itcCsv, itcPeriodRange, readinessOf, summarizeItc } from "../itcRegister";

// Made-up lines, shaped like GET /xms/reports/tax/itc-register.
const line = (o) => ({
  lineItemId: o.id, reportId: "R", reportNumber: o.report || "EXP-1", employeeId: o.emp || "E1", reportStatus: "PENDING_FINANCE_VERIFICATION",
  expenseDate: o.date || "2026-11-20", merchantName: o.merchant || "Hotel Blue", categoryName: o.category || "Travel", taxCode: o.code || "GST18",
  supplierGstin: o.gstin ?? null, taxAmount: o.tax, itcRecoverablePercent: o.pct, recoverableTaxAmount: o.rec, nonRecoverableTaxAmount: o.tax - o.rec,
  taxValidationStatus: "MATCHED", itcStatus: o.status,
});
const LINES = [
  line({ id: "a", tax: 1800, pct: 100, rec: 1800, status: "VERIFIED", gstin: "29ABCDE1234F1Z5" }),
  line({ id: "b", tax: 1200, pct: 100, rec: 1200, status: "VERIFIED", merchant: "Air, \"Fast\"", emp: "E2" }),
  line({ id: "c", tax: 500, pct: 100, rec: 500, status: "UNVERIFIED", code: "GST5" }),
  line({ id: "d", tax: 90, pct: 0, rec: 0, status: "NOT_RECOVERABLE", category: "Meals", code: "GST5" }),
];

describe("ITC register helpers", () => {
  it("period presets follow GST months, fiscal quarters and the April fiscal year", () => {
    const today = new Date(2026, 10, 24); // 24 Nov 2026
    expect(itcPeriodRange("THIS_MONTH", today)).toEqual({ from: "2026-11-01", to: "2026-11-24" });
    expect(itcPeriodRange("LAST_MONTH", today)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(itcPeriodRange("QUARTER", today)).toEqual({ from: "2026-10-01", to: "2026-11-24" });
    expect(itcPeriodRange("FY", today)).toEqual({ from: "2026-04-01", to: "2026-11-24" });
    expect(itcPeriodRange("QUARTER", new Date(2027, 1, 10))).toEqual({ from: "2027-01-01", to: "2027-02-10" });
    expect(itcPeriodRange("FY", new Date(2027, 1, 10))).toEqual({ from: "2026-04-01", to: "2027-02-10" });
  });

  it("a line recorded in a GST return is Claimed, whatever else it has", () => {
    expect(readinessOf({ ...LINES[0], itcClaimPeriod: "2026-11" })).toBe("CLAIMED");
    expect(summarizeItc([{ ...LINES[0], itcClaimPeriod: "2026-11" }])).toMatchObject({ claimed: 1800, claimedCount: 1, ready: 0 });
  });

  it("a line is ready to claim only when Finance verified it and it has a supplier GSTIN", () => {
    expect(LINES.map(readinessOf)).toEqual(["READY", "NO_GSTIN", "AWAITING", "NOT_RECOVERABLE"]);
    const s = summarizeItc(LINES);
    expect(s).toMatchObject({ tax: 3590, recoverable: 3500, ready: 1800, noGstin: 1200, awaiting: 500, lost: 90, readyCount: 1 });
  });

  it("CSV has a header, one row per line, and quotes commas and quotes", () => {
    const csv = itcCsv(LINES, (id) => (id === "E2" ? "Ravi Kumar" : "Asha Rao")).split("\r\n");
    expect(csv).toHaveLength(5);
    expect(csv[0]).toMatch(/^Expense date,Report,Employee ID,Employee,Merchant/);
    expect(csv[1]).toMatch(/29ABCDE1234F1Z5,1800\.00,100,1800\.00,0\.00,VERIFIED,Ready to claim/);
    expect(csv[2]).toContain('"Air, ""Fast"""');
    expect(csv[2]).toContain("Ravi Kumar");
  });
});

describe("ITC register page", () => {
  const renderPage = () => {
    itcRegisterApi.get.mockResolvedValue({ data: { data: { currency: "INR", lines: LINES, totals: {} } } });
    return render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ItcRegisterPage />
      </QueryClientProvider>,
    );
  };
  const card = (key) => document.querySelector(`[data-kpi-card="${key}"]`).textContent;

  it("shows what is ready to claim, what is blocked and why, with every line and its claim status", async () => {
    renderPage();
    await waitFor(() => expect(document.querySelectorAll("[data-itc-line]")).toHaveLength(4));
    expect(card("ready")).toMatch(/INR 1,800\.00/);
    expect(card("awaiting")).toMatch(/INR 500\.00/);
    expect(card("noGstin")).toMatch(/INR 1,200\.00/);
    expect(card("lost")).toMatch(/INR 90\.00/);
    const blocked = document.querySelector('[data-itc-line="b"]');
    expect(within(blocked).getByText("Not captured")).toBeInTheDocument();
    expect(within(blocked).getByText("GSTIN missing")).toBeInTheDocument();
    expect(within(document.querySelector('[data-itc-line="d"]')).getByText("Not needed")).toBeInTheDocument();
  });

  it("the claim status filter narrows the table and the cards together", async () => {
    renderPage();
    await waitFor(() => expect(document.querySelectorAll("[data-itc-line]")).toHaveLength(4));
    fireEvent.click(screen.getByRole("button", { name: "All lines" }));
    fireEvent.click(await screen.findByRole("option", { name: "Ready to claim" }));
    await waitFor(() => expect(document.querySelectorAll("[data-itc-line]")).toHaveLength(1));
    expect(card("ready")).toMatch(/INR 1,800\.00/);
    expect(card("awaiting")).toMatch(/INR 0\.00/);
  });

  it("a period preset reloads the register for those expense dates", async () => {
    renderPage();
    await waitFor(() => expect(itcRegisterApi.get).toHaveBeenCalled());
    fireEvent.click(document.querySelector('[data-itc-period="FY"]'));
    await waitFor(() => expect(itcRegisterApi.get).toHaveBeenLastCalledWith(expect.objectContaining({ from: expect.stringMatching(/-04-01$/) })));
  });

  it("only Ready lines can be picked, and Mark as claimed records them with the GSTR-3B month", async () => {
    itcRegisterApi.claim.mockResolvedValue({ data: { data: 1 } });
    renderPage();
    await waitFor(() => expect(document.querySelectorAll("[data-itc-line]")).toHaveLength(4));
    expect(within(document.querySelector('[data-itc-line="b"]')).queryByRole("checkbox")).toBeNull();
    fireEvent.click(within(document.querySelector('[data-itc-line="a"]')).getByRole("checkbox"));
    expect(document.querySelector("[data-itc-claim-bar]").textContent).toMatch(/1 selected · INR 1,800\.00/);
    fireEvent.change(screen.getByLabelText("GSTR-3B month"), { target: { value: "2026-11" } });
    fireEvent.click(screen.getByRole("button", { name: /Mark as claimed/ }));
    await waitFor(() => expect(itcRegisterApi.claim).toHaveBeenCalledWith({ lineItemIds: ["a"], returnPeriod: "2026-11", note: "" }));
    expect(await screen.findByText(/recorded as claimed in GSTR-3B 2026-11/)).toBeInTheDocument();
  });
});
