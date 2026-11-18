import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, FilePlus2 } from "lucide-react";
import Button from "@/components/Button/Button";
import {
  SUPP_STATUS_LABEL,
  supplementaryClaimService,
  unwrap,
  unwrapList,
} from "@/pages/expense-management/api/supplementaryClaimApi";

/**
 * Shown on an original expense report. Lists every supplementary claim raised against this report, and offers
 * "Create supplementary claim" when the backend says the report is eligible. The report itself is never changed.
 * If the signed-in user is not the report owner, the list call is refused and the section stays hidden.
 */
export default function ReportSupplementarySection({ reportId }) {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!reportId) return undefined;
    let cancelled = false;
    Promise.all([
      supplementaryClaimService.listForReport(reportId).then((res) => unwrapList(res)),
      supplementaryClaimService.eligibility(reportId).then((res) => unwrap(res)),
    ])
      .then(([list, elig]) => {
        if (cancelled) return;
        setClaims(list);
        setEligibility(elig);
      })
      .catch(() => {
        if (!cancelled) setHidden(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  if (hidden) return null;

  return (
    <section className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Supplementary claims">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#0a174e]">Supplementary claims</h2>
          <p className="text-xs text-gray-500">Expenses missed on this report, claimed separately. This report is not changed.</p>
        </div>
        {eligibility?.eligible ? (
          <Button
            variant="primary"
            size="small"
            onClick={() => navigate(`/expense-management/expenses/supplementary?reportId=${reportId}`)}
          >
            <FilePlus2 size={14} aria-hidden="true" /> Create supplementary claim
          </Button>
        ) : (
          eligibility && <p className="text-xs text-gray-500">{eligibility.reason}</p>
        )}
      </div>

      {claims.length === 0 ? (
        <p className="text-sm text-gray-500">No supplementary claims for this report yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {claims.map((c) => (
            <li key={c.claimId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <p className="font-medium text-gray-800">{c.claimNumber}</p>
                <p className="text-xs text-gray-500">
                  {SUPP_STATUS_LABEL[c.status] || c.status} · {Number(c.totalAmount || 0).toFixed(2)} {c.currencyCode}
                </p>
              </div>
              <Link
                to={`/expense-management/expenses/supplementary/${c.claimId}`}
                aria-label={`Open ${c.claimNumber}`}
                title="Open"
                className="inline-block rounded p-1 text-blue-700 hover:bg-blue-50"
              >
                <Eye size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
