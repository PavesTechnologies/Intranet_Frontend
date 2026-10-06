import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Inbox,
  AlertTriangle,
  AlertCircle,
  Wallet,
  Hash,
  ChevronRight,
  ScanLine,
  FileEdit,
  RotateCcw,
  CreditCard,
  PieChart as PieChartIcon,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  FileSearch,
  ShoppingCart,
  ClipboardList,
  UserPlus,
  Building2,
} from "lucide-react";
import { useEmployeeDirectory, resolveEmployeeName } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";
import { formatDate, formatTime } from "../../utils/formatters";
import { formatDashboardAmount, formatTrendPeriodLabel, prettifyKey } from "../utils/dashboardFormatters";
import {
  actionItemRoute,
  recentActivityRoute,
  categorizeKpiTitle,
  canNavigateToKpi,
  canNavigateToActionItem,
  kpiRoute,
} from "../utils/dashboardNavigation";
import { useApPermissions } from "../../hooks/useApPermissions";

// AP's own brand accent (#0A0082, used throughout invoice/payment/system-config forms) leads a
// small categorical palette for pie slices / multi-currency trend series — not recharts defaults.
const SERIES_COLORS = ["#0A0082", "#2563eb", "#059669", "#d97706", "#db2777", "#7c3aed", "#0891b2"];
const PRIORITY_STYLES = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-gray-200 bg-gray-50 text-gray-600",
};

function Empty({ text = "Nothing here right now." }) {
  return (
    <div className="flex h-full min-h-[100px] flex-col items-center justify-center gap-1.5 text-center">
      <Inbox className="h-6 w-6 text-gray-300" />
      <p className="text-xs text-gray-400">{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------- shell

export function ChartCard({ title, subtitle, children, className = "", action }) {
  return (
    <section className={`flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------- kpis

// Backend KPIs carry a title but no category/severity — both are inferred client-side from the
// title text so the grid can group related metrics and color the ones that signal a problem,
// instead of showing 20+ identical white tiles in one flat row.
const KPI_GROUPS = ["Invoices", "Procurement", "Vendors", "Other"];

function toneForKpiTitle(title = "") {
  const t = title.toLowerCase();
  if (/(failed|disputed|rejected|overdue)/.test(t)) return "rose";
  if (/(pending|awaiting|draft|returned|review)/.test(t)) return "amber";
  if (/(approved|paid|active|ready)/.test(t)) return "emerald";
  return "slate";
}

const TONE_CHIP_STYLES = {
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  slate: "bg-slate-100 text-slate-500",
};

function iconForKpiTitle(title = "") {
  const t = title.toLowerCase();
  if (t.includes("ocr failed")) return AlertCircle;
  if (t.includes("ocr review")) return ScanLine;
  if (t.includes("draft")) return FileEdit;
  if (t.includes("returned")) return RotateCcw;
  if (t.includes("ready for payment")) return CreditCard;
  if (t.includes("partially paid")) return PieChartIcon;
  if (t.includes("paid")) return CheckCheck;
  if (t.includes("disputed")) return AlertTriangle;
  if (t.includes("rejected")) return XCircle;
  if (t.includes("pending")) return Clock;
  if (t.includes("approved")) return CheckCircle2;
  if (t.includes("rfq")) return FileSearch;
  if (t.includes("purchase order")) return ShoppingCart;
  if (/\bprs?\b/.test(t)) return ClipboardList;
  if (t.includes("onboarding")) return UserPlus;
  if (t.includes("vendor")) return Building2;
  if (t.includes("invoice")) return FileText;
  return Hash;
}

function KpiTile({ kpi, permissions }) {
  const navigate = useNavigate();
  // A tile only gets a click-through when the user both (a) has somewhere to go and (b) actually
  // holds the permission that target page requires — otherwise the link would just dead-end them.
  // kpiRoute() (title-based) is used here rather than actionItemRoute() (key/module-based) because
  // kpi.key/kpi.module values aren't confirmed against a real backend payload — title is the one
  // signal already proven reliable for these tiles (see dashboardNavigation.js's routeForTitle).
  const to = canNavigateToKpi(kpi, permissions) ? kpiRoute(kpi) : null;
  const hasAmounts = Array.isArray(kpi.amounts) && kpi.amounts.length > 0;
  const primaryValue = hasAmounts ? formatDashboardAmount(kpi.amounts[0]) : kpi.value ?? "—";
  const extraCurrencyLines = hasAmounts && kpi.amounts.length > 1 ? kpi.amounts.slice(1) : [];
  const tone = toneForKpiTitle(kpi.title);
  const Icon = hasAmounts ? Wallet : iconForKpiTitle(kpi.title);

  return (
    <div
      onClick={to ? () => navigate(to) : undefined}
      className={`flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition ${
        to ? "cursor-pointer hover:border-gray-300 hover:shadow-sm" : ""
      }`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${TONE_CHIP_STYLES[tone]}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10.5px] font-medium uppercase tracking-wide text-gray-400">{kpi.title}</p>
        <p className="text-base font-bold leading-tight text-gray-900">{primaryValue}</p>
        {extraCurrencyLines.length > 0 && (
          <p className="truncate text-[10px] text-gray-400">
            {extraCurrencyLines.map((a) => formatDashboardAmount(a)).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Renders exactly the `kpis` array the backend returns — no assumption about count/order/which
 * ones exist. Grouped into Invoices/Procurement/Vendors/Other (inferred from each kpi's own
 * title) so related metrics read together instead of one flat wall of identical cards.
 */
export function KpiGrid({ kpis }) {
  const permissions = useApPermissions();
  if (!kpis?.length) return null;

  const grouped = new Map();
  kpis.forEach((kpi) => {
    const group = categorizeKpiTitle(kpi.title);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group).push(kpi);
  });

  return (
    <div className="space-y-4">
      {KPI_GROUPS.filter((group) => grouped.has(group)).map((group) => (
        <div key={group}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {grouped.get(group).map((kpi) => (
              <KpiTile key={kpi.key} kpi={kpi} permissions={permissions} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- action required

/** Backend already orders non-zero items first — this never re-sorts. Zero-value items are
 * hidden per the spec's own UX guidance ("prefer hiding zero-value action items"). */
export function ActionRequiredList({ items }) {
  const navigate = useNavigate();
  const permissions = useApPermissions();
  const visible = (items || []).filter((item) => Number(item.value) > 0);
  if (visible.length === 0) return <Empty text="Nothing needs your attention right now." />;

  return (
    <ul className="space-y-2">
      {visible.map((item) => {
        const to = canNavigateToActionItem(item, permissions) ? actionItemRoute(item) : null;
        return (
          <li
            key={item.key}
            onClick={to ? () => navigate(to) : undefined}
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
              PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.low
            } ${to ? "cursor-pointer hover:brightness-95" : ""}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span className="truncate text-sm font-medium">{item.title}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-bold tabular-nums">{item.value}</span>
              {to && <ChevronRight size={14} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- status summary

/** One donut per status_summary[] entry — {key, items: [{status_code, label, count}]}. Uses the
 * backend's own `label`, never recreates a status->label mapping client-side. */
export function StatusSummaryChart({ items }) {
  const total = (items || []).reduce((sum, s) => sum + (s.count || 0), 0);
  if (!items?.length || total === 0) return <Empty text="No status data for this period." />;

  const data = items.filter((s) => s.count > 0);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
      <div className="relative h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={55} outerRadius={75} paddingAngle={3}>
              {data.map((entry, index) => (
                <Cell key={entry.status_code} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold text-gray-900">{total}</p>
          <p className="text-[11px] text-gray-500">Total</p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {data.map((s, index) => (
          <li key={s.status_code} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate text-gray-700">{s.label}</span>
            <span className="font-semibold tabular-nums text-gray-900">{s.count}</span>
            <span className="w-9 text-right tabular-nums text-gray-400">{Math.round((s.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- financial summary

/** One card per financial_summary[] entry — {key, scope, amounts: [...]}. One line per currency,
 * never a combined total across currencies. */
export function FinancialSummaryCards({ items }) {
  if (!items?.length) return <Empty text="No financial summary for this period." />;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((entry) => (
        <div key={entry.key} className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{prettifyKey(entry.key)}</p>
          <div className="mt-1 space-y-0.5">
            {(entry.amounts || []).map((a) => (
              <p key={a.currency_code} className="text-lg font-bold text-gray-900">
                {formatDashboardAmount(a)}
                {entry.amounts.length > 1 && <span className="ml-1 text-xs font-normal text-gray-400">{a.currency_code}</span>}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- trends

/**
 * One trends[] entry — {key, granularity, series: [{currency_code, points: [{period, value}]}]}.
 * Multiple currency series are rendered as distinct Area lines on the same period axis — never
 * combined/summed into one line.
 */
export function DashboardTrendChart({ trend }) {
  const series = trend?.series || [];
  const hasData = series.some((s) => s.points?.some((p) => Number(p.value) > 0));
  if (!hasData) return <Empty text="No activity in this period yet." />;

  // Pivot into one row per period, one field per currency code, so recharts can render each
  // currency as its own <Area> sharing the same x-axis.
  const byPeriod = new Map();
  series.forEach((s) => {
    (s.points || []).forEach((p) => {
      const row = byPeriod.get(p.period) || { period: p.period };
      row[s.currency_code] = Number(p.value) || 0;
      byPeriod.set(p.period, row);
    });
  });
  const data = Array.from(byPeriod.values()).sort((a, b) => a.period.localeCompare(b.period));
  const currencyCodes = series.map((s) => s.currency_code);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          {currencyCodes.map((code, index) => (
            <linearGradient key={code} id={`trendFill-${code}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLORS[index % SERIES_COLORS.length]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={SERIES_COLORS[index % SERIES_COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="period" tickFormatter={formatTrendPeriodLabel} tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
        <Tooltip labelFormatter={formatTrendPeriodLabel} />
        {currencyCodes.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {currencyCodes.map((code, index) => (
          <Area
            key={code}
            type="monotone"
            dataKey={code}
            name={code}
            stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
            strokeWidth={2}
            fill={`url(#trendFill-${code})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------- recent activity

/** {title, entity_type, entity_id, reference, actor, occurred_at}[]. `actor` is a numeric
 * employee id — resolved to a name the same way InvoiceAuditHistory.jsx resolves changed_by. */
const RECENT_ACTIVITY_PREVIEW_COUNT = 5;

export function RecentActivityList({ items }) {
  const navigate = useNavigate();
  const { data: employeeDirectory } = useEmployeeDirectory();
  const [expanded, setExpanded] = useState(false);
  if (!items?.length) return <Empty text="No recent activity." />;

  const hasMore = items.length > RECENT_ACTIVITY_PREVIEW_COUNT;
  const visibleItems = expanded ? items : items.slice(0, RECENT_ACTIVITY_PREVIEW_COUNT);

  return (
    <div>
      <ul className="space-y-3 border-l border-gray-200 pl-4">
        {visibleItems.map((item, index) => {
          const to = recentActivityRoute(item);
          return (
            <li
              key={`${item.entity_type}-${item.entity_id}-${item.occurred_at}-${index}`}
              onClick={to ? () => navigate(to) : undefined}
              className={`relative ${to ? "cursor-pointer" : ""}`}
            >
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#0A0082]" />
              <p className="text-sm font-medium text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500">
                {item.reference && <span className="font-mono">{item.reference}</span>}
                {item.reference && " · "}
                {formatDate(item.occurred_at)} {formatTime(item.occurred_at)}
                {item.actor ? ` · ${resolveEmployeeName(employeeDirectory, item.actor)}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 text-xs font-semibold text-[#0A0082] hover:underline"
        >
          {expanded ? "Show less" : `View ${items.length - RECENT_ACTIVITY_PREVIEW_COUNT} more`}
        </button>
      )}
    </div>
  );
}
