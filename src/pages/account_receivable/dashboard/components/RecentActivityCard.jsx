import { Link } from "react-router-dom";
import { Activity, AlertCircle, ArrowRight, History } from "lucide-react";

import DashboardCard from "./DashboardCard";
import { formatDisplayDateTime } from "../../utils/format";
import { AR_ROUTES } from "../utils/dashboardRoutes";

function ActivitySkeleton() {
  return (
    <ul className="divide-y divide-slate-100" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center justify-between gap-4 py-3">
          <span className="h-3 w-1/2 rounded bg-slate-100 motion-safe:animate-pulse" />
          <span className="h-3 w-24 rounded bg-slate-100 motion-safe:animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

const TYPE_DOT = {
  INVOICE_APPROVAL: "bg-amber-500",
  INVOICE_DELIVERY: "bg-emerald-500",
  BILLING_SETUP: "bg-indigo-500",
};

/** Recent invoice approval, delivery and billing-setup events. Handles loading, error (with retry) and empty states. */
export default function RecentActivityCard({ activity, loading, error, onRetry }) {
  let body;
  if (loading) {
    body = (
      <>
        <span className="sr-only" role="status">Loading recent activity…</span>
        <ActivitySkeleton />
      </>
    );
  } else if (error) {
    body = (
      <div role="alert" className="flex flex-col items-center gap-2 py-8 text-center">
        <AlertCircle className="h-6 w-6 text-rose-600" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-700">{error}</p>
        <p className="text-xs text-slate-500">Check your connection, then try again.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Retry
        </button>
      </div>
    );
  } else if (activity.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <History className="h-5 w-5 text-slate-500" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-slate-700">No recent activity yet</p>
        <p className="text-xs text-slate-500">Billing setup changes, invoice approvals and deliveries will appear here.</p>
      </div>
    );
  } else {
    body = (
      <ul className="divide-y divide-slate-100">
        {activity.map((item, index) => (
          <li
            key={`${item.type}-${item.reference ?? ""}-${index}`}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[item.type] || "bg-slate-400"}`} aria-hidden="true" />
              <span className="truncate font-medium text-slate-800">{item.title}</span>
              {item.reference ? (
                <span translate="no" className="truncate text-slate-500">
                  {item.reference}
                </span>
              ) : null}
            </span>
            <span className="text-slate-500">
              {item.actor ? (
                <>
                  <span className="font-medium text-slate-700">{item.actor}</span>
                  {" · "}
                </>
              ) : null}
              {item.occurredAt ? (
                <time dateTime={String(item.occurredAt)}>{formatDisplayDateTime(item.occurredAt)}</time>
              ) : (
                "Recently"
              )}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <DashboardCard
      title="Recent Activity"
      description="Latest billing setup, invoice approval and delivery events."
      icon={Activity}
      actions={
        <Link
          to={AR_ROUTES.overview}
          className="inline-flex items-center gap-1 rounded text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          View All Configurations
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      }
    >
      <div aria-busy={loading}>{body}</div>
    </DashboardCard>
  );
}
