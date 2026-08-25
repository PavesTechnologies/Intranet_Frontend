import {
  AlertCircle,
  ChevronDown,
  CreditCard,
  FileCheck2,
  FileText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  dashboardKpis,
  attentionQueue,
  invoiceProcessingStages,
  apAging,
  paymentOverview,
  invoiceIntakeHealth,
} from "../mocks/apDashboardMockData.js";

/* ==========================================================================
   LOCAL SKELETON
   ========================================================================== */

function Skeleton({ className = "" }) {
  return (
    <div
      className={`
        animate-pulse
        rounded-md
        bg-slate-200
        ${className}
      `}
    />
  );
}

/* ==========================================================================
   SHARED TONE CONFIGURATION
   ========================================================================== */

const toneBar = {
  default: "bg-slate-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
};

const toneText = {
  default: "text-slate-900",
  amber: "text-amber-700",
  rose: "text-rose-700",
  indigo: "text-indigo-700",
  emerald: "text-emerald-700",
};

/* ==========================================================================
   KPI ICONS
   ========================================================================== */

const kpiIcons = {
  "Total Invoices": FileText,
  "Pending Invoices": RefreshCw,
  Exceptions: AlertCircle,
  "Pending Approvals": FileCheck2,
  "Outstanding Payable": CreditCard,
  "Overdue Payable": AlertCircle,
};

/* ==========================================================================
   DASHBOARD HEADER
   ========================================================================== */

export function DashboardHeader({
  onRefresh,
  isLoading = false,
}) {
  return (
    <section
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        shadow-sm
      "
    >
      <div
        className="
          flex
          flex-col
          gap-3
          px-4
          py-3.5
          sm:flex-row
          sm:items-center
          sm:justify-between
          sm:px-5
        "
      >
        {/* -------------------------------------------------------------- */}
        {/* LEFT                                                           */}
        {/* -------------------------------------------------------------- */}

        <div className="flex min-w-0 items-center gap-3">
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-[#0A0082]/10
            "
          >
            <CreditCard
              className="
                h-4
                w-4
                text-[#0A0082]
              "
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1
                className="
                  truncate
                  text-base
                  font-bold
                  tracking-tight
                  text-slate-900
                  sm:text-lg
                "
              >
                Accounts Payable
              </h1>

              <span
                className="
                  hidden
                  rounded-full
                  bg-emerald-50
                  px-2
                  py-0.5
                  text-[9px]
                  font-semibold
                  text-emerald-700
                  sm:inline-flex
                "
              >
                Operational
              </span>
            </div>

            <p
              className="
                mt-0.5
                truncate
                text-[10px]
                text-slate-500
                sm:text-xs
              "
            >
              Overall AP health and financial overview
            </p>
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* RIGHT                                                          */}
        {/* -------------------------------------------------------------- */}

        <div className="flex items-center gap-2">
          <select
            defaultValue="This Month"
            className="
              h-8
              rounded-lg
              border
              border-slate-200
              bg-white
              px-2.5
              text-[11px]
              font-medium
              text-slate-600
              outline-none
              transition
              focus:border-[#0A0082]
              focus:ring-2
              focus:ring-[#0A0082]/10
            "
          >
            <option>Today</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Month</option>
            <option>This Quarter</option>
            <option>Custom Range</option>
          </select>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="
              flex
              h-8
              items-center
              gap-1.5
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-[11px]
              font-semibold
              text-slate-600
              transition-all
              duration-200
              hover:border-slate-300
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            <RefreshCw
              className={`
                h-3.5
                w-3.5
                ${isLoading ? "animate-spin" : ""}
              `}
            />

            Refresh
          </button>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   KPI GRID
   ========================================================================== */

export function APKpiGrid({
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div
        className="
          grid
          grid-cols-2
          gap-2
          lg:grid-cols-3
          xl:grid-cols-6
        "
      >
        {Array.from({ length: 6 }).map(
          (_, index) => (
            <div
              key={index}
              className="
                rounded-lg
                border
                border-slate-200
                bg-white
                px-3
                py-2.5
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
    <div
      className="
        grid
        grid-cols-2
        gap-2
        lg:grid-cols-3
        xl:grid-cols-6
      "
    >
      {dashboardKpis.map((kpi) => {
        const Icon =
          kpiIcons[kpi.title] || FileText;

        return (
          <div
            key={kpi.title}
            className="
              group
              relative
              overflow-hidden
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              py-2.5
              shadow-sm
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:border-slate-300
              hover:shadow-md
            "
          >
            {/* Small top accent */}
            <div
              className={`
                absolute
                left-0
                right-0
                top-0
                h-0.5
                ${
                  kpi.tone === "rose"
                    ? "bg-rose-400"
                    : kpi.tone === "amber"
                    ? "bg-amber-400"
                    : kpi.tone === "indigo"
                    ? "bg-indigo-400"
                    : kpi.tone === "emerald"
                    ? "bg-emerald-400"
                    : "bg-slate-300"
                }
              `}
            />

            <div
              className="
                flex
                items-center
                justify-between
                gap-2
              "
            >
              <div className="min-w-0">
                <p
                  className="
                    truncate
                    text-[10px]
                    font-medium
                    text-slate-500
                  "
                >
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
                      toneText[kpi.tone] ||
                      toneText.default
                    }
                  `}
                >
                  {kpi.value}
                </p>

                <p
                  className="
                    mt-0.5
                    truncate
                    text-[9px]
                    text-slate-400
                    sm:text-[10px]
                  "
                >
                  {kpi.subtitle}
                </p>
              </div>

              <div
                className="
                  flex
                  h-7
                  w-7
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-slate-50
                  transition-all
                  duration-300
                  group-hover:scale-105
                  group-hover:bg-slate-100
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
          </div>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   REQUIRES ATTENTION
   ========================================================================== */

export function AttentionQueue({
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <section
        className="
          rounded-xl
          border
          border-slate-200
          bg-white
          p-4
          shadow-sm
        "
      >
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />

          <div>
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="mt-1.5 h-2.5 w-52" />
          </div>
        </div>

        <div
          className="
            mt-3
            grid
            gap-2
            md:grid-cols-2
            xl:grid-cols-4
          "
        >
          {Array.from({ length: 4 }).map(
            (_, index) => (
              <Skeleton
                key={index}
                className="h-16 w-full rounded-lg"
              />
            )
          )}
        </div>
      </section>
    );
  }

  const priorityStyles = {
    Critical:
      "bg-rose-100 text-rose-700",
    High:
      "bg-orange-100 text-orange-700",
    Medium:
      "bg-amber-100 text-amber-700",
    Low:
      "bg-slate-100 text-slate-600",
  };

  return (
    <section
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
        sm:p-5
      "
    >
      {/* Header */}
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div className="flex items-center gap-2.5">
          <div
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              bg-rose-50
            "
          >
            <AlertCircle
              className="
                h-4
                w-4
                text-rose-600
              "
            />
          </div>

          <div>
            <h2
              className="
                text-sm
                font-bold
                text-slate-900
              "
            >
              Requires Attention
            </h2>

            <p
              className="
                text-[10px]
                text-slate-500
              "
            >
              Items that may require action
            </p>
          </div>
        </div>

        <button
          type="button"
          className="
            text-[11px]
            font-semibold
            text-[#0A0082]
            transition-colors
            hover:text-[#07005c]
            hover:underline
          "
        >
          View All →
        </button>
      </div>

      {/* Queue */}
      <div
        className="
          mt-3
          grid
          gap-2
          md:grid-cols-2
          xl:grid-cols-4
        "
      >
        {attentionQueue.map((item) => (
          <div
            key={item.invoice}
            className="
              group
              relative
              overflow-hidden
              rounded-lg
              border
              border-slate-100
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
            {/* Priority indicator */}
            <div
              className={`
                absolute
                bottom-0
                left-0
                top-0
                w-0.5
                ${
                  item.priority === "Critical"
                    ? "bg-rose-500"
                    : item.priority === "High"
                    ? "bg-orange-400"
                    : item.priority === "Medium"
                    ? "bg-amber-400"
                    : "bg-slate-300"
                }
              `}
            />

            <div
              className="
                flex
                items-center
                justify-between
                gap-2
              "
            >
              <span
                className="
                  text-xs
                  font-bold
                  text-slate-800
                "
              >
                {item.invoice}
              </span>

              <span
                className={`
                  rounded-full
                  px-1.5
                  py-0.5
                  text-[9px]
                  font-bold
                  ${
                    priorityStyles[
                      item.priority
                    ]
                  }
                `}
              >
                {item.priority}
              </span>
            </div>

            <p
              className="
                mt-1
                truncate
                text-[10px]
                font-semibold
                text-slate-600
              "
            >
              {item.issue}
            </p>

            <div
              className="
                mt-2
                flex
                items-center
                justify-between
                gap-2
              "
            >
              <span
                className="
                  truncate
                  text-[9px]
                  text-slate-400
                "
              >
                {item.vendor}
              </span>

              <span
                className="
                  shrink-0
                  text-[10px]
                  font-bold
                  text-slate-800
                "
              >
                {item.amount}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ==========================================================================
   REUSABLE INSIGHT METRIC
   ========================================================================== */

function InsightMetric({
  label,
  value,
  percentage,
  tone = "default",
  index,
  isActive = false,
}) {
  const barClass =
    toneBar[tone] ||
    toneBar.default;

  return (
    <div
      className="
        group/metric
        rounded-lg
        border
        border-slate-100
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
      <div
        className="
          flex
          items-center
          justify-between
          gap-2
        "
      >
        <div
          className="
            flex
            min-w-0
            items-center
            gap-2
          "
        >
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
            {String(index + 1).padStart(
              2,
              "0"
            )}
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

        <div
          className="
            flex
            shrink-0
            items-center
            gap-1.5
          "
        >
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
            duration-[1100ms]
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

/* ==========================================================================
   INSIGHT TUBE
   ========================================================================== */

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
}) {
  const accentStyles = {
    slate: {
      border:
        "border-slate-200",
      activeBorder:
        "border-slate-300",
      icon:
        "bg-slate-100 text-slate-600",
      activeIcon:
        "bg-slate-200 text-slate-700",
      glow:
        "from-slate-50",
    },

    indigo: {
      border:
        "border-indigo-100",
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
        aria-expanded={isActive}
        className={`
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
          transition-colors
          duration-300
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-[#0A0082]/30
        `}
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
          <Icon className="h-4 w-4" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div
            className="
              flex
              flex-wrap
              items-center
              gap-x-2
            "
          >
            <h2
              className="
                text-sm
                font-bold
                text-slate-900
              "
            >
              {title}
            </h2>

            <span
              className="
                hidden
                text-slate-300
                sm:inline
              "
            >
              •
            </span>

            <span
              className="
                truncate
                text-xs
                text-slate-500
              "
            >
              {subtitle}
            </span>
          </div>

          <div
            className="
              mt-1
              truncate
              text-xs
              font-medium
              text-slate-700
              sm:text-sm
            "
          >
            {summary}
          </div>
        </div>

        {/* Manual indicator */}
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

        {/* Arrow */}
        <span
          className={`
            flex
            h-8
            w-8
            shrink-0
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
      </button>

      {/* ================================================================ */}
      {/* EXPANDED CONTENT                                                 */}
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
        <div className="min-h-0 overflow-hidden">
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

/* ==========================================================================
   PROCESSING HEALTH
   ========================================================================== */

export function InvoiceProcessingTube({
  isLoading = false,
  isActive = false,
  isManual = false,
  onToggle,
}) {
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
        <div
          className="
            flex
            items-center
            gap-3
            px-4
            py-4
            sm:px-5
          "
        >
          <Skeleton
            className="
              h-9
              w-9
              rounded-lg
            "
          />

          <div className="flex-1">
            <Skeleton className="h-4 w-40" />

            <Skeleton
              className="
                mt-2
                h-3
                w-64
              "
            />
          </div>

          <Skeleton
            className="
              h-8
              w-8
              rounded-full
            "
          />
        </div>

        <div
          className="
            border-t
            border-slate-100
            p-4
          "
        >
          <div
            className="
              grid
              grid-cols-1
              gap-2.5
              sm:grid-cols-2
            "
          >
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <Skeleton
                key={index}
                className="
                  h-[58px]
                  w-full
                  rounded-lg
                "
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const total =
    invoiceProcessingStages.reduce(
      (sum, stage) =>
        sum + stage.count,
      0
    );

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
          <span
            className="
              font-bold
              text-indigo-700
            "
          >
            {total}
          </span>{" "}
          invoices across the processing pipeline
        </>
      }
    >
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

/* ==========================================================================
   CASH & PAYMENT HEALTH
   ========================================================================== */

export function FinancialHealthTube({
  isLoading = false,
  isActive = false,
  isManual = false,
  onToggle,
}) {
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
        <div
          className="
            flex
            items-center
            gap-3
            px-5
            py-4
          "
        >
          <Skeleton
            className="
              h-10
              w-10
              rounded-xl
            "
          />

          <div className="flex-1">
            <Skeleton className="h-4 w-48" />

            <Skeleton
              className="
                mt-2
                h-3
                w-72
              "
            />
          </div>

          <Skeleton
            className="
              h-8
              w-8
              rounded-full
            "
          />
        </div>

        <div
          className="
            border-t
            border-slate-100
            p-5
          "
        >
          <div
            className="
              grid
              gap-5
              lg:grid-cols-2
            "
          >
            <Skeleton
              className="
                h-64
                w-full
                rounded-xl
              "
            />

            <Skeleton
              className="
                h-64
                w-full
                rounded-xl
              "
            />
          </div>
        </div>
      </div>
    );
  }

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
        <div
          className="
            flex
            flex-wrap
            items-center
            gap-x-2
          "
        >
          <span
            className="
              font-bold
              text-slate-900
            "
          >
            ₹2.84 Cr
          </span>

          <span className="text-slate-400">
            outstanding
          </span>

          <span className="text-slate-300">
            •
          </span>

          <span
            className="
              font-bold
              text-rose-600
            "
          >
            ₹18.4 L
          </span>

          <span className="text-slate-400">
            overdue
          </span>
        </div>
      }
    >
      <FinancialHealthContent
        isActive={isActive}
      />
    </InsightTube>
  );
}

/* ==========================================================================
   FINANCIAL HEALTH CONTENT
   ========================================================================== */

function FinancialHealthContent({
  isActive = false,
}) {
  const agingTotal =
    apAging.buckets.reduce(
      (sum, item) =>
        sum + item.amount,
      0
    );

  const paymentTotal =
    paymentOverview.reduce(
      (sum, item) =>
        sum + item.amount,
      0
    );

  return (
    <div className="space-y-5">

      {/* ================================================================ */}
      {/* SUMMARY                                                          */}
      {/* ================================================================ */}

      <div
        className="
          grid
          grid-cols-1
          gap-2
          sm:grid-cols-3
        "
      >
        <FinancialSummary
          label="Outstanding"
          value="₹73.4 L"
          caption="Current AP exposure"
          icon={CreditCard}
          tone="neutral"
        />

        <FinancialSummary
          label="Overdue"
          value="₹23.2 L"
          caption="Needs attention"
          icon={TrendingDown}
          tone="danger"
        />

        <FinancialSummary
          label="Paid"
          value="₹52.8 L"
          caption="Payment completed"
          icon={TrendingUp}
          tone="success"
        />
      </div>

      {/* ================================================================ */}
      {/* DIVIDER                                                          */}
      {/* ================================================================ */}

      <div
        className="
          flex
          items-center
          gap-3
        "
      >
        <div
          className="
            h-px
            flex-1
            bg-slate-100
          "
        />

        <span
          className="
            rounded-full
            bg-slate-50
            px-2.5
            py-1
            text-[9px]
            font-semibold
            uppercase
            tracking-wider
            text-slate-400
          "
        >
          Financial Flow
        </span>

        <div
          className="
            h-px
            flex-1
            bg-slate-100
          "
        />
      </div>

      {/* ================================================================ */}
      {/* AGING + PAYMENT                                                  */}
      {/* ================================================================ */}

      <div
        className="
          grid
          gap-4
          lg:grid-cols-[1.05fr_0.95fr]
        "
      >
        <AgingPanel
          total={agingTotal}
          isActive={isActive}
        />

        <PaymentPositionPanel
          total={paymentTotal}
          isActive={isActive}
        />
      </div>
    </div>
  );
}

/* ==========================================================================
   FINANCIAL SUMMARY CARD
   ========================================================================== */

function FinancialSummary({
  label,
  value,
  caption,
  icon: Icon,
  tone = "neutral",
}) {
  const styles = {
    neutral: {
      wrapper:
        "border-slate-200 bg-slate-50/70",
      icon:
        "bg-white text-slate-500",
      value:
        "text-slate-900",
    },

    danger: {
      wrapper:
        "border-rose-100 bg-rose-50/50",
      icon:
        "bg-white text-rose-500",
      value:
        "text-rose-700",
    },

    success: {
      wrapper:
        "border-emerald-100 bg-emerald-50/50",
      icon:
        "bg-white text-emerald-600",
      value:
        "text-emerald-700",
    },
  };

  const style =
    styles[tone] ||
    styles.neutral;

  return (
    <div
      className={`
        group
        relative
        overflow-hidden
        rounded-xl
        border
        px-4
        py-3
        ${style.wrapper}
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:shadow-sm
      `}
    >
      <div
        className="
          flex
          items-center
          justify-between
        "
      >
        <div>
          <p
            className="
              text-[9px]
              font-semibold
              uppercase
              tracking-wider
              text-slate-400
            "
          >
            {label}
          </p>

          <p
            className={`
              mt-1
              text-xl
              font-bold
              tracking-tight
              ${style.value}
            `}
          >
            {value}
          </p>

          <p
            className="
              mt-0.5
              text-[10px]
              text-slate-500
            "
          >
            {caption}
          </p>
        </div>

        <div
          className={`
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-lg
            ${style.icon}
            shadow-sm
            transition-transform
            duration-300
            group-hover:scale-110
          `}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   AP AGING PANEL
   ========================================================================== */

function AgingPanel({
  total,
  isActive,
}) {
  const maxAmount =
    Math.max(
      ...apAging.buckets.map(
        (item) => item.amount
      )
    );

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        sm:p-5
      "
    >
      {/* Header */}
      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >
        <div>
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <div
              className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-lg
                bg-amber-50
              "
            >
              <TrendingDown
                className="
                  h-3.5
                  w-3.5
                  text-amber-600
                "
              />
            </div>

            <h3
              className="
                text-xs
                font-bold
                text-slate-900
              "
            >
              AP Aging
            </h3>
          </div>

          <p
            className="
              mt-1.5
              text-[10px]
              text-slate-500
            "
          >
            Where outstanding invoices are aging
          </p>
        </div>

        <div className="text-right">
          <p
            className="
              text-[9px]
              font-medium
              uppercase
              tracking-wider
              text-slate-400
            "
          >
            Total
          </p>

          <p
            className="
              mt-0.5
              text-sm
              font-bold
              text-slate-900
            "
          >
            ₹{total.toFixed(1)} L
          </p>
        </div>
      </div>

      {/* Aging visualization */}
      <div className="mt-5 space-y-3">
        {apAging.buckets.map(
          (bucket, index) => {
            const relativeWidth =
              (bucket.amount /
                maxAmount) *
              100;

            const isCritical =
              bucket.label ===
              "90+ Days";

            const isWarning =
              bucket.label ===
              "61-90 Days";

            return (
              <div
                key={bucket.label}
                className="
                  group/aging
                "
              >
                <div
                  className="
                    mb-1.5
                    flex
                    items-center
                    justify-between
                    gap-2
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <span
                      className={`
                        h-1.5
                        w-1.5
                        rounded-full
                        ${
                          isCritical
                            ? "bg-rose-500"
                            : isWarning
                            ? "bg-amber-500"
                            : "bg-slate-300"
                        }
                      `}
                    />

                    <span
                      className="
                        text-[10px]
                        font-semibold
                        text-slate-600
                      "
                    >
                      {bucket.label}
                    </span>
                  </div>

                  <span
                    className="
                      text-[10px]
                      font-bold
                      text-slate-800
                    "
                  >
                    {bucket.value}
                  </span>
                </div>

                <div
                  className="
                    relative
                    h-2
                    overflow-hidden
                    rounded-full
                    bg-slate-100
                  "
                >
                  <div
                    className={`
                      absolute
                      inset-y-0
                      left-0
                      rounded-full
                      transition-[width]
                      duration-[1100ms]
                      ease-[cubic-bezier(0.22,1,0.36,1)]
                      ${
                        isCritical
                          ? "bg-rose-400"
                          : isWarning
                          ? "bg-amber-400"
                          : "bg-slate-400"
                      }
                    `}
                    style={{
                      width: isActive
                        ? `${Math.max(
                            relativeWidth,
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

      {/* Bottom insight */}
      <div
        className="
          mt-5
          flex
          items-center
          justify-between
          rounded-lg
          bg-slate-50
          px-3
          py-2.5
        "
      >
        <span
          className="
            text-[10px]
            font-medium
            text-slate-500
          "
        >
          Overdue exposure
        </span>

        <span
          className="
            text-xs
            font-bold
            text-rose-600
          "
        >
          ₹23.2 L
        </span>
      </div>
    </div>
  );
}

/* ==========================================================================
   PAYMENT POSITION PANEL
   ========================================================================== */

function PaymentPositionPanel({
  total,
  isActive,
}) {
  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        sm:p-5
      "
    >
      {/* Header */}
      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >
        <div>
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <div
              className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-lg
                bg-emerald-50
              "
            >
              <CreditCard
                className="
                  h-3.5
                  w-3.5
                  text-emerald-600
                "
              />
            </div>

            <h3
              className="
                text-xs
                font-bold
                text-slate-900
              "
            >
              Payment Position
            </h3>
          </div>

          <p
            className="
              mt-1.5
              text-[10px]
              text-slate-500
            "
          >
            Current movement of payable funds
          </p>
        </div>

        <div className="text-right">
          <p
            className="
              text-[9px]
              font-medium
              uppercase
              tracking-wider
              text-slate-400
            "
          >
            Tracked
          </p>

          <p
            className="
              mt-0.5
              text-sm
              font-bold
              text-slate-900
            "
          >
            ₹{total.toFixed(1)} L
          </p>
        </div>
      </div>

      {/* Payment flow */}
      <div className="mt-6">
        {paymentOverview.map(
          (payment, index) => {
            const isLast =
              index ===
              paymentOverview.length - 1;

            return (
              <PaymentFlowItem
                key={payment.label}
                item={payment}
                index={index}
                isLast={isLast}
                isActive={isActive}
              />
            );
          }
        )}
      </div>

      {/* Bottom insight */}
      <div
        className="
          mt-4
          flex
          items-center
          justify-between
          rounded-lg
          border
          border-emerald-100
          bg-emerald-50/50
          px-3
          py-2.5
        "
      >
        <div>
          <p
            className="
              text-[9px]
              font-semibold
              uppercase
              tracking-wider
              text-emerald-600
            "
          >
            Payment completed
          </p>

          <p
            className="
              mt-0.5
              text-[10px]
              text-slate-500
            "
          >
            Strongest payment state
          </p>
        </div>

        <span
          className="
            text-sm
            font-bold
            text-emerald-700
          "
        >
          ₹52.8 L
        </span>
      </div>
    </div>
  );
}

/* ==========================================================================
   PAYMENT FLOW ITEM
   ========================================================================== */

function PaymentFlowItem({
  item,
  index,
  isLast,
  isActive,
}) {
  const toneStyles = {
    amber: {
      dot: "bg-amber-500",
      ring: "ring-amber-100",
      text: "text-amber-700",
      bar: "bg-amber-400",
    },

    indigo: {
      dot: "bg-indigo-500",
      ring: "ring-indigo-100",
      text: "text-indigo-700",
      bar: "bg-indigo-400",
    },

    emerald: {
      dot: "bg-emerald-500",
      ring: "ring-emerald-100",
      text: "text-emerald-700",
      bar: "bg-emerald-400",
    },

    rose: {
      dot: "bg-rose-500",
      ring: "ring-rose-100",
      text: "text-rose-700",
      bar: "bg-rose-400",
    },

    default: {
      dot: "bg-slate-400",
      ring: "ring-slate-100",
      text: "text-slate-700",
      bar: "bg-slate-400",
    },
  };

  const style =
    toneStyles[item.tone] ||
    toneStyles.default;

  const maxAmount = 52.8;

  const width =
    (item.amount /
      maxAmount) *
    100;

  const descriptions = {
    "Pending Payment":
      "Awaiting payment execution",

    Scheduled:
      "Payment has been scheduled",

    Processing:
      "Payment currently processing",

    Paid:
      "Successfully completed",

    "On Hold":
      "Payment temporarily held",
  };

  return (
    <div className="relative flex gap-3">
      {/* -------------------------------------------------------------- */}
      {/* TIMELINE                                                       */}
      {/* -------------------------------------------------------------- */}

      <div
        className="
          relative
          flex
          w-5
          shrink-0
          justify-center
        "
      >
        <div
          className={`
            relative
            z-10
            mt-0.5
            h-3
            w-3
            rounded-full
            ${style.dot}
            ring-4
            ${style.ring}
            transition-all
            duration-500
            ${
              isActive
                ? "scale-100"
                : "scale-75"
            }
          `}
        />

        {!isLast && (
          <div
            className="
              absolute
              left-1/2
              top-3
              h-[calc(100%+8px)]
              w-px
              -translate-x-1/2
              bg-slate-200
            "
          />
        )}
      </div>

      {/* -------------------------------------------------------------- */}
      {/* CONTENT                                                        */}
      {/* -------------------------------------------------------------- */}

      <div
        className="
          min-w-0
          flex-1
          pb-4
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <div className="min-w-0">
            <p
              className="
                text-[10px]
                font-semibold
                text-slate-700
              "
            >
              {item.label}
            </p>

            <p
              className="
                mt-0.5
                truncate
                text-[9px]
                text-slate-400
              "
            >
              {descriptions[item.label]}
            </p>
          </div>

          <span
            className={`
              shrink-0
              text-xs
              font-bold
              ${style.text}
            `}
          >
            {item.value}
          </span>
        </div>

        {/* Amount bar */}
        <div
          className="
            mt-1.5
            h-1
            overflow-hidden
            rounded-full
            bg-slate-100
          "
        >
          <div
            className={`
              h-full
              rounded-full
              ${style.bar}
              transition-[width]
              duration-[1100ms]
              ease-[cubic-bezier(0.22,1,0.36,1)]
            `}
            style={{
              width: isActive
                ? `${Math.max(
                    width,
                    3
                  )}%`
                : "0%",
              transitionDelay: `${
                index * 120
              }ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   INVOICE INTAKE HEALTH
   ========================================================================== */

export function InvoiceIntakeHealth({
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <section
        className="
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          py-3
          shadow-sm
          sm:px-5
        "
      >
        <div className="flex items-center gap-3">
          <Skeleton
            className="
              h-8
              w-8
              rounded-lg
            "
          />

          <div className="flex-1">
            <Skeleton className="h-3 w-32" />

            <Skeleton
              className="
                mt-1.5
                h-2.5
                w-48
              "
            />
          </div>

          <Skeleton
            className="
              h-6
              w-20
            "
          />
        </div>
      </section>
    );
  }

  const {
    processed,
    successRate,
    needsReview,
    failedRate,
  } = invoiceIntakeHealth;

  return (
    <section
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        px-4
        py-3
        shadow-sm
        transition-all
        duration-300
        hover:border-slate-300
        hover:shadow-md
        sm:px-5
      "
    >
      <div
        className="
          flex
          flex-col
          gap-3
          sm:flex-row
          sm:items-center
        "
      >
        {/* -------------------------------------------------------------- */}
        {/* TITLE                                                          */}
        {/* -------------------------------------------------------------- */}

        <div
          className="
            flex
            min-w-0
            flex-1
            items-center
            gap-3
          "
        >
          <div
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-emerald-50
            "
          >
            <FileCheck2
              className="
                h-4
                w-4
                text-emerald-600
              "
            />
          </div>

          <div className="min-w-0">
            <div
              className="
                flex
                flex-wrap
                items-center
                gap-x-2
              "
            >
              <h2
                className="
                  text-xs
                  font-bold
                  text-slate-900
                "
              >
                Invoice Intake Health
              </h2>

              <span
                className="
                  hidden
                  text-slate-300
                  sm:inline
                "
              >
                •
              </span>

              <span
                className="
                  text-[10px]
                  text-slate-500
                "
              >
                System processing health
              </span>
            </div>

            <p
              className="
                mt-0.5
                text-[10px]
                text-slate-400
              "
            >
              {processed.toLocaleString()} invoices processed
            </p>
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* HEALTH METRICS                                                 */}
        {/* -------------------------------------------------------------- */}

        <div
          className="
            flex
            items-center
            gap-4
          "
        >
          <div>
            <p
              className="
                text-[9px]
                font-medium
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              Success
            </p>

            <p
              className="
                mt-0.5
                text-base
                font-bold
                text-emerald-700
              "
            >
              {successRate}%
            </p>
          </div>

          <div
            className="
              hidden
              h-7
              w-px
              bg-slate-200
              sm:block
            "
          />

          <div>
            <p
              className="
                text-[9px]
                font-medium
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              Review
            </p>

            <p
              className="
                mt-0.5
                text-sm
                font-bold
                text-amber-600
              "
            >
              {needsReview}%
            </p>
          </div>

          <div
            className="
              hidden
              h-7
              w-px
              bg-slate-200
              sm:block
            "
          />

          <div>
            <p
              className="
                text-[9px]
                font-medium
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              Failed
            </p>

            <p
              className="
                mt-0.5
                text-sm
                font-bold
                text-rose-600
              "
            >
              {failedRate}%
            </p>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* SUCCESS BAR                                                     */}
      {/* -------------------------------------------------------------- */}

      <div
        className="
          mt-3
          h-1.5
          overflow-hidden
          rounded-full
          bg-slate-100
        "
      >
        <div
          className="
            h-full
            rounded-full
            bg-emerald-500
            transition-[width]
            duration-[1200ms]
            ease-out
          "
          style={{
            width: `${successRate}%`,
          }}
        />
      </div>
    </section>
  );
}