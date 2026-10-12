import { useCallback, useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, Wallet, BarChart3, Inbox, Upload } from "lucide-react";
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
import { useDashboardViews, useRoleDashboard } from "../hooks/useRoleDashboards";
import ManagementDashboard from "../components/ManagementDashboard";
import ApprovalsDashboard from "../components/ApprovalsDashboard";
import MyWorkDashboard from "../components/MyWorkDashboard";
import FinanceDashboard from "../components/FinanceDashboard";
import { SegmentedTabs } from "../components/insights";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import { useAuth } from "../../../../contexts/AuthContext";
import { formatDate } from "../../utils/formatters";
import { AP_ROUTES } from "../../constants/routes";
import { Link } from "react-router-dom";
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
function OverviewDashboard({ tabs = null }) {
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
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="AP Overview"
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

      {tabs}

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

/** Header, primary action and body for each role view. Copy is written from that person's
 * point of view; the backend decides which views a user may open. */
const VIEW_CONFIG = {
  management: {
    title: (n) => (n ? `Hi ${n}, here's where AP stands` : "Where AP stands"),
    subtitle: "Liabilities, expected outflow, efficiency and risk · read-only",
    action: { label: "Open reports", to: AP_ROUTES.REPORTS, icon: BarChart3 },
    Body: ManagementDashboard,
  },
  finance: {
    title: (n) => (n ? `Hi ${n}, here's your payables overview` : "Payables overview"),
    subtitle: "What to pay, what's overdue and what's coming up",
    action: { label: "Open payments", to: AP_ROUTES.PAYMENT_READY, icon: Wallet },
    Body: FinanceDashboard,
  },
  approvals: {
    title: (n) => (n ? `Hi ${n}, here's your approval queue` : "Your approval queue"),
    subtitle: "Invoices waiting for your decision, and how fast they move",
    action: { label: "Open approval queue", to: `${AP_ROUTES.INVOICE_LIST}?queue=approval`, icon: Inbox },
    Body: ApprovalsDashboard,
  },
  my_work: {
    title: (n) => (n ? `Hi ${n}, here's your invoice work` : "Your invoice work"),
    subtitle: "What to review, fix and send for approval next",
    action: { label: "Upload invoice", to: AP_ROUTES.INVOICE_UPLOAD, icon: Upload },
    Body: MyWorkDashboard,
  },
};

function RoleView({ view, tabs, onForbidden }) {
  const { user } = useAuth();
  const config = VIEW_CONFIG[view];
  const { data, isLoading, isFetching, isError, error, refetch } = useRoleDashboard(view);
  // Permissions changed since the view list was loaded (e.g. roles updated in UMS): move on to a
  // view this user may open instead of showing an error.
  const forbidden = isError && error?.status === 403;
  useEffect(() => {
    if (forbidden) onForbidden?.(view);
  }, [forbidden, onForbidden, view]);
  const firstName = (user?.name || user?.employee_name || "").split(" ")[0];
  const ActionIcon = config.action.icon;
  const Body = config.Body;
  const meta = [config.subtitle, data?.as_of ? `as of ${formatDate(data.as_of)}` : null, data?.base_currency ? `Amounts in ${data.base_currency}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Accounts Payable", to: AP_ROUTES.DASHBOARD }, { label: "Dashboard" }]} />
      <PageHeader
        title={config.title(firstName)}
        subtitle={meta}
        actions={
          <>
            <Button variant="outline" size="small" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
            </Button>
            <Link to={config.action.to}>
              <Button variant="primary" size="small">
                <ActionIcon size={14} /> {config.action.label}
              </Button>
            </Link>
          </>
        }
      />
      {tabs}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-24">
          <LoadingSpinner text="Loading dashboard..." />
        </div>
      ) : forbidden ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-24">
          <LoadingSpinner text="Switching to a view you can access..." />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-12 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700">Unable to load this dashboard.</p>
          <p className="max-w-md text-xs text-rose-600">{getApiErrorMessage(error, "Something went wrong — please try again.")}</p>
          <Button size="small" variant="outline" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <Body data={data} />
      )}
    </div>
  );
}

const VIEW_STORAGE_KEY = "ap.dashboard.view";

/**
 * AP Dashboard — one point of view per person. The backend (GET /dashboard/views) lists the role
 * views this user may open: Management (CEO / Chief Product Officer), Finance, Approvals, My work
 * (AP Executive). Each view only fetches and shows that role's own data. Users holding none of
 * them (e.g. procurement-only) get the permission-driven AP Overview instead. The chosen view is
 * remembered per browser, same as the Expense dashboard.
 */
export default function APDashboardPage() {
  const { data: views, isLoading, refetch: refetchViews } = useDashboardViews();
  const [denied, setDenied] = useState([]);
  const handleForbidden = useCallback(
    (view) => {
      setDenied((list) => (list.includes(view) ? list : [...list, view]));
      refetchViews();
    },
    [refetchViews],
  );
  const [chosen, setChosen] = useState(() => {
    try {
      return window.localStorage.getItem(VIEW_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading dashboard..." />
      </div>
    );
  }
  const available = (views || []).filter((v) => VIEW_CONFIG[v.key] && !denied.includes(v.key));
  if (available.length === 0) return <OverviewDashboard />;

  const active = available.some((v) => v.key === chosen) ? chosen : available[0].key;
  const choose = (value) => {
    setChosen(value);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, value);
    } catch {
      /* storage unavailable - the choice just isn't remembered */
    }
  };
  const switcher =
    available.length > 1 ? (
      <SegmentedTabs tabs={available.map((v) => ({ value: v.key, label: v.label }))} value={active} onChange={choose} />
    ) : null;
  return <RoleView key={active} view={active} tabs={switcher} onForbidden={handleForbidden} />;
}
