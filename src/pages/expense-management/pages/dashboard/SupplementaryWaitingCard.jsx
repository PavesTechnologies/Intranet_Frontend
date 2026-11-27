import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import Button from "@/components/Button/Button";
import {
  SUPP_STATUS,
  errorMessage,
  financeClaimService,
  unwrapList,
} from "@/pages/expense-management/api/supplementaryClaimApi";

export const MY_APPROVALS_PATH = "/expense-management/approvals";

/**
 * Supplementary claims awaiting Finance approval, taken from the Finance queue. Only claims that are currently pending
 * Finance count, and totals are kept per currency so amounts in different currencies are never added together.
 * Pure, so the figures can be tested without rendering.
 */
export function financeWaitingSummary(claims = []) {
  const pending = claims.filter((c) => c?.status === SUPP_STATUS.PENDING_FINANCE);
  const totals = {};
  for (const claim of pending) {
    const currency = claim.currencyCode || "INR";
    totals[currency] = (totals[currency] || 0) + Number(claim.totalAmount || 0);
  }
  return { count: pending.length, totals };
}

const formatMoney = (amount, currency) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const totalText = (totals) => {
  const entries = Object.entries(totals);
  if (entries.length === 0) return "";
  return entries.map(([currency, amount]) => formatMoney(amount, currency)).join(" + ");
};

const EMPTY_SUMMARY = { count: 0, totals: {} };

/**
 * Card on the Finance dashboard for supplementary claims waiting for Finance. Kept apart from the expense report
 * metrics above it. Loading, empty, failure and missing-permission states are each shown on their own.
 */
export default function SupplementaryWaitingCard() {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "loading", summary: EMPTY_SUMMARY, error: "", permissionDenied: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", summary: EMPTY_SUMMARY, error: "", permissionDenied: false });
    financeClaimService
      .queue()
      .then((res) => {
        if (cancelled) return;
        setState({ status: "ready", summary: financeWaitingSummary(unwrapList(res)), error: "", permissionDenied: false });
      })
      .catch((err) => {
        if (cancelled) return;
        const denied = err?.response?.status === 403;
        setState({
          status: "error",
          summary: EMPTY_SUMMARY,
          error: denied ? "" : errorMessage(err, "Could not load supplementary claims waiting for Finance."),
          permissionDenied: denied,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const { status, summary, error, permissionDenied } = state;

  let body;
  if (status === "loading") {
    body = <div className="h-8 w-40 animate-pulse rounded bg-gray-100" role="status" aria-label="Loading supplementary claims" />;
  } else if (permissionDenied) {
    body = (
      <div role="alert" className="flex items-start gap-2 text-sm text-amber-900">
        <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          You can't see this queue. Your account does not have the Finance Executive role for supplementary claims. Ask your administrator.
        </p>
      </div>
    );
  } else if (status === "error") {
    body = (
      <div role="alert" className="flex flex-col gap-2 text-sm text-rose-700">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
        <Button variant="outline" size="small" className="self-start" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  } else if (summary.count === 0) {
    body = <p className="text-sm text-gray-600">No supplementary claims are waiting for Finance.</p>;
  } else {
    body = (
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-2xl font-bold text-[#0a174e]" data-testid="supp-waiting-count">
          {summary.count} <span className="text-sm font-medium text-gray-500">{summary.count === 1 ? "claim" : "claims"}</span>
        </p>
        <p className="text-lg font-semibold text-[#0a174e]" data-testid="supp-waiting-total">
          {totalText(summary.totals)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Supplementary claims awaiting Finance</p>
        <div className="mt-1">{body}</div>
      </div>
      <Button variant="outline" size="small" onClick={() => navigate(MY_APPROVALS_PATH)}>
        Open My Approvals
      </Button>
    </div>
  );
}
