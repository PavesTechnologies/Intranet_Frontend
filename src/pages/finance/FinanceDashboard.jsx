import React, { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ChevronDown, FlaskConical, Wallet } from "lucide-react";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";
import { isFinanceEnabled } from "../../utils/applicationRoutes";
import { AP_ROUTES } from "../accounts-payable/constants/routes";
import { useFinanceAccess } from "./hooks/useFinanceAccess";
import { useSessionSelection } from "./hooks/useSessionSelection";
import {
  FINANCE_PERIOD_OPTIONS,
  DEFAULT_FINANCE_PERIOD,
  getFinanceDashboardData,
} from "./data/financeDashboardMockData";
import { DASHBOARD_VIEW_ROLE_OPTIONS, DEFAULT_DASHBOARD_VIEW_ROLE } from "./constants/dashboardViewRoles";
import { formatInrCompact } from "./utils/financeFormatters";
import FinanceKpiCards from "./components/FinanceKpiCards";
import FinanceQuickActions from "./components/FinanceQuickActions";
import FinancialSnapshot from "./components/FinancialSnapshot";
import FinanceModuleCards from "./components/FinanceModuleCards";
import CashFlowChart from "./components/CashFlowChart";
import TaxComplianceOverview from "./components/TaxComplianceOverview";
import FinancialActionCenter from "./components/FinancialActionCenter";
import ExpenseOverview from "./components/ExpenseOverview";
import PayablesReceivables from "./components/PayablesReceivables";
import RecentFinancialActivity from "./components/RecentFinancialActivity";

const PERIOD_IDS = FINANCE_PERIOD_OPTIONS.map((p) => p.id);
const PERIOD_SELECT_OPTIONS = FINANCE_PERIOD_OPTIONS.map((p) => ({ value: p.id, label: p.label }));
const ROLE_VALUES = DASHBOARD_VIEW_ROLE_OPTIONS.map((r) => r.value);

function HeaderSelect({ label, value, onChange, options, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 focus:border-[#0A0082]/50 focus:outline-none focus:ring-2 focus:ring-[#0A0082]/15"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
    </div>
  );
}

// Finance Management landing page — the entry point when a user switches from
// Paves Intranet to Finance via the Application Switcher.
//
// CURRENT PHASE: every authenticated user who reaches this route sees the same,
// complete dashboard — no section or module card is hidden by role. The role
// dropdown is a display-only context control (it does not check or grant
// permissions and does not change the layout). Role-based personalisation
// comes in a later phase. The module routes themselves keep their existing
// ProtectedRoute guards in App.jsx.
//
// All figures come from data/financeDashboardMockData.js (illustrative).
const FinanceDashboard = () => {
  const navigate = useNavigate();
  const { modules, reportsRoute, canOpenReports } = useFinanceAccess();
  const [period, setPeriod] = useSessionSelection("finance.dashboard.period", DEFAULT_FINANCE_PERIOD, PERIOD_IDS);
  const [viewRole, setViewRole] = useSessionSelection("finance.dashboard.viewRole", DEFAULT_DASHBOARD_VIEW_ROLE, ROLE_VALUES);
  const data = useMemo(() => getFinanceDashboardData(period), [period]);

  // Global kill switch (public/config.js FINANCE_TOGGLE) — closes off direct
  // URL access too, not just the Application Switcher entry point.
  if (!isFinanceEnabled()) {
    return <Navigate to="/dashboard" replace />;
  }

  // Click-through targets. A route is passed only when the logged-in user's
  // roles can open it (same rule the Action Center uses), so nothing on this
  // page becomes a clickable path to a page the user would be refused.
  const linkIf = (allowed, to) => (allowed ? to : undefined);
  const moduleLinks = {
    ap: linkIf(modules.ap.visible, modules.ap.to),
    ar: linkIf(modules.ar.visible, modules.ar.to),
    xms: linkIf(modules.xms.visible, modules.xms.to),
  };
  const reportsLink = linkIf(canOpenReports, reportsRoute);
  const kpiLinks = {
    totalReceivables: moduleLinks.ar,
    totalPayables: moduleLinks.ap,
    totalExpenses: moduleLinks.xms,
    netCashFlow: reportsLink,
  };
  const taxLinks = {
    gst: linkIf(modules.ap.visible, AP_ROUTES.GST_ITC),
    tds: linkIf(modules.ap.visible, AP_ROUTES.TDS_TRACKING),
    tdsCredit: moduleLinks.ar,
    onOpenGst: () => navigate(AP_ROUTES.GST_ITC),
  };

  const moduleMetrics = {
    ar: `${formatInrCompact(data.kpis.totalReceivables)} outstanding`,
    ap: `${formatInrCompact(data.kpis.totalPayables)} payable`,
    xms: `${formatInrCompact(data.kpis.totalExpenses)} expenses`,
  };

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: "Paves Intranet", to: "/dashboard" }, { label: "Finance Management" }]} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A0082] text-white sm:flex">
            <Wallet className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">Finance Management</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              A consolidated view of receivables, payables, expenses and financial health.
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200"
            title="Figures on this page are illustrative sample data, not actual financials."
          >
            <FlaskConical className="h-3 w-3" aria-hidden="true" />
            Sample data
          </span>
          <HeaderSelect label="Dashboard role" value={viewRole} onChange={setViewRole} options={DASHBOARD_VIEW_ROLE_OPTIONS} className="min-w-[10rem] flex-1 sm:w-48 sm:flex-none" />
          <HeaderSelect label="Financial period" value={period} onChange={setPeriod} options={PERIOD_SELECT_OPTIONS} className="min-w-[10rem] flex-1 sm:w-52 sm:flex-none" />
        </div>
      </div>

      <section aria-label="Overall financial overview">
        <FinanceKpiCards kpis={data.kpis} trends={data.kpiTrends} links={kpiLinks} />
      </section>

      {/* 3-column grid on large screens; each row's cards stretch to equal height,
          which keeps the page short instead of two long uneven columns. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Row 1 */}
        <FinanceModuleCards modules={modules} metrics={moduleMetrics} className="lg:col-span-2" />
        <FinancialSnapshot kpis={data.kpis} reportsRoute={reportsRoute} />

        {/* Row 2 */}
        <CashFlowChart data={data.cashFlow} onOpen={reportsLink ? () => navigate(reportsLink) : undefined} className="lg:col-span-2" />
        <FinancialActionCenter items={data.actionItems} modules={modules} />

        {/* Row 3 */}
        <TaxComplianceOverview tax={data.tax} links={taxLinks} className="lg:col-span-2" />
        <ExpenseOverview categories={data.expenseCategories} onExplore={moduleLinks.xms ? () => navigate(moduleLinks.xms) : undefined} />

        {/* Row 4 */}
        <RecentFinancialActivity items={data.recentActivity} moduleLinks={moduleLinks} className="lg:col-span-2" />
        <div className="flex min-w-0 flex-col gap-4">
          <FinanceQuickActions modules={modules} reportsRoute={reportsRoute} />
          <PayablesReceivables kpis={data.kpis} links={moduleLinks} className="flex-1" />
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
