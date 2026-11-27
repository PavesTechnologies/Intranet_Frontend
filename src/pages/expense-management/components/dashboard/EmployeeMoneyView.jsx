import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Users, X, PiggyBank, Receipt, ReceiptText, ScanLine, ShieldAlert, ShieldCheck, ShieldX, Wallet } from "lucide-react";
import MultiSelectFilter from "@/pages/expense-management/components/common/MultiSelectFilter";
import { employeeMoneyReportApi } from "@/pages/expense-management/pages/reports/reportsApi";
import { useDepartmentNames } from "@/pages/expense-management/pages/reports/useExpenseSummaryReport";
import { CHROME, SERIES, formatMoney } from "./dashboardTheme";

/**
 * Finance's money view: cash advances and expense claims for a period, as four headline figures, one chart with both
 * flows over time, one chart per cost center, a table by department, cost center or employee, and tax & ITC. Pick
 * several departments and/or employees to see their combined figures and compare them in the table; pick one employee
 * to see their whole flow. All figures come from GET /xms/reports/employee-money (EmployeeMoneyReportService), in the
 * base currency; combined figures are sums of the rows the backend returns.
 */

const num = (v) => Number(v) || 0;
const money = (v, cur) => `${cur} ${num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const short = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const pct = (part, whole) => (num(whole) > 0 ? Math.round((num(part) / num(whole)) * 100) : 0);
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

// One color per flow, the same in both charts: advances blue, expenses orange.
const ADVANCE_COLOR = SERIES[0];
const EXPENSE_COLOR = SERIES[1];

// ---------------------------------------------------------------- period

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const PERIODS = [
  { key: "WEEK", label: "This week" },
  { key: "MONTH", label: "This month" },
  { key: "30", label: "Last 30 days" },
  { key: "60", label: "Last 60 days" },
  { key: "90", label: "Last 90 days" },
  { key: "ALL", label: "All time" },
];

/** The from/to dates (yyyy-mm-dd) a period chip stands for, ending today. */
export function periodRange(key, today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (key === "ALL") return { from: "", to: "" };
  let start;
  if (key === "WEEK") start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - ((end.getDay() + 6) % 7));
  else if (key === "MONTH") start = new Date(end.getFullYear(), end.getMonth(), 1);
  else start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (Number(key) - 1));
  return { from: iso(start), to: iso(end) };
}

// ---------------------------------------------------------------- figures

function Kpi({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3" data-money-kpi={label}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="truncate text-base font-bold tabular-nums text-[#0a174e]">{value}</p>
        {hint && <p className="truncate text-[11px] text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

/** The four figures that matter for the chosen scope: everyone, the picked departments, or the picked employees. */
function ScopeKpis({ group, budget, budgetLabel, cur }) {
  const a = group.advances;
  const e = group.expenses;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-money-kpis>
      <Kpi icon={Wallet} tone="bg-blue-50 text-blue-600" label="Advances paid out" value={money(a.paidOut, cur)}
        hint={num(a.outstanding) > 0 ? `${short(a.outstanding)} still with employees` : `${plural(a.count, "advance")} · nothing outstanding`} />
      <Kpi icon={ReceiptText} tone="bg-orange-50 text-orange-600" label="Expenses claimed" value={money(e.claimed, cur)}
        hint={num(e.inApproval) > 0 ? `${short(e.inApproval)} in approval · ${plural(e.reportCount, "report")}` : plural(e.reportCount, "report")} />
      <Kpi icon={BadgeCheck} tone="bg-emerald-50 text-emerald-600" label="Paid to employees" value={money(e.paid, cur)}
        hint={num(e.due) > 0 ? `${short(e.due)} approved, still due` : "Nothing due"} />
      <Kpi icon={PiggyBank} tone="bg-teal-50 text-teal-600" label={budgetLabel} value={budget ? money(budget.effectiveAvailable, cur) : "No budget set"}
        hint={budget ? `${pct(budget.used, budget.budget)}% used of ${short(budget.budget)}` : "Set one under Cost Center & Budget"} />
    </div>
  );
}

// ---------------------------------------------------------------- charts

const axisProps = { tick: { fill: CHROME.muted, fontSize: 11 }, tickLine: false, axisLine: { stroke: CHROME.axis } };

function ChartTooltip({ title, rows }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-800">{title}</p>
      {rows.map(([k, v, color]) => (
        <p key={k} className="flex items-center gap-2 text-slate-600">
          {color ? <span className="h-2 w-2 rounded-full" style={{ background: color }} /> : <span className="w-2" />}
          <span>{k}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums text-slate-900">{v}</span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, children, ...rest }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" {...rest}>
      <p className="text-sm font-semibold text-[#0a174e]">{title}</p>
      <p className="mb-3 text-[11px] text-slate-500">{subtitle}</p>
      {children}
    </div>
  );
}

const STEP_WORD = { DAY: "day", WEEK: "week", MONTH: "month" };

/** Advances paid out and expenses claimed per day, week or month: one chart, two lines. */
function FlowChart({ points, cur }) {
  const data = (points || []).map((p) => ({ ...p, advances: num(p.advancesPaidOut), expenses: num(p.expensesClaimed) }));
  const step = STEP_WORD[data[0]?.granularity] || "period";
  const empty = !data.some((p) => p.advances > 0 || p.expenses > 0);
  return (
    <ChartCard title="Cash advances vs expenses" subtitle={`Advances paid out and expenses claimed per ${step}`} data-money-flow-chart>
      {empty ? (
        <p className="flex h-[260px] items-center justify-center text-xs text-slate-400">No advances paid out or expenses claimed in this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHROME.grid} />
            <XAxis dataKey="label" {...axisProps} minTickGap={16} />
            <YAxis {...axisProps} axisLine={false} width={64} tickFormatter={(v) => formatMoney(v, cur, { compact: true })} />
            <Tooltip
              cursor={{ stroke: CHROME.axis, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <ChartTooltip
                    title={p.granularity === "WEEK" ? `Week of ${p.label}` : p.label}
                    rows={[
                      ["Advances paid out", money(p.advances, cur), ADVANCE_COLOR],
                      ["Expenses claimed", money(p.expenses, cur), EXPENSE_COLOR],
                    ]}
                  />
                );
              }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
            <Line type="monotone" dataKey="advances" name="Advances paid out" stroke={ADVANCE_COLOR} strokeWidth={2}
              dot={data.length <= 31 ? { r: 3, fill: ADVANCE_COLOR, stroke: CHROME.surface, strokeWidth: 2 } : false} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="expenses" name="Expenses claimed" stroke={EXPENSE_COLOR} strokeWidth={2}
              dot={data.length <= 31 ? { r: 3, fill: EXPENSE_COLOR, stroke: CHROME.surface, strokeWidth: 2 } : false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

const MAX_COST_CENTERS = 8;

/** Advances paid out and expenses claimed per cost center (the busiest ones), with the budget left in the tooltip. */
function CostCenterChart({ groups, cur }) {
  const active = groups.filter((g) => num(g.advances.paidOut) > 0 || num(g.expenses.claimed) > 0);
  const data = active.slice(0, MAX_COST_CENTERS).map((g) => ({
    name: g.name || "No cost center",
    advances: num(g.advances.paidOut),
    expenses: num(g.expenses.claimed),
    budget: g.budget,
  }));
  const more = active.length - data.length;
  return (
    <ChartCard
      title="Cost center flows"
      subtitle={more > 0 ? `The ${data.length} busiest cost centers · ${more} more in the table below` : "Advances paid out and expenses claimed per cost center"}
      data-money-cost-center-chart
    >
      {!data.length ? (
        <p className="flex h-[260px] items-center justify-center text-xs text-slate-400">No cost center activity in this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44 + 50)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid horizontal={false} stroke={CHROME.grid} />
            <XAxis type="number" {...axisProps} tickFormatter={(v) => formatMoney(v, cur, { compact: true })} />
            <YAxis type="category" dataKey="name" {...axisProps} axisLine={false} width={120}
              tickFormatter={(v) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)} />
            <Tooltip
              cursor={{ fill: "rgba(42,120,214,0.06)" }}
              content={({ active: on, payload }) => {
                if (!on || !payload?.length) return null;
                const p = payload[0].payload;
                const rows = [
                  ["Advances paid out", money(p.advances, cur), ADVANCE_COLOR],
                  ["Expenses claimed", money(p.expenses, cur), EXPENSE_COLOR],
                ];
                if (p.budget) rows.push(["Budget left", `${money(p.budget.effectiveAvailable, cur)} (${pct(p.budget.used, p.budget.budget)}% used)`]);
                return <ChartTooltip title={p.name} rows={rows} />;
              }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
            <Bar dataKey="advances" name="Advances paid out" fill={ADVANCE_COLOR} radius={[0, 4, 4, 0]} maxBarSize={14} />
            <Bar dataKey="expenses" name="Expenses claimed" fill={EXPENSE_COLOR} radius={[0, 4, 4, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ---------------------------------------------------------------- tax & ITC

// Recoverable (ITC) green, not recoverable amber: their own pair, apart from the advance/expense colors.
const ITC_COLOR = SERIES[2];
const LOST_COLOR = SERIES[3];
export const TAX_REVIEW_PATH = "/expense-management/finance?tab=PENDING&tax=review";
export const ITC_REGISTER_PATH = "/expense-management/finance/itc-register";

/**
 * GST on the claimed lines for the chosen period and scope: what was paid, what can come back as input tax credit
 * (ITC), what is a cost, the lines Finance must check, and tax per day / week / month.
 */
function TaxSection({ tax, claimed, timeline, review, cur }) {
  const navigate = useNavigate();
  const total = num(tax?.total);
  const itc = num(tax?.recoverable);
  const verified = num(tax?.verifiedRecoverable);
  const lost = num(tax?.nonRecoverable);
  const awaiting = num(review?.linesAwaitingReview);
  const scanned = num(review?.scannedLines);
  const mismatched = num(review?.mismatchedLines);
  const step = STEP_WORD[timeline?.[0]?.granularity] || "period";
  const bars = (timeline || []).map((p) => {
    const rec = num(p.recoverableTax);
    const all = num(p.tax);
    return { label: p.label, granularity: p.granularity, itc: rec, lost: Math.max(0, all - rec), total: all };
  });
  const showLabels = bars.length <= 14;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" data-money-tax>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[#0a174e]">
            <Receipt size={15} className="text-pink-600" aria-hidden="true" /> Tax &amp; ITC
          </p>
          <p className="text-[11px] text-slate-500">GST on the expenses claimed in this period, and how much comes back as input tax credit</p>
        </div>
        <button type="button" onClick={() => navigate(ITC_REGISTER_PATH)} data-open-itc-register
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#0A0082] hover:underline">
          Open ITC register <ArrowRight size={13} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi icon={Receipt} tone="bg-pink-50 text-pink-600" label="Tax paid" value={money(total, cur)}
          hint={total > 0 ? `${pct(total, claimed)}% of ${short(claimed)} claimed` : "No GST on claims in this period"} />
        <Kpi icon={ShieldCheck} tone="bg-emerald-50 text-emerald-600" label="ITC you can claim" value={money(itc, cur)}
          hint={itc > 0 ? `${pct(itc, total)}% of tax · ${short(verified)} verified, ${short(itc - verified)} awaiting Finance` : "No recoverable GST"} />
        <Kpi icon={ShieldX} tone="bg-amber-50 text-amber-700" label="Tax lost" value={money(lost, cur)}
          hint={lost > 0 ? "Not recoverable: a cost to the company" : "Nothing lost"} />
      </div>

      {(awaiting > 0 || scanned > 0) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {awaiting > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5" data-tax-review>
              <p className="flex items-center gap-2 text-sm text-amber-900">
                <ShieldAlert size={16} className="shrink-0" aria-hidden="true" />
                <span><b>{plural(awaiting, "line")}</b> need a tax check before Finance can verify</span>
              </p>
              <button type="button" onClick={() => navigate(TAX_REVIEW_PATH)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#0A0082] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A0082]/90">
                Review now <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          )}
          {scanned > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" data-tax-scan>
              <ScanLine size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
              <span>
                <b>{mismatched} of {plural(scanned, "scanned receipt")}</b> {mismatched === 1 ? "has" : "have"} a different tax than the employee entered
              </span>
            </div>
          )}
        </div>
      )}

      {bars.some((b) => b.total > 0) ? (
        <div data-tax-chart>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tax per {step}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bars} margin={{ top: 18, right: 4, left: 4, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={CHROME.grid} />
              <XAxis dataKey="label" {...axisProps} minTickGap={12} />
              <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v) => formatMoney(v, cur, { compact: true })} />
              <Tooltip
                cursor={{ fill: "rgba(42,120,214,0.06)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  return (
                    <ChartTooltip
                      title={p.granularity === "WEEK" ? `Week of ${p.label}` : p.label}
                      rows={[["ITC recoverable", money(p.itc, cur), ITC_COLOR], ["Not recoverable", money(p.lost, cur), LOST_COLOR], ["Total tax", money(p.total, cur)]]}
                    />
                  );
                }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
              <Bar dataKey="itc" name="ITC recoverable" stackId="tax" fill={ITC_COLOR} maxBarSize={36} />
              <Bar dataKey="lost" name="Not recoverable" stackId="tax" fill={LOST_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36}>
                {showLabels && (
                  <LabelList dataKey="total" position="top" fontSize={10} fill={CHROME.muted}
                    formatter={(v) => (num(v) > 0 ? formatMoney(v, cur, { compact: true }) : "")} />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">No GST on claims in this period.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- one employee

/** A flow as steps, left to right, in the order the money moves. Empty steps are faded, never hidden. */
function Flow({ title, steps, cur, check }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <ol className="mt-2 flex flex-wrap items-stretch gap-1.5">
        {steps.map((s, i) => (
          <li key={s.label} className={`flex items-center gap-1.5 ${num(s.value) === 0 ? "opacity-50" : ""}`}>
            {i > 0 && <ArrowRight size={13} className="shrink-0 text-slate-300" aria-hidden="true" />}
            <div className={`rounded-lg border px-2.5 py-1.5 ${s.tone}`} title={s.note}>
              <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide opacity-75">{s.label}</p>
              <p className="whitespace-nowrap text-sm font-bold tabular-nums">{money(s.value, cur)}</p>
            </div>
          </li>
        ))}
      </ol>
      {check && <p className="mt-2 text-[11px] text-slate-500">{check}</p>}
    </div>
  );
}

const STEP = {
  neutral: "border-slate-200 bg-white text-slate-900",
  wait: "border-amber-200 bg-amber-50 text-amber-800",
  done: "border-emerald-200 bg-emerald-50 text-emerald-800",
  advance: "border-violet-200 bg-violet-50 text-violet-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  stop: "border-rose-200 bg-rose-50 text-rose-800",
  owed: "border-orange-200 bg-orange-50 text-orange-800",
};

/** One employee's whole money picture: both flows, each with the check that it adds up. */
function EmployeeDetail({ group, departmentName, cur, onBack }) {
  const a = group.advances;
  const e = group.expenses;
  const held = num(a.paidOut) + num(a.carriedIn);
  return (
    <div className="space-y-3" data-employee-detail={group.key}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-[#0a174e]">{group.name || group.key}</p>
          <p className="text-xs text-slate-500">{group.key} · {departmentName}</p>
        </div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0A0082] hover:bg-[#0A0082]/5">
          <ArrowLeft size={13} aria-hidden="true" /> All employees
        </button>
      </div>
      <Flow
        title="Cash advances: where the money went"
        cur={cur}
        steps={[
          { label: "Requested", value: a.requested, tone: STEP.neutral },
          { label: "Approved", value: a.approved, tone: STEP.neutral },
          { label: "Paid out", value: a.paidOut, tone: STEP.info },
          { label: "Carried in", value: a.carriedIn, tone: STEP.advance, note: "Balance moved from an earlier advance" },
          { label: "Used on reports", value: a.used, tone: STEP.done },
          { label: "Salary deduction", value: a.salaryDeducted, tone: STEP.stop },
          { label: "Refunded", value: a.refunded, tone: STEP.done },
          { label: "Carried forward", value: a.carriedOut, tone: STEP.advance },
          { label: "Outstanding", value: a.outstanding, tone: STEP.owed },
        ]}
        check={`Held ${short(held)} = used ${short(a.used)} + salary ${short(a.salaryDeducted)} + refunded ${short(a.refunded)} + carried forward ${short(a.carriedOut)} + outstanding ${short(a.outstanding)}${num(a.pendingApproval) > 0 ? ` · ${short(a.pendingApproval)} still awaiting approval` : ""}`}
      />
      <Flow
        title="Expense claims: where the money is"
        cur={cur}
        steps={[
          { label: "Claimed", value: e.claimed, tone: STEP.neutral },
          { label: "In approval", value: e.inApproval, tone: STEP.wait },
          { label: "Sent back", value: e.sentBack, tone: STEP.wait },
          { label: "Rejected", value: e.rejected, tone: STEP.stop },
          { label: "Approved", value: e.approved, tone: STEP.info },
          { label: "Covered by advance", value: e.coveredByAdvance, tone: STEP.advance },
          { label: "No payment due", value: e.noPaymentDue, tone: STEP.neutral },
          { label: "Paid", value: e.paid, tone: STEP.done },
          { label: "Due", value: e.due, tone: STEP.owed },
        ]}
        check={`Approved ${short(e.approved)} = covered by advance ${short(e.coveredByAdvance)} + no payment due ${short(e.noPaymentDue)} + paid ${short(e.paid)} + due ${short(e.due)}`}
      />
    </div>
  );
}

// ---------------------------------------------------------------- table

/** A compact money table. Rows are clickable when there is somewhere to go; the last row is the total of the rows shown. */
function MoneyTable({ rows, columns, total, onRow, empty, caption }) {
  if (!rows.length) return <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[48rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`whitespace-nowrap px-3 py-2.5 ${c.num ? "text-right" : "text-left"}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.key} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? "cursor-pointer transition hover:bg-[#0A0082]/[0.03]" : ""}>
              {columns.map((c) => (
                <td key={c.key} className={`whitespace-nowrap px-3 py-2.5 ${c.num ? "text-right tabular-nums text-slate-800" : "text-left text-slate-700"}`}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot className="border-t-2 border-slate-200 bg-slate-50/70 font-semibold">
            <tr>
              {columns.map((c, i) => (
                <td key={c.key} className={`whitespace-nowrap px-3 py-2.5 ${c.num ? "text-right tabular-nums text-[#0a174e]" : "text-left text-[#0a174e]"}`}>
                  {i === 0 ? "Total" : c.num && !c.noTotal ? c.cell(total) : ""}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/** Adds groups field by field (advances, expenses), for the total of the rows shown. */
export function sumGroups(groups) {
  const add = (objs) => Object.fromEntries(Object.keys(objs[0] || {}).map((k) => [k, objs.reduce((s, o) => s + num(o[k]), 0)]));
  const budgets = groups.map((g) => g.budget).filter(Boolean);
  return {
    key: "total",
    employeeCount: groups.reduce((s, g) => s + num(g.employeeCount), 0),
    advances: add(groups.map((g) => g.advances)),
    expenses: add(groups.map((g) => g.expenses)),
    tax: add(groups.map((g) => g.tax || {})),
    budget: budgets.length ? add(budgets) : null,
  };
}

function BudgetCell({ budget }) {
  if (!budget) return <span className="text-slate-400">No budget</span>;
  const left = Math.min(100, Math.max(0, 100 - pct(budget.used, budget.budget)));
  return (
    <span className="inline-flex items-center gap-2" title={`${pct(budget.used, budget.budget)}% used of ${short(budget.budget)}`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <span className="block h-full bg-teal-500" style={{ width: `${left}%` }} />
      </span>
      {short(budget.effectiveAvailable)}
    </span>
  );
}

const TABS = [
  { key: "departments", label: "Departments" },
  { key: "costCenters", label: "Cost centers" },
  { key: "employees", label: "Employees" },
];

function Chip({ icon: Icon, label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-0.5 pl-2 pr-1 text-slate-700">
      <Icon size={12} className="text-slate-400" aria-hidden="true" />
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <X size={12} aria-hidden="true" />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------- view

export default function EmployeeMoneyView() {
  const [period, setPeriod] = useState("90");
  const range = useMemo(() => periodRange(period), [period]);
  const [departments, setDepartments] = useState([]);
  const [picked, setPicked] = useState([]);
  const [tab, setTab] = useState("departments");
  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ["xmsEmployeeMoney", range.from, range.to],
    queryFn: () => employeeMoneyReportApi.get(range).then((r) => r.data?.data),
    staleTime: 60_000,
  });
  const { data: deptNames = {} } = useDepartmentNames();
  const deptName = (key) => (key === "unassigned" || !key ? "No department" : deptNames[key] || `Department ${String(key).slice(0, 8)}…`);
  const cur = report?.baseCurrencyCode || "INR";

  const allDepartments = report?.departments || [];
  const allEmployees = report?.employees || [];
  const inDepts = (g) => !departments.length || departments.includes(g.departmentKey);
  // Employees to pick from: those in the chosen departments. Picks outside them are dropped.
  const deptEmployees = useMemo(() => allEmployees.filter(inDepts), [report, departments]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = picked.filter((k) => deptEmployees.some((e) => e.key === k));
  const employees = chosen.length ? deptEmployees.filter((e) => chosen.includes(e.key)) : deptEmployees;
  const shownDepartments = departments.length ? allDepartments.filter((d) => departments.includes(d.key)) : allDepartments;
  const costCenters = useMemo(() => (report?.costCenters || []).filter(inDepts), [report, departments]); // eslint-disable-line react-hooks/exhaustive-deps
  const single = chosen.length === 1 ? employees[0] : null;

  // The scope the figures describe: the picked employees, else the picked departments, else everyone.
  // Budgets belong to departments: for picked employees, the budget of the departments they are in.
  const scope = chosen.length
    ? { ...sumGroups(employees), budget: null }
    : departments.length
    ? sumGroups(shownDepartments)
    : report?.total;
  const budgetDepts = chosen.length ? [...new Set(employees.map((e) => e.departmentKey))] : departments;
  const budget = budgetDepts.length
    ? sumGroups(allDepartments.filter((d) => budgetDepts.includes(d.key))).budget
    : report?.total?.budget;
  const budgetLabel = budgetDepts.length === 1 ? "Department budget left" : budgetDepts.length > 1 ? `Budget left · ${budgetDepts.length} departments` : "Budget left";

  const deptOptions = allDepartments.map((d) => ({ label: deptName(d.key), value: d.key, hint: `${d.employeeCount} ${d.employeeCount === 1 ? "person" : "people"}` }));
  const empOptions = deptEmployees.map((e) => ({ label: e.name || e.key, value: e.key, hint: e.key }));
  const filtered = departments.length > 0 || chosen.length > 0;
  const clearAll = () => {
    setDepartments([]);
    setPicked([]);
  };

  const moneyCols = [
    { key: "paidOut", label: "Advances paid out", num: true, cell: (g) => short(g.advances.paidOut) },
    { key: "outstanding", label: "Outstanding", num: true, cell: (g) => short(g.advances.outstanding) },
    { key: "claimed", label: "Claimed", num: true, cell: (g) => short(g.expenses.claimed) },
    { key: "paid", label: "Paid", num: true, cell: (g) => short(g.expenses.paid) },
    { key: "due", label: "Due", num: true, cell: (g) => short(g.expenses.due) },
  ];
  const budgetCol = { key: "budget", label: "Budget left", num: true, noTotal: true, cell: (g) => <BudgetCell budget={g.budget} /> };
  const table = {
    departments: {
      rows: shownDepartments,
      columns: [
        { key: "name", label: "Department", cell: (g) => <span className="font-medium text-[#0a174e]">{deptName(g.key)}</span> },
        { key: "people", label: "Employees", num: true, cell: (g) => g.employeeCount },
        ...moneyCols,
        budgetCol,
      ],
      total: departments.length ? sumGroups(shownDepartments) : report?.total,
      onRow: (g) => { setDepartments([g.key]); setPicked([]); setTab("employees"); },
      hint: "Click a department to see its employees",
      empty: "No department has activity in this period.",
    },
    costCenters: {
      rows: costCenters,
      columns: [
        { key: "name", label: "Cost center", cell: (g) => <span className="font-medium text-[#0a174e]">{g.name || "No cost center"}</span> },
        { key: "dept", label: "Department", cell: (g) => deptName(g.departmentKey) },
        ...moneyCols,
        budgetCol,
      ],
      total: costCenters.length ? sumGroups(costCenters) : null,
      hint: "Budgets are for the whole fiscal year",
      empty: "No cost center has activity or a budget in this period.",
    },
    employees: {
      rows: employees,
      columns: [
        { key: "name", label: "Employee", cell: (g) => <span><span className="font-medium text-[#0a174e]">{g.name || g.key}</span><span className="ml-1.5 text-[11px] text-slate-400">{g.key}</span></span> },
        { key: "dept", label: "Department", cell: (g) => deptName(g.departmentKey) },
        ...moneyCols,
      ],
      total: employees.length ? sumGroups(employees) : null,
      onRow: (g) => setPicked([g.key]),
      hint: "Click an employee to see their whole flow, or pick several above to compare",
      empty: "No employee has an advance or a claim in this period.",
    },
  };
  const tabs = chosen.length ? TABS.filter((t) => t.key === "employees") : departments.length === 1 ? TABS.filter((t) => t.key !== "departments") : TABS;
  const shownTab = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;
  const t = table[shownTab];

  return (
    <div className="space-y-4" data-employee-money>
      {/* Filters: period chips, then departments and employees (several of each) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div role="group" aria-label="Period" className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={period === p.key}
              data-money-period={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                period === p.key ? "bg-[#0A0082] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[30rem]">
          <MultiSelectFilter label="Departments" noun="departments" options={deptOptions} value={departments}
            onChange={(v) => setDepartments(v)} searchPlaceholder="Search departments" />
          <MultiSelectFilter label="Employees" noun="employees" options={empOptions} value={chosen}
            allLabel={departments.length ? "All employees in them" : "All employees"}
            onChange={(v) => setPicked(v)} searchPlaceholder="Name or employee ID" />
        </div>
      </div>

      {/* What the figures below cover, with each choice removable */}
      {filtered && report && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs" data-money-selection>
          <span className="mr-1 font-semibold text-slate-600">
            Showing {plural(chosen.length || employees.length, "employee")}
            {budgetDepts.length ? ` in ${plural(budgetDepts.length, "department")}` : ""}:
          </span>
          {departments.map((k) => (
            <Chip key={`d-${k}`} icon={Building2} label={deptName(k)} onRemove={() => setDepartments(departments.filter((x) => x !== k))} />
          ))}
          {chosen.map((k) => (
            <Chip key={`e-${k}`} icon={Users} label={allEmployees.find((e) => e.key === k)?.name || k} onRemove={() => setPicked(picked.filter((x) => x !== k))} />
          ))}
          <button type="button" onClick={clearAll} className="ml-auto font-semibold text-[#0A0082] hover:underline">Clear all</button>
        </div>
      )}

      {isError ? (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Couldn&apos;t load the money view.
          <button type="button" onClick={() => refetch()} className="font-semibold underline">Retry</button>
        </div>
      ) : isLoading || !scope ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Loading the money view…</p>
      ) : (
        <>
          <ScopeKpis group={scope} budget={budget} budgetLabel={budgetLabel} cur={cur} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <FlowChart points={report.timeline} cur={cur} />
            <CostCenterChart groups={costCenters} cur={cur} />
          </div>
          {filtered && (
            <p className="-mt-2 text-[11px] text-slate-400">
              The line chart, tax per period and tax checks cover the whole organization; the figures, cost centers, table and tax totals follow your filter.
            </p>
          )}

          {single ? (
            <EmployeeDetail group={single} departmentName={deptName(single.departmentKey)} cur={cur} onBack={() => setPicked([])} />
          ) : (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div role="tablist" aria-label="Group by" className="inline-flex rounded-lg bg-slate-100 p-0.5">
                  {tabs.map((x) => (
                    <button
                      key={x.key}
                      type="button"
                      role="tab"
                      aria-selected={shownTab === x.key}
                      onClick={() => setTab(x.key)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        shownTab === x.key ? "bg-white text-[#0A0082] shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400">{t.hint}</span>
              </div>
              <MoneyTable caption={`Money by ${shownTab}`} rows={t.rows} columns={t.columns} total={t.total} onRow={t.onRow} empty={t.empty} />
            </div>
          )}
          <TaxSection tax={scope.tax} claimed={scope.expenses.claimed} timeline={report.timeline} review={report.taxReview} cur={cur} />

          <p className="text-[11px] text-slate-400">
            Amounts in {cur}. Advances by request date (paid out on the chart by pay-out date), reports by submit date; budget for fiscal year {report.fiscalYear || "—"}.
          </p>
        </>
      )}
    </div>
  );
}
