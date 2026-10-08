import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import {
  ChartCard,
  KpiGrid,
  ActionRequiredList,
  StatusSummaryChart,
  FinancialSummaryCards,
  DashboardTrendChart,
  RecentActivityCard,
} from "../components/DashboardWidgets";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatPeriodRange, prettifyKey } from "../utils/dashboardFormatters";

/**
 * ONE reusable AP Dashboard, driven entirely by GET /apm/dashboard/summary — no role-specific
 * variants. The backend decides what this user is authorized to see (the `sections` array); this
 * page only renders whichever of kpis/action_required/status_summary/financial_summary/trends/
 * recent_activity actually came back non-empty. Date range affects trends/recent activity/
 * "paid in period" on the backend — it does NOT change current counts/outstanding amounts, per
 * the backend's own documented behavior; this page never recomputes that distinction itself.
 */
export default function APDashboardPage() {
  // Seeded empty on first load — sending no from_date/to_date lets the backend apply its own
  // default (last 30 days) and return the resolved period, which then seeds the date pickers.
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedRange, setAppliedRange] = useState({ fromDate: "", toDate: "" });
  const [dateError, setDateError] = useState("");

  const { data, isLoading, isFetching, isError, error, refetch } = useDashboardSummary(appliedRange);

  // Seed the pickers from the backend's resolved period the first time data arrives, so the UI
  // reflects the actual range in effect rather than a client-guessed one.
  useEffect(() => {
    if (data?.period && !fromDate && !toDate) {
      setFromDate(data.period.from_date || "");
      setToDate(data.period.to_date || "");
    }
  }, [data, fromDate, toDate]);

  const applyRange = () => {
    if (fromDate && toDate) {
      if (fromDate > toDate) {
        setDateError("From date must be on or before the To date.");
        return;
      }
      const spanDays = (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24);
      if (spanDays > 366) {
        setDateError("Date range cannot exceed 366 days.");
        return;
      }
    }
    setDateError("");
    setAppliedRange({ fromDate, toDate });
  };

  const is422 = error?.status === 422;
  const hasAnyData =
    (data?.kpis?.length ?? 0) > 0 ||
    (data?.action_required?.length ?? 0) > 0 ||
    (data?.status_summary?.length ?? 0) > 0 ||
    (data?.financial_summary?.length ?? 0) > 0 ||
    (data?.trends?.length ?? 0) > 0 ||
    (data?.recent_activity?.length ?? 0) > 0;

  return (
    <div className="p-6">
      <PageHeader
        title="Accounts Payable Dashboard"
        subtitle={data?.period ? formatPeriodRange(data.period.from_date, data.period.to_date) : "Here's what's happening across AP"}
        actions={
          <>
            <FormDatePicker label="From" name="dashboardFrom" value={fromDate} onChange={(e) => setFromDate(e.target.value)} max={toDate || undefined} />
            <FormDatePicker label="To" name="dashboardTo" value={toDate} onChange={(e) => setToDate(e.target.value)} min={fromDate || undefined} />
            <Button variant="outline" size="small" onClick={applyRange} className="self-end">
              Apply
            </Button>
            <Button variant="outline" size="small" onClick={() => refetch()} loading={isFetching} className="self-end">
              <RefreshCw size={14} /> Refresh
            </Button>
          </>
        }
      />

      {dateError && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-red-600">
          <AlertTriangle size={14} /> {dateError}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-24">
          <LoadingSpinner text="Loading dashboard..." />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-12 text-center">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <p className="text-sm font-semibold text-red-700">
            {is422 ? "That date range isn't valid." : "Unable to load dashboard data."}
          </p>
          <p className="max-w-md text-xs text-red-600">
            {getApiErrorMessage(error, is422 ? "Check the From/To dates and try again." : "Something went wrong — please try again.")}
          </p>
          <Button size="small" variant="outline" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : !hasAnyData ? (
        <PageCard>
          <PageCardContent>
            <p className="py-10 text-center text-sm text-gray-500">
              No dashboard information is available for your current access.
            </p>
          </PageCardContent>
        </PageCard>
      ) : (
        <div className="space-y-4">
          <KpiGrid kpis={data.kpis} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.action_required?.length > 0 && (
              <ChartCard title="Action Required" subtitle="Things that need your decision">
                <ActionRequiredList items={data.action_required} />
              </ChartCard>
            )}
            {data.status_summary?.map((summary) => (
              <ChartCard key={summary.key} title={prettifyKey(summary.key)}>
                <StatusSummaryChart items={summary.items} />
              </ChartCard>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.financial_summary?.length > 0 && (
              <ChartCard title="Financial Summary">
                <FinancialSummaryCards items={data.financial_summary} />
              </ChartCard>
            )}
            {data.trends?.map((trend) => (
              <ChartCard key={trend.key} title={prettifyKey(trend.key)} subtitle="Over the selected period">
                <DashboardTrendChart trend={trend} />
              </ChartCard>
            ))}
          </div>

          {data.recent_activity?.length > 0 && (
            <RecentActivityCard items={data.recent_activity} period={data.period} />
          )}
        </div>
      )}
    </div>
  );
}
