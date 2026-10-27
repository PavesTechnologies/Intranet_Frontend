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

export default function MoneyMovements({ settlement, currencyCode, advanceId }) {
  const rows = buildMovements(settlement, advanceId);
  if (rows.length === 0) {
    return <p className="text-xs text-gray-500">No money has moved on this advance yet.</p>;
  }
  const outTotal = rows.filter((r) => r.direction === "OUT").reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const inTotal = rows.filter((r) => r.direction !== "OUT").reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
        <div className="rounded-md bg-blue-50 px-3 py-2">
          <p className="text-blue-700">Paid out to employee</p>
          <p className="font-semibold text-gray-900">{formatMoney(outTotal, currencyCode)}</p>
        </div>
        <div className="rounded-md bg-emerald-50 px-3 py-2">
          <p className="text-emerald-700">Received back</p>
          <p className="font-semibold text-gray-900">{formatMoney(inTotal, currencyCode)}</p>
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <p className="text-gray-600">Still outstanding</p>
          <p className="font-semibold text-gray-900">{formatMoney(settlement?.outstandingBalance, currencyCode)}</p>
        </div>
      </div>

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
