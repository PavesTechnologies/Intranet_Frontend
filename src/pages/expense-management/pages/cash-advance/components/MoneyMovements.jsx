import React from "react";
import { Eye } from "lucide-react";
import { modeLabel } from "@/components/settlement/FinancePayout";
import { cashAdvanceApi } from "@/pages/expense-management/api/cashAdvanceApi";
import { showStatusToast } from "@/components/toastfy/toast";

const formatMoney = (amount, currency) =>
  `${currency || "INR"} ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) => (value ? new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "-");

const DIRECTION = {
  OUT: { label: "Out to employee", className: "bg-blue-100 text-blue-800" },
  IN: { label: "In from employee", className: "bg-emerald-100 text-emerald-800" },
  PAYROLL: { label: "Salary deduction", className: "bg-amber-100 text-amber-800" },
};

/**
 * Every movement of money on this advance, oldest first: what Finance paid out, what the employee returned, and what
 * was recovered through payroll. Built from the settlement record, so it shows what the server has stored.
 */
export function buildMovements(settlement, advanceId) {
  const base = `/xms/employee/cash-advances/${advanceId}`;
  if (!settlement) return [];
  const rows = [];
  const disbursement = settlement.disbursement;
  if (disbursement?.mode) {
    rows.push({
      key: "disbursement",
      date: disbursement.paymentDate,
      direction: "OUT",
      mode: disbursement.mode,
      reference: disbursement.reference || disbursement.receivedByName || disbursement.payeeUpiId || "",
      amount: settlement.totalAmount,
      proof: disbursement.proofOnFile,
      proofPath: `${base}/disbursement/proof`,
    });
  }
  // Salary deductions posted by Payroll. Repayment by the employee is not part of the current flows.
  (settlement.repayments || [])
    .filter((r) => r.paymentMode === "PAYROLL")
    .forEach((r) => {
      rows.push({
        key: r.repaymentId || `${r.repaidAt}-${r.amount}`,
        date: r.transferDate || r.repaidAt,
        direction: "PAYROLL",
        mode: "PAYROLL",
        reference: r.paymentReference || "",
        amount: r.amount,
        proof: r.proofAttached,
        proofPath: `${base}/repayments/${r.repaymentId}/proof`,
      });
    });
  /* Employee repayments (not part of the current flows):
  (settlement.repayments || []).forEach((r) => {
    const payroll = r.paymentMode === "PAYROLL";
    rows.push({
      key: r.repaymentId || `${r.repaidAt}-${r.amount}`,
      date: r.transferDate || r.repaidAt,
      direction: payroll ? "PAYROLL" : "IN",
      mode: payroll ? "PAYROLL" : r.paymentMode || r.paymentMethod,
      reference: r.paymentReference || "",
      amount: r.amount,
      proof: r.proofAttached,
      proofPath: `${base}/repayments/${r.repaymentId}/proof`,
    });
  });
  */
  return rows.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
}

/**
 * Opens a stored proof in a new tab. The file is fetched with the login token, so a plain link would not work.
 * The tab is opened first so the browser does not block it after the request completes.
 */
export async function viewProof(path) {
  // No "noopener": with it window.open returns null, so the tab could never be pointed at the file.
  const tab = window.open("", "_blank");
  try {
    const res = await cashAdvanceApi.getProofFile(path);
    const url = URL.createObjectURL(res.data);
    if (tab) tab.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    if (tab) tab.close();
    showStatusToast(err.response?.status === 404 ? "No proof is on file." : "Could not open the proof.", "error");
  }
}

const MONEY_BOXES = [
  { key: "paidOut", label: "Paid out to employee", box: "bg-blue-50", text: "text-blue-700" },
  { key: "expenses", label: "Spent on approved expenses", box: "bg-violet-50", text: "text-violet-700" },
  { key: "inApproval", label: "Expenses in approval", box: "bg-sky-50", text: "text-sky-700", onlyWhenSet: true },
  { key: "left", label: "Left with employee", box: "bg-amber-50", text: "text-amber-700" },
  { key: "carriedOut", label: "Carried forward", box: "bg-indigo-50", text: "text-indigo-700" },
  { key: "salaryDeducted", label: "Salary deduction", box: "bg-rose-50", text: "text-rose-700" },
  { key: "outstanding", label: "Still outstanding", box: "bg-gray-50", text: "text-gray-600" },
];

export default function MoneyMovements({
  settlement,
  currencyCode,
  advanceId,
  carriedOut = 0,
  salaryDeducted = 0,
  expensesApproved = 0,
  expensesInApproval = 0,
  stillOutstanding,
}) {
  const rows = buildMovements(settlement, advanceId);
  if (rows.length === 0) {
    return <p className="text-xs text-gray-500">No money has moved on this advance yet.</p>;
  }
  const outTotal = rows.filter((r) => r.direction === "OUT").reduce((sum, r) => sum + Number(r.amount || 0), 0);
  // const inTotal: repayments by the employee are not part of the current flows.
  const amounts = {
    paidOut: outTotal,
    expenses: Number(expensesApproved || 0),
    inApproval: Number(expensesInApproval || 0),
    // What the expenses (approved and in approval) do not account for, before anything is recovered.
    left: Math.max(outTotal - Number(expensesApproved || 0) - Number(expensesInApproval || 0), 0),
    carriedOut: Number(carriedOut || 0),
    salaryDeducted: Number(salaryDeducted || 0),
    // Expenses in approval are held against the advance, so they are not part of what is still to recover.
    // The server's settleableAmount when given; otherwise the stored balance less what is held.
    outstanding:
      stillOutstanding !== undefined && stillOutstanding !== null
        ? Number(stillOutstanding || 0)
        : Math.max(0, Number(settlement?.outstandingBalance || 0) - Number(expensesInApproval || 0)),
  };

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs ${amounts.inApproval > 0 ? "lg:grid-cols-7" : "lg:grid-cols-6"}`}>
        {MONEY_BOXES.filter((b) => !b.onlyWhenSet || amounts[b.key] > 0).map((b) => (
          <div key={b.key} className={`rounded-md px-3 py-2 ${b.box}`}>
            <p className={b.text}>{b.label}</p>
            <p className="font-semibold text-gray-900">{formatMoney(amounts[b.key], currencyCode)}</p>
          </div>
        ))}
      </div>

      {amounts.inApproval > 0 && (
        <p className="rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-900">
          {formatMoney(amounts.inApproval, currencyCode)} of expenses is still in approval. It is held against the advance
          and set against it once approved, so it is not part of "Still outstanding". If the approver reduces it, the
          difference is added back to what is outstanding.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-gray-500">
            <tr>
              <th className="py-2 pr-3 font-semibold">Date</th>
              <th className="py-2 pr-3 font-semibold">Direction</th>
              <th className="py-2 pr-3 font-semibold">Mode</th>
              <th className="py-2 pr-3 font-semibold">Reference</th>
              <th className="py-2 pr-3 font-semibold">Proof</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const direction = DIRECTION[row.direction];
              return (
                <tr key={row.key}>
                  <td className="py-2 pr-3 text-gray-700">{formatDate(row.date)}</td>
                  <td className="py-2 pr-3">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${direction.className}`}>{direction.label}</span>
                  </td>
                  <td className="py-2 pr-3 text-gray-700">{row.mode === "PAYROLL" ? "Payroll" : modeLabel(row.mode)}</td>
                  <td className="py-2 pr-3 font-mono text-gray-700">{row.reference || "-"}</td>
                  <td className="py-2 pr-3 text-gray-700">
                    {row.proof && row.proofPath ? (
                      <button
                        type="button"
                        aria-label="View proof"
                        title="View proof"
                        onClick={() => viewProof(row.proofPath)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-0.5 text-[#0A0082] hover:bg-gray-50"
                      >
                        <Eye size={14} /> View
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 text-right font-semibold text-gray-900">{formatMoney(row.amount, currencyCode)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
