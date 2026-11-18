import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, FilePlus2 } from "lucide-react";
import { showStatusToast } from "@/components/toastfy/toast";
import Button from "@/components/Button/Button";
import {
  SUPP_STATUS_LABEL,
  errorMessage,
  financeClaimService,
  managerClaimService,
  unwrapList,
} from "@/pages/expense-management/api/supplementaryClaimApi";

const QUEUE = {
  manager: {
    title: "Supplementary claims to review",
    intro: "Claims from your team waiting for your review. Approving passes a claim to Finance.",
    load: () => managerClaimService.queue(),
    detailBase: "/expense-management/manager/supplementary-claims",
  },
  finance: {
    title: "Supplementary claims for Finance",
    intro: "Claims approved by the manager and waiting for Finance review. Approving sends the claim for AP payment.",
    load: () => financeClaimService.queue(),
    detailBase: "/expense-management/finance/supplementary-claims",
  },
};

/**
 * Review queue for a manager or for Finance. The list only shows claims the backend already filtered for this user;
 * each claim opens on the shared detail screen, where the review actions are.
 */
export default function SupplementaryQueuePage({ variant = "manager" }) {
  const navigate = useNavigate();
  const config = QUEUE[variant] || QUEUE.manager;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    config
      .load()
      .then((res) => {
        if (!cancelled) setRows(unwrapList(res));
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Could not load the queue."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config]);

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/expense-management/dashboard");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
        {variant === "finance" && (
          <Button variant="primary" size="small" onClick={() => navigate("/expense-management/finance/supplementary-claims/new")}>
            <FilePlus2 size={14} aria-hidden="true" /> Create for an employee
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h1 className="text-xl font-bold text-[#0a174e]">{config.title}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{config.intro}</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600" role="alert">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing waiting for you right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-sm">
              <colgroup>
                <col className="w-44" />
                <col className="w-32" />
                <col />
                <col className="w-36" />
                <col className="w-32" />
                <col className="w-14" />
              </colgroup>
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Claim</th>
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Report</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-center font-medium"><span className="sr-only">Review</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((c) => (
                  <tr key={c.claimId}>
                    <td className="truncate px-3 py-2 font-medium text-gray-800">{c.claimNumber}</td>
                    <td className="truncate px-3 py-2 text-gray-700">{c.employeeId}</td>
                    <td className="truncate px-3 py-2 text-gray-700">{c.reportNumber}</td>
                    <td className="px-3 py-2 text-right text-gray-800">{Number(c.totalAmount || 0).toFixed(2)} {c.currencyCode}</td>
                    <td className="px-3 py-2 text-gray-700">{SUPP_STATUS_LABEL[c.status] || c.status}</td>
                    <td className="px-3 py-2 text-center">
                      <Link to={`${config.detailBase}/${c.claimId}`} aria-label={`Review ${c.claimNumber}`} title="Review"
                        className="inline-block rounded p-1 text-blue-700 hover:bg-blue-50">
                        <Eye size={16} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
