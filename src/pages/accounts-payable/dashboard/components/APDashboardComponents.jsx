import { Link } from "react-router-dom";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  IndianRupee,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import StatusBadge from "../../../../components/status/statusbadge";
import PageHeader from "../../../../components/ui/PageHeader";

import { AP_ROUTES } from "../../constants/routes";

import {
  apAging,
  attentionQueue,
  dashboardKpis,
  dateRangeOptions,
  exceptionAnalysis,
  invoiceIntakeQuality,
  invoiceProcessingStages,
  paymentOverview,
  topVendors,
} from "../mocks/apDashboardMockData";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const toneText = {
  default: "text-slate-800",
  amber: "text-amber-700",
  rose: "text-rose-700",
  indigo: "text-indigo-700",
  emerald: "text-emerald-700",
};

const toneBar = {
  default: "bg-slate-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
};

const priorityStyles = {
  Critical:
    "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
  High:
    "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
  Medium:
    "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
};

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                   */
/* -------------------------------------------------------------------------- */

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard Header                                                           */
/* -------------------------------------------------------------------------- */

export function DashboardHeader({
  onRefresh,
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  return (
    <PageHeader
      title="Accounts Payable Dashboard"
      subtitle="Monitor invoices, exceptions, approvals, payables and payments"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <label
            className="
              inline-flex items-center gap-2
              rounded-lg border border-slate-200
              bg-white px-3 py-2
              text-sm text-slate-700
              shadow-sm
            "
          >
            <CalendarDays className="h-4 w-4 text-slate-500" />

            <select className="bg-transparent text-sm font-medium outline-none">
              {dateRangeOptions.map((option) => (
                <option key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <Button
            variant="outline"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/* KPI GRID                                                                   */
/* -------------------------------------------------------------------------- */

const kpiIcons = {
  "Total Invoices": FileText,
  "Pending Invoices": Clock3,
  Exceptions: AlertTriangle,
  "Pending Approvals": FileCheck2,
  "Outstanding Payable": WalletCards,
  "Overdue Payable": AlertCircle,
  "Due in Next 7 Days": CalendarDays,
  "Paid This Month": CheckCircle2,
};

export function APKpiGrid({
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 8 }).map(
          (_, index) => (
            <div
              key={index}
              className="
                rounded-lg
                border border-slate-200
                bg-white
                px-3 py-2.5
                shadow-sm
              "
            >
              <Skeleton className="h-2.5 w-20" />

              <Skeleton
                className="
                  mt-2
                  h-5
                  w-20
                "
              />

              <Skeleton
                className="
                  mt-1.5
                  h-2.5
                  w-24
                "
              />
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {dashboardKpis.map((kpi) => {
        const Icon =
          kpiIcons[kpi.title] ||
          FileText;

        const trendIsPositive =
          kpi.trendDirection ===
          "up";

        return (
          <div
            key={kpi.title}
            className="
              group relative
              overflow-hidden
              rounded-lg
              border border-slate-200
              bg-white
              px-3 py-2.5
              shadow-sm
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:border-slate-300
              hover:shadow-md
            "
          >
            <div className="flex items-center justify-between gap-2">

              {/* Content */}
              <div className="min-w-0">

                <p className="
                  truncate
                  text-[10px]
                  font-medium
                  text-slate-500
                  sm:text-[11px]
                ">
                  {kpi.title}
                </p>

                <p
                  className={`
                    mt-0.5
                    truncate
                    text-base
                    font-bold
                    tracking-tight
                    sm:text-lg
                    ${
                      toneText[
                        kpi.tone
                      ] ||
                      toneText.default
                    }
                  `}
                >
                  {kpi.value}
                </p>

                <p className="
                  mt-0.5
                  truncate
                  text-[9px]
                  text-slate-400
                  sm:text-[10px]
                ">
                  {kpi.subtitle}
                </p>

              </div>

              {/* Compact icon */}
              <div
                className="
                  flex
                  h-7 w-7
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-slate-50
                  transition-all
                  duration-300
                  group-hover:scale-105
                  sm:h-8
                  sm:w-8
                "
              >
                <Icon
                  className="
                    h-3.5
                    w-3.5
                    text-slate-500
                    sm:h-4
                    sm:w-4
                  "
                />
              </div>

            </div>

            {/* Trend */}
            {kpi.trend && (
              <div
                className="
                  mt-1.5
                  flex
                  items-center
                  gap-1
                  text-[9px]
                  font-semibold
                  sm:text-[10px]
                "
              >
                {kpi.trendDirection ===
                  "up" && (
                  <TrendingUp
                    className="
                      h-2.5
                      w-2.5
                      text-emerald-600
                    "
                  />
                )}

                {kpi.trendDirection ===
                  "down" && (
                  <TrendingDown
                    className="
                      h-2.5
                      w-2.5
                      text-emerald-600
                    "
                  />
                )}

                <span className="text-slate-400">
                  {kpi.trend}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
/* -------------------------------------------------------------------------- */
/* Attention Queue                                                            */
/* -------------------------------------------------------------------------- */

export function AttentionQueue({
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-5 h-12 w-full" />
        <Skeleton className="mt-2 h-12 w-full" />
        <Skeleton className="mt-2 h-12 w-full" />
      </div>
    );
  }

  return (
    <section
      className="
        overflow-hidden rounded-xl
        border border-rose-200
        bg-gradient-to-r
        from-rose-50/70
        via-white
        to-white
        shadow-sm
      "
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Requires Your Attention
            </h2>

            <p className="text-xs text-slate-500">
              {attentionQueue.length} invoices require action
            </p>
          </div>
        </div>

        <Link
          to={AP_ROUTES.INVOICE_LIST}
          className="text-xs font-semibold text-[#0A0082] hover:underline"
        >
          View All →
        </Link>
      </div>

      <div className="grid border-t border-rose-100 sm:grid-cols-2 xl:grid-cols-4">
        {attentionQueue.map((item) => (
          <div
            key={item.invoice}
            className="
              group
              border-b border-slate-100
              p-4 transition-all
              duration-300
              hover:bg-white
              hover:shadow-[inset_0_-2px_0_0_rgba(244,63,94,0.7)]
              xl:border-b-0
              xl:border-r
              last:border-r-0
            "
          >
            <div className="flex items-center justify-between gap-2">
              <Link
                to={AP_ROUTES.INVOICE_LIST}
                className="text-sm font-bold text-[#0A0082]"
              >
                {item.invoice}
              </Link>

              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  priorityStyles[item.priority]
                }`}
              >
                {item.priority}
              </span>
            </div>

            <p className="mt-2 truncate text-xs font-medium text-slate-700">
              {item.vendor}
            </p>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                {item.amount}
              </span>

              <Button
                size="small"
                variant={
                  item.priority === "Critical"
                    ? "danger"
                    : "outline"
                }
              >
                {item.action}
              </Button>
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              {item.issue}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Interactive Tube                                                           */
/* -------------------------------------------------------------------------- */

function InsightTube({
  title,
  subtitle,
  icon: Icon,
  accent = "slate",
  summary,
  children,
  isActive = false,
  isManual = false,
  onToggle,
  action,
}) {
  const accentStyles = {
    slate: {
      border: "border-slate-200",
      activeBorder: "border-slate-300",
      icon: "bg-slate-100 text-slate-600",
      activeIcon:
        "bg-slate-200 text-slate-700",
      glow: "from-slate-50",
    },

    indigo: {
      border: "border-indigo-100",
      activeBorder:
        "border-indigo-200",
      icon:
        "bg-indigo-50 text-indigo-600",
      activeIcon:
        "bg-indigo-100 text-indigo-700",
      glow:
        "from-indigo-50/70",
    },

    emerald: {
      border:
        "border-emerald-100",
      activeBorder:
        "border-emerald-200",
      icon:
        "bg-emerald-50 text-emerald-600",
      activeIcon:
        "bg-emerald-100 text-emerald-700",
      glow:
        "from-emerald-50/70",
    },

    rose: {
      border:
        "border-rose-100",
      activeBorder:
        "border-rose-200",
      icon:
        "bg-rose-50 text-rose-600",
      activeIcon:
        "bg-rose-100 text-rose-700",
      glow:
        "from-rose-50/70",
    },

    amber: {
      border:
        "border-amber-100",
      activeBorder:
        "border-amber-200",
      icon:
        "bg-amber-50 text-amber-600",
      activeIcon:
        "bg-amber-100 text-amber-700",
      glow:
        "from-amber-50/70",
    },
  };

  const style =
    accentStyles[accent] ||
    accentStyles.slate;

  return (
    <section
      className={`
        overflow-hidden
        rounded-xl
        border
        bg-white
        transition-all
        duration-[650ms]
        ease-[cubic-bezier(0.22,1,0.36,1)]
        ${
          isActive
            ? `${style.activeBorder} shadow-lg`
            : `${style.border} shadow-sm`
        }
      `}
    >
      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}

      <button
        type="button"
        onClick={onToggle}
        className={`
          relative
          flex
          min-h-[76px]
          w-full
          items-center
          gap-3
          px-4
          py-3
          text-left
          sm:px-5
          bg-gradient-to-r
          ${style.glow}
          to-white
          transition-all
          duration-300
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-[#0A0082]/30
        `}
        aria-expanded={isActive}
      >
        {/* Icon */}
        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            transition-all
            duration-[650ms]
            ${
              isActive
                ? `${style.activeIcon} scale-105`
                : style.icon
            }
          `}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">

          <div className="
            flex
            flex-wrap
            items-center
            gap-x-2
          ">
            <h2 className="
              text-sm
              font-bold
              text-slate-900
            ">
              {title}
            </h2>

            <span className="
              hidden
              text-slate-300
              sm:inline
            ">
              •
            </span>

            <span className="
              truncate
              text-xs
              text-slate-500
            ">
              {subtitle}
            </span>
          </div>

          <div className="
            mt-1
            truncate
            text-xs
            font-medium
            text-slate-700
            sm:text-sm
          ">
            {summary}
          </div>

        </div>

        {/* Right side */}
        <div
          className="
            flex
            shrink-0
            items-center
            gap-2
          "
        >
          {action}

          {isManual && (
            <span
              className="
                hidden
                rounded-full
                bg-[#0A0082]/10
                px-2
                py-1
                text-[9px]
                font-semibold
                text-[#0A0082]
                sm:inline-flex
              "
            >
              Manual
            </span>
          )}

          {/* Chevron */}
          <span
            className={`
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              border
              border-slate-100
              bg-white
              text-slate-400
              shadow-sm
              transition-transform
              duration-[650ms]
              ease-[cubic-bezier(0.22,1,0.36,1)]
              ${
                isActive
                  ? "rotate-180"
                  : "rotate-0"
              }
            `}
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>
      </button>

      {/* ================================================================ */}
      {/* FULL DETAIL                                                      */}
      {/* ================================================================ */}

      <div
        className={`
          grid
          transition-[grid-template-rows,opacity]
          duration-[650ms]
          ease-[cubic-bezier(0.22,1,0.36,1)]
          ${
            isActive
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }
        `}
      >
        <div className="
          min-h-0
          overflow-hidden
        ">
          <div
            className={`
              border-t
              border-slate-100
              px-4
              pb-5
              pt-4
              transition-transform
              duration-[650ms]
              ease-[cubic-bezier(0.22,1,0.36,1)]
              ${
                isActive
                  ? "translate-y-0"
                  : "-translate-y-4"
              }
            `}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
/* -------------------------------------------------------------------------- */
/* Processing Tube                                                            */
/* -------------------------------------------------------------------------- */
function InsightMetric({
  label,
  value,
  percentage,
  tone = "default",
  index,
  isActive = false,
}) {
  const barClass =
    toneBar[tone] || toneBar.default;

  return (
    <div
      className="
        group/metric
        rounded-lg
        border border-slate-100
        bg-slate-50/60
        px-3
        py-2.5
        transition-all
        duration-300
        hover:border-slate-200
        hover:bg-white
        hover:shadow-sm
      "
    >
      {/* -------------------------------------------------------------- */}
      {/* TOP ROW                                                        */}
      {/* -------------------------------------------------------------- */}

      <div className="flex items-center justify-between gap-2">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="
              flex
              h-5
              w-5
              shrink-0
              items-center
              justify-center
              rounded-md
              bg-white
              text-[9px]
              font-bold
              text-slate-400
              shadow-sm
            "
          >
            {String(index + 1).padStart(2, "0")}
          </span>

          <span
            className="
              truncate
              text-xs
              font-semibold
              text-slate-700
            "
          >
            {label}
          </span>
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="
              text-xs
              font-bold
              text-slate-900
            "
          >
            {value}
          </span>

          <span
            className="
              text-[10px]
              font-medium
              text-slate-400
            "
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* BAR                                                             */}
      {/* -------------------------------------------------------------- */}

      <div
        className="
          mt-2
          h-1.5
          overflow-hidden
          rounded-full
          bg-slate-200
        "
      >
        <div
          className={`
            h-full
            origin-left
            rounded-full
            ${barClass}
            transition-[width]
            duration-[1300ms]
            ease-[cubic-bezier(0.22,1,0.36,1)]
          `}
          style={{
            width: isActive
              ? `${Math.max(
                  percentage,
                  2
                )}%`
              : "0%",
            transitionDelay: `${
              index * 80
            }ms`,
          }}
        />
      </div>
    </div>
  );
}
export function InvoiceProcessingTube({
  isLoading = false,
  isActive = false,
  isManual = false,
  onToggle,
}) {
  /* ------------------------------------------------------------------ */
  /* Loading state                                                       */
  /* ------------------------------------------------------------------ */

  if (isLoading) {
    return (
      <div
        className="
          overflow-hidden
          rounded-xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >
        {/* Header skeleton */}
        <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
          <Skeleton className="h-9 w-9 rounded-lg" />

          <div className="flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-64" />
          </div>

          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Content skeleton */}
        <div className="border-t border-slate-100 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {Array.from({ length: 8 }).map(
              (_, index) => (
                <Skeleton
                  key={index}
                  className="h-[58px] w-full rounded-lg"
                />
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Total invoices in processing pipeline                              */
  /* ------------------------------------------------------------------ */

  const total =
    invoiceProcessingStages.reduce(
      (sum, stage) =>
        sum + stage.count,
      0
    );

  /* ------------------------------------------------------------------ */
  /* Main component                                                      */
  /* ------------------------------------------------------------------ */

  return (
    <InsightTube
      title="Processing Health"
      subtitle="Invoice lifecycle"
      icon={FileCheck2}
      accent="indigo"
      isActive={isActive}
      isManual={isManual}
      onToggle={onToggle}
      summary={
        <>
          <span className="font-bold text-indigo-700">
            {total}
          </span>{" "}
          invoices across the processing pipeline
        </>
      }
    >
      {/* ================================================================ */}
      {/* PROCESSING STAGES                                               */}
      {/* ================================================================ */}

      <div
        className="
          grid
          grid-cols-1
          gap-2.5
          sm:grid-cols-2
        "
      >
        {invoiceProcessingStages.map(
          (stage, index) => {
            const percentage =
              (stage.count / total) *
              100;

            return (
              <InsightMetric
                key={stage.label}
                label={stage.label}
                value={stage.count}
                percentage={percentage}
                tone={stage.tone}
                index={index}
                isActive={isActive}
              />
            );
          }
        )}
      </div>
    </InsightTube>
  );
}
/* -------------------------------------------------------------------------- */
/* Financial Health Tube                                                      */
/* -------------------------------------------------------------------------- */

export function FinancialHealthTube({
  isLoading = false,
  isActive = false,
  isManual = false,
  onToggle,
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-10 w-full" />
      </div>
    );
  }

  const agingMax = Math.max(
    ...apAging.buckets.map(
      (item) => item.amount
    )
  );

  const paymentMax = Math.max(
    ...paymentOverview.map(
      (item) => item.amount
    )
  );

  return (
    <InsightTube
      title="Cash & Payment Health"
      subtitle="Payables and payment position"
      icon={CreditCard}
      accent="emerald"
      isActive={isActive}
      isManual={isManual}
      onToggle={onToggle}
      summary={
        <>
          <span className="font-bold">
            ₹73.4 L
          </span>{" "}
          outstanding
          <span className="mx-2 text-slate-300">
            •
          </span>
          <span className="font-bold text-rose-700">
            ₹23.2 L
          </span>{" "}
          overdue
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">

        {/* AP Aging */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                AP Aging
              </h3>

              <p className="text-[11px] text-slate-500">
                Outstanding by age
              </p>
            </div>

            <span className="text-xs font-medium text-slate-400">
              ₹73.4 L
            </span>
          </div>

          <div className="space-y-4">
            {apAging.buckets.map(
              (bucket, index) => {
                const percentage =
                  (bucket.amount /
                    agingMax) *
                  100;

                return (
                  <div key={bucket.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        {bucket.label}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {bucket.value}
                        </span>

                        <span className="text-[10px] text-slate-400">
                          {percentage.toFixed(
                            0
                          )}
                          %
                        </span>
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`
                          h-full
                          rounded-full
                          transition-[width]
                          duration-1000
                          ease-out
                          ${
                            toneBar[
                              bucket.tone
                            ] ||
                            toneBar.default
                          }
                        `}
                        style={{
                          width: isActive
                            ? `${Math.max(
                                percentage,
                                4
                              )}%`
                            : "0%",
                          transitionDelay: `${
                            index * 100
                          }ms`,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Payment Overview */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Payment Overview
            </h3>

            <p className="text-[11px] text-slate-500">
              Current payment position
            </p>
          </div>

          <div className="space-y-3">
            {paymentOverview.map(
              (payment, index) => {
                const percentage =
                  (payment.amount /
                    paymentMax) *
                  100;

                return (
                  <div
                    key={payment.label}
                    className="
                      rounded-lg
                      border border-slate-100
                      bg-slate-50/70
                      p-3
                    "
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        {payment.label}
                      </span>

                      <span className="text-xs font-bold text-slate-900">
                        {payment.value}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`
                          h-full rounded-full
                          ${
                            toneBar[
                              payment.tone
                            ] ||
                            toneBar.default
                          }
                          transition-[width]
                          duration-1000
                          ease-out
                        `}
                        style={{
                          width: isActive
                            ? `${Math.max(
                                percentage,
                                3
                              )}%`
                            : "0%",
                          transitionDelay: `${
                            index * 80
                          }ms`,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </InsightTube>
  );
}
/* -------------------------------------------------------------------------- */
/* Exception Tube                                                             */
/* -------------------------------------------------------------------------- */

export function ExceptionTube({
  isLoading = false,
  isActive = false,
  isManual = false,
  onToggle,
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-10 w-full" />
      </div>
    );
  }

  const total =
    exceptionAnalysis.reduce(
      (sum, item) =>
        sum + item.count,
      0
    );

  const highest =
    exceptionAnalysis[0];

  return (
    <InsightTube
      title="Risk & Exceptions"
      subtitle="Validation and invoice risks"
      icon={AlertCircle}
      accent="rose"
      isActive={isActive}
      isManual={isManual}
      onToggle={onToggle}
      action={
        <Link
          to={AP_ROUTES.INVOICE_VALIDATION}
          onClick={(event) =>
            event.stopPropagation()
          }
          className="
            hidden
            text-xs font-semibold
            text-[#0A0082]
            hover:underline
            sm:block
          "
        >
          View →
        </Link>
      }
      summary={
        <>
          <span className="font-bold text-rose-700">
            {total}
          </span>{" "}
          active exceptions
          <span className="mx-2 text-slate-300">
            •
          </span>
          Highest:{" "}
          <span className="font-semibold">
            {highest.label}
          </span>
        </>
      }
    >
      <div className="space-y-3">
        {exceptionAnalysis.map(
          (item, index) => {
            const percentage =
              (item.count / total) *
              100;

            return (
              <div
                key={item.label}
                className="group/exception"
              >
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`
                        flex h-6 w-6
                        shrink-0
                        items-center
                        justify-center
                        rounded-md
                        text-[10px]
                        font-bold
                        ${
                          index === 0
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }
                      `}
                    >
                      {item.count}
                    </span>

                    <span className="truncate text-xs font-medium text-slate-700">
                      {item.label}
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-400">
                    {percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="ml-8 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`
                      h-full
                      rounded-full
                      transition-[width]
                      duration-1000
                      ease-out
                      ${
                        index === 0
                          ? "bg-rose-500"
                          : "bg-slate-500"
                      }
                    `}
                    style={{
                      width: isActive
                        ? `${Math.max(
                            percentage,
                            3
                          )}%`
                        : "0%",
                      transitionDelay: `${
                        index * 90
                      }ms`,
                    }}
                  />
                </div>
              </div>
            );
          }
        )}
      </div>
    </InsightTube>
  );
}
/* -------------------------------------------------------------------------- */
/* Vendor Exposure Tube                                                       */
/* -------------------------------------------------------------------------- */

export function VendorExposureTube({
  isLoading = false,
  isActive = false,
  isManual = false,
  onToggle,
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-10 w-full" />
      </div>
    );
  }

  return (
    <InsightTube
      title="Vendor Exposure"
      subtitle="Largest outstanding balances"
      icon={WalletCards}
      accent="amber"
      isActive={isActive}
      isManual={isManual}
      onToggle={onToggle}
      action={
        <Link
          to={AP_ROUTES.VENDOR_LIST}
          onClick={(event) =>
            event.stopPropagation()
          }
          className="
            hidden
            text-xs font-semibold
            text-[#0A0082]
            hover:underline
            sm:block
          "
        >
          Vendors →
        </Link>
      }
      summary={
        <>
          Top vendors represent approximately{" "}
          <span className="font-bold">
            ₹40.4 L
          </span>{" "}
          in outstanding payable
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        {topVendors.map(
          (vendor, index) => (
            <Link
              key={vendor.vendor}
              to={AP_ROUTES.VENDOR_LIST}
              className="
                group/vendor
                rounded-lg
                border border-slate-100
                bg-slate-50/70
                p-4
                transition-all
                duration-300
                hover:-translate-y-1
                hover:bg-white
                hover:shadow-md
              "
            >
              <div className="flex items-center justify-between">
                <span
                  className="
                    flex h-7 w-7
                    items-center
                    justify-center
                    rounded-full
                    bg-slate-100
                    text-xs font-bold
                    text-slate-600
                  "
                >
                  {index + 1}
                </span>

                <ArrowRight
                  className="
                    h-4 w-4
                    text-slate-300
                    transition-all
                    duration-300
                    group-hover/vendor:translate-x-1
                    group-hover/vendor:text-[#0A0082]
                  "
                />
              </div>

              <p className="mt-3 truncate text-sm font-semibold text-slate-800">
                {vendor.vendor}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400">
                    Outstanding
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {vendor.outstanding}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-slate-400">
                    Overdue
                  </p>

                  <p
                    className={
                      vendor.overdue ===
                      "₹0"
                        ? "mt-0.5 text-sm font-semibold text-slate-500"
                        : "mt-0.5 text-sm font-bold text-rose-700"
                    }
                  >
                    {vendor.overdue}
                  </p>
                </div>
              </div>
            </Link>
          )
        )}
      </div>
    </InsightTube>
  );
}
/* -------------------------------------------------------------------------- */
/* Invoice Intake Quality                                                     */
/* -------------------------------------------------------------------------- */

export function InvoiceIntakeQuality({
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-5 h-4 w-full" />
        <Skeleton className="mt-3 h-8 w-full" />
      </div>
    );
  }

  const total =
    invoiceIntakeQuality.processed;

  const high =
    invoiceIntakeQuality.highConfidence;

  const highPercentage =
    ((high / total) * 100).toFixed(1);

  return (
    <section
      className="
        rounded-xl border border-slate-200
        bg-white p-4 shadow-sm
        sm:p-5
      "
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Invoice Intake Quality
            </h2>

            <p className="text-xs text-slate-500">
              {total.toLocaleString("en-IN")} invoices processed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-slate-900">
            {highPercentage}%
          </span>

          <span className="text-xs font-medium text-emerald-600">
            High confidence
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="bg-emerald-500 transition-all duration-700"
            style={{
              width: `${(
                (invoiceIntakeQuality.highConfidence /
                  total) *
                100
              ).toFixed(2)}%`,
            }}
          />

          <div
            className="bg-amber-500"
            style={{
              width: `${(
                (invoiceIntakeQuality.mediumConfidence /
                  total) *
                100
              ).toFixed(2)}%`,
            }}
          />

          <div
            className="bg-rose-500"
            style={{
              width: `${(
                (invoiceIntakeQuality.lowConfidence /
                  total) *
                100
              ).toFixed(2)}%`,
            }}
          />

          <div
            className="bg-slate-500"
            style={{
              width: `${(
                (invoiceIntakeQuality.failed /
                  total) *
                100
              ).toFixed(2)}%`,
            }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {[
            [
              "High",
              invoiceIntakeQuality.highConfidence,
              "bg-emerald-500",
            ],
            [
              "Medium",
              invoiceIntakeQuality.mediumConfidence,
              "bg-amber-500",
            ],
            [
              "Low",
              invoiceIntakeQuality.lowConfidence,
              "bg-rose-500",
            ],
            [
              "Failed",
              invoiceIntakeQuality.failed,
              "bg-slate-500",
            ],
          ].map(
            ([label, count, color]) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-xs text-slate-600"
              >
                <span
                  className={`h-2 w-2 rounded-full ${color}`}
                />

                <span>{label}</span>

                <span className="font-semibold text-slate-900">
                  {count}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}