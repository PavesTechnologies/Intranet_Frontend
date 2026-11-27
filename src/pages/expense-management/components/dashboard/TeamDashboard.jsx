import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  Gauge,
  PieChart,
  Users,
  Wallet,
} from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import SegmentedControl from "@/components/ui/SegmentedControl";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button/Button";
import { teamExpensesApi } from "@/pages/expense-management/api/teamExpensesApi";
import { expenseSummaryReportApi } from "@/pages/expense-management/pages/reports/reportsApi";
import { humanizeEnum } from "@/pages/expense-management/pages/reports/reportUtils";
import { Breakdown, Ranking, TrendChart } from "./DashboardWidgets";
import { ACCENT, formatMoney, timeAgo } from "./dashboardTheme";
import { DashboardHero, FigureCard, HeroButton, TrendTotals } from "./DashboardHero";

// A manager's whole team (direct reports) on one page: who spent how much, where the team's claims stand, and how
// spend moves by month and category. Two existing team-scoped endpoints, no new backend:
//  - /xms/manager/team/summary: one row per member (all submitted reports, drafts excluded)
//  - /xms/reports/expense-summary: the team's line items in the chosen period (TEAM scope for a manager)

const PERIODS = [
  { key: "month", label: "This month" },
  { key: "quarter", label: "Last 3 months" },
  { key: "year", label: "Last 12 months" },
];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const periodRange = (key) => {
  const now = new Date();
  const back = key === "month" ? 0 : key === "quarter" ? 2 : 11;
  return { from: iso(new Date(now.getFullYear(), now.getMonth() - back, 1)), to: iso(now) };
};

const FIGURES = [
  { key: "claimedAmount", label: "Total claimed", help: "Everything the team has submitted, not rejected.", tone: "indigo", icon: Wallet },
  { key: "inProgressAmount", label: "In approval", help: "With approvers or Finance, or sent back for changes.", tone: "amber", icon: Clock },
  { key: "approvedAmount", label: "Approved, unpaid", help: "Approved and waiting for payment.", tone: "blue", icon: Banknote },
  { key: "reimbursedAmount", label: "Reimbursed", help: "Already paid out to the team.", tone: "emerald", icon: BadgeCheck },
];

const num = (v) => Number(v) || 0;

export default function TeamDashboard({ currency: fallbackCurrency }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("year");
  const range = useMemo(() => periodRange(period), [period]);

  const summary = useQuery({
    queryKey: ["xmsDashboard", "team", "summary"],
    queryFn: () => teamExpensesApi.getSummary().then((res) => res.data?.data),
    staleTime: 60_000,
  });
  const report = useQuery({
    queryKey: ["xmsDashboard", "team", "report", range.from, range.to],
    queryFn: () => expenseSummaryReportApi.get(range).then((res) => res.data?.data),
    staleTime: 60_000,
  });

  if (summary.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-24">
        <LoadingSpinner text="Loading your team..." />
      </div>
    );
  }
  if (summary.isError) {
    return <LoadError error={summary.error} onRetry={() => summary.refetch()} />;
  }

  const team = summary.data || {};
  const currency = team.baseCurrencyCode || fallbackCurrency || "INR";
  const members = team.members || [];
  const openReports = members.reduce((s, m) => s + num(m.inProgressCount), 0);
  const viewReports = (employeeId) =>
    navigate(`/expense-management/expenses/all${employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ""}`);

  return (
    <div className="space-y-4" data-team-dashboard>
      <DashboardHero
        eyebrow={`My team · ${team.memberCount || 0} direct report${team.memberCount === 1 ? "" : "s"}`}
        icon={Users}
        headline={
          <>
            <span data-kpi="teamClaimed">{formatMoney(team.claimedAmount, currency)}</span> claimed by your team
          </>
        }
        detail={`${team.reportCount || 0} report${team.reportCount === 1 ? "" : "s"} submitted, ${openReports} still in approval. All time, drafts excluded.`}
        aside={<HeroButton icon={Users} onClick={() => viewReports()}>Team expenses</HeroButton>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {FIGURES.map((f) => (
          <FigureCard key={f.key} step={f} icon={f.icon} currency={currency} kpi={{ key: f.key, value: team[f.key], format: "money" }} />
        ))}
      </div>

      <MemberTable members={members} total={num(team.claimedAmount)} currency={currency} onOpen={viewReports} />

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <h2 className="text-sm font-semibold text-[#0a174e]">Team spend by period</h2>
        <SegmentedControl label="Period" options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <PeriodSections query={report} currency={currency} periodLabel={PERIODS.find((p) => p.key === period).label} />
    </div>
  );
}

const PAGE_SIZE = 5;

/** Who spent how much: five members a page, highest spend first, searchable by name, email or employee id. */
function MemberTable({ members: all, total, currency, onOpen }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? all.filter((m) => [m.name, m.email, m.employeeId].some((v) => (v || "").toString().toLowerCase().includes(q)))
    : all;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const members = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const claimants = all.filter((m) => num(m.claimedAmount) > 0).length;

  const searchBox = (
    <label className="relative block w-full sm:w-64">
      <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
        placeholder="Search name, email or ID"
        aria-label="Search team members"
        className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#0A0082]/40 focus:outline-none focus:ring-2 focus:ring-[#0A0082]/15"
      />
    </label>
  );

  return (
    <SectionCard
      title="Who spent how much"
      subtitle={`${claimants} of ${all.length} member${all.length === 1 ? "" : "s"} have claimed. Highest spend first; click a row to see their reports.`}
      icon={Users}
      tone="navy"
      action={all.length ? searchBox : null}
    >
      {!all.length ? (
        <p className="py-8 text-center text-sm text-slate-400">No one reports to you in the employee directory yet.</p>
      ) : !filtered.length ? (
        <p className="py-8 text-center text-sm text-slate-400">No team member matches “{search.trim()}”.</p>
      ) : (
        <>
          <MemberRows members={members} total={total} currency={currency} onOpen={onOpen} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500" data-member-pager>
            <span>
              {current * PAGE_SIZE + 1}–{current * PAGE_SIZE + members.length} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <PagerButton label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)}>
                <ChevronLeft size={14} />
              </PagerButton>
              <span className="px-2 tabular-nums">
                Page {current + 1} of {pages}
              </span>
              <PagerButton label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
                <ChevronRight size={14} />
              </PagerButton>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}

function PagerButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function MemberRows({ members, total, currency, onOpen }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[760px] text-xs" data-team-members>
        <thead>
          <tr className="border-b border-slate-100 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-2 py-2">Member</th>
            <th className="px-2 py-2 text-right">Reports</th>
            <th className="px-2 py-2">Claimed</th>
            <th className="px-2 py-2 text-right">In approval</th>
            <th className="px-2 py-2 text-right">Approved, unpaid</th>
            <th className="px-2 py-2 text-right">Reimbursed</th>
            <th className="px-2 py-2 text-right">Last submitted</th>
            <th className="w-6" />
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const share = total > 0 ? (num(m.claimedAmount) / total) * 100 : 0;
            const inactive = m.employmentStatus && !/^active$/i.test(m.employmentStatus);
            return (
              <tr
                key={m.employeeId}
                data-member={m.employeeId}
                onClick={() => onOpen(m.employeeId)}
                className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
              >
                <td className="px-2 py-2.5">
                  <p className="font-semibold text-slate-900">
                    {m.name || m.employeeId}
                    {inactive && <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{humanizeEnum(m.employmentStatus)}</span>}
                  </p>
                  <p className="text-[10px] text-slate-400">{[m.email, m.employeeId].filter(Boolean).join(" · ")}</p>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">
                  {m.reportCount}
                  {num(m.rejectedCount) > 0 && <span className="block text-[10px] text-rose-500">{m.rejectedCount} rejected</span>}
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0 font-semibold tabular-nums text-slate-900">{formatMoney(m.claimedAmount, currency)}</span>
                    <div className="h-1.5 min-w-[60px] flex-1 overflow-hidden rounded-full bg-slate-100" title={`${Math.round(share)}% of team spend`}>
                      <div className="h-full rounded-full" style={{ width: `${share > 0 ? Math.max(share, 2) : 0}%`, background: ACCENT }} />
                    </div>
                    <span className="w-8 text-right tabular-nums text-slate-400">{Math.round(share)}%</span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">
                  {formatMoney(m.inProgressAmount, currency)}
                  {num(m.inProgressCount) > 0 && <span className="block text-[10px] text-amber-600">{m.inProgressCount} open</span>}
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{formatMoney(m.approvedAmount, currency)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-emerald-700">{formatMoney(m.reimbursedAmount, currency)}</td>
                <td className="px-2 py-2.5 text-right text-slate-500">{m.lastSubmittedAt ? timeAgo(m.lastSubmittedAt) : "—"}</td>
                <td className="px-1 text-slate-300"><ChevronRight size={14} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PeriodSections({ query, currency, periodLabel }) {
  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
        <LoadingSpinner text="Loading team spend..." />
      </div>
    );
  }
  if (query.isError) return <LoadError error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data;
  if (!data) return null;
  // A manager who is also Admin/Finance gets organization-wide figures from this endpoint; those are not the team's.
  if (data.scope !== "TEAM") {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
        Your role also covers the whole organization, so team-only charts are not available here. See the Reports page for organization figures.
      </p>
    );
  }

  const points = (data.byMonth || []).map((r) => ({
    period: r.key,
    label: String(r.label || r.key).split(" ")[0],
    primary: num(r.amount),
    count: r.count,
  }));
  const totals = data.totals || {};
  const peak = points.reduce((best, p) => (p.primary > (best?.primary || 0) ? p : best), null);
  const statuses = (data.byStatus || []).map((r) => ({ ...r, label: humanizeEnum(r.key) }));
  const advances = data.cashAdvances || {};
  const advanceStatuses = (advances.byStatus || []).map((r) => ({ ...r, label: humanizeEnum(r.key) }));
  const reimb = data.reimbursements || {};

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard title="Monthly team spend" subtitle={`${periodLabel}, by expense date, ${currency}`} icon={BarChart3} tone="teal" className="lg:col-span-3">
          <TrendTotals
            cells={[
              { label: "Spend", value: formatMoney(totals.spend, currency) },
              { label: "Avg per report", value: formatMoney(totals.averagePerReport, currency) },
              { label: "Busiest month", value: peak ? `${peak.label} ${peak.period.slice(0, 4)}` : "—" },
            ]}
          />
          <TrendChart points={points} currency={currency} mode="moneyBars" countLabel="Expense lines" primaryLabel="Spend" />
        </SectionCard>
        <SectionCard title="Spend by category" subtitle="Where the team's money goes" icon={PieChart} tone="pink" className="lg:col-span-2">
          <Ranking slices={(data.byCategory || []).slice(0, 8)} currency={currency} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard title="Cash advances" subtitle={`Requested in ${periodLabel.toLowerCase()}`} icon={Banknote} tone="amber" className="lg:col-span-3">
          <TrendTotals
            cells={[
              { label: "Advances", value: advances.count || 0 },
              { label: "Requested", value: formatMoney(advances.requestedAmount, currency) },
              { label: "Outstanding now", value: formatMoney(advances.outstandingAmount, currency) },
            ]}
          />
          <Breakdown slices={advanceStatuses} currency={currency} />
        </SectionCard>
        <SectionCard title="Reports by status" subtitle={`Reports with spend in ${periodLabel.toLowerCase()}`} icon={Gauge} tone="navy" className="lg:col-span-2">
          <TrendTotals
            cells={[
              { label: "Paid in period", value: formatMoney(reimb.paidAmount, currency) },
              { label: "Waiting for AP", value: formatMoney(reimb.awaitingPaymentAmount, currency) },
              { label: "Claimants", value: totals.employeeCount || 0 },
            ]}
          />
          <Breakdown slices={statuses} currency={currency} />
        </SectionCard>
      </div>
    </>
  );
}

function LoadError({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-12 text-center">
      <AlertTriangle className="h-6 w-6 text-rose-500" />
      <p className="text-sm font-semibold text-rose-700">Couldn't load your team's figures.</p>
      <p className="max-w-md text-xs text-rose-500">{error?.response?.data?.message || error?.message}</p>
      <Button size="small" variant="outline" className="mt-2" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
