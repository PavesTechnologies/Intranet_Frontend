import React from "react";
import PageHeader from "../../../../components/ui/PageHeader";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { useAPDashboard } from "../hooks/useAPDashboard";
import KPICardGrid from "../components/KPICardGrid";
import InvoicePipelineStepper from "../components/InvoicePipelineStepper";
import WorkQueuePanel from "../components/WorkQueuePanel";
import QuickActionsPanel from "../components/QuickActionsPanel";
import ApprovalSummaryCard from "../components/ApprovalSummaryCard";
import PaymentSummaryCard from "../components/PaymentSummaryCard";
import ExceptionSummaryCard from "../components/ExceptionSummaryCard";
import InvoiceAgingChart from "../components/charts/InvoiceAgingChart";
import PayablesTrendChart from "../components/charts/PayablesTrendChart";
import ExceptionBreakdownChart from "../components/charts/ExceptionBreakdownChart";
import TopVendorsChart from "../components/charts/TopVendorsChart";
import RecentActivityFeed from "../components/RecentActivityFeed";

const formatAsOf = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function APDashboardPage() {
  const { data, isLoading, isError, error } = useAPDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back — here's what needs your attention today."
        actions={
          data?.asOf ? (
            <span className={Fonts.smallText}>Data as of {formatAsOf(data.asOf)}</span>
          ) : null
        }
      />

      {isLoading && <LoadingSpinner text="Loading dashboard..." size="lg" />}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load dashboard data{error?.message ? `: ${error.message}` : "."}
        </div>
      )}

      {!isLoading && !isError && data && (
        <div className="space-y-6">
          <KPICardGrid kpis={data.kpis} />

          <InvoicePipelineStepper pipeline={data.pipeline} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className={`${Fonts.subheading} mb-3`}>My Work Queue</h2>
              <WorkQueuePanel items={data.workQueue} />
            </div>
            <div>
              <h2 className={`${Fonts.subheading} mb-3`}>Quick Actions</h2>
              <QuickActionsPanel />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <ApprovalSummaryCard summary={data.approvalSummary} />
            <PaymentSummaryCard summary={data.paymentSummary} />
            <ExceptionSummaryCard summary={data.exceptionSummary} />
          </div>

          <div>
            <h2 className={`${Fonts.subheading} mb-3`}>Analytics</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <InvoiceAgingChart data={data.charts.aging} />
              <PayablesTrendChart data={data.charts.payablesTrend} />
              <ExceptionBreakdownChart data={data.charts.exceptionsByType} />
              <TopVendorsChart data={data.charts.topVendors} />
            </div>
          </div>

          <RecentActivityFeed items={data.recentActivity} />
        </div>
      )}
    </div>
  );
}
