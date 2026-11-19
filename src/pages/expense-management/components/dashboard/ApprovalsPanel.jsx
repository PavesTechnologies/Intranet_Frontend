import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, Banknote, ChevronDown, ClipboardCheck, FileText, Inbox, TrendingUp, Undo2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney, timeAgo } from "./dashboardTheme";
import { ItemList } from "./DashboardWidgets";

// The manager's approvals, folded into their own "My money" dashboard. Closed, the header says how much is waiting for
// a decision and how the last 30 days went; opened, it adds the approval rate, the waiting list and the recent
// decisions without repeating the header's figures. Every figure is the backend's manager-view response.

const ICONS = { ClipboardCheck, Banknote, FileText };
const openKey = (user) => `xms.dashboard.approvalsOpen.${user?.employeeId || user?.email || user?.id || "anonymous"}`;

const val = (byKey, key) => (byKey[key] ? Number(byKey[key].value) || 0 : 0);

// A figure shown in the closed header, on its own tinted chip so the three read apart at a glance.
function Stat({ label, value, sub, box, text }) {
  return (
    <div className={`min-w-0 rounded-xl px-3.5 py-2.5 ${box}`}>
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className={`mt-0.5 truncate text-lg font-bold tabular-nums leading-tight ${text}`}>{value}</p>
      {sub && <p className="truncate text-[11px] opacity-70">{sub}</p>}
    </div>
  );
}

// How the last 30 days of decisions split between approved and sent back.
function DecisionMix({ approved, sentBack }) {
  const total = approved + sentBack;
  const rate = total > 0 ? Math.round((approved / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4" data-decision-mix>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-[#0a174e]">Your decisions, last 30 days</span>
        <span className="tabular-nums text-slate-500">
          {total > 0 ? (
            <>
              <span className="font-semibold text-emerald-700">{rate}%</span> approved
            </>
          ) : (
            "No decisions yet"
          )}
        </span>
      </div>
      <div className="mt-2.5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`${approved} approved, ${sentBack} sent back in the last 30 days`}>
        {approved > 0 && <span className="h-full rounded-l-full bg-emerald-500 last:rounded-r-full" style={{ width: `${(approved / total) * 100}%` }} />}
        {sentBack > 0 && <span className="h-full rounded-r-full bg-[#ff3d72] first:rounded-l-full" style={{ width: `${(sentBack / total) * 100}%` }} />}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-600" aria-hidden="true" /> Approved
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Undo2 size={12} className="text-[#ff3d72]" aria-hidden="true" /> Sent back
        </span>
      </div>
    </div>
  );
}

export default function ApprovalsPanel({ config, query, currency }) {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(openKey(user)) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(openKey(user), open ? "1" : "0");
    } catch {
      /* private mode: the choice is simply not remembered */
    }
  }, [open]);

  const { data, isLoading, isError, refetch } = query;
  const byKey = Object.fromEntries((data?.kpis || []).map((k) => [k.key, k]));
  const pending = val(byKey, "pending");
  const pendingValue = val(byKey, "pendingValue");
  const approved = val(byKey, "approved30");
  const sentBack = val(byKey, "sentBack30");
  const waiting = data?.attention || [];
  const oldest = waiting.reduce((min, it) => (it.at && (!min || new Date(it.at) < new Date(min)) ? it.at : min), null);
  const actions = (config.quickActions || []).filter((a) => !a.roles || hasRole(a.roles));

  const summary = isLoading
    ? "Loading your approvals..."
    : isError
      ? "Couldn't load your approvals."
      : pending > 0
        ? `${pending} item${pending === 1 ? "" : "s"} worth ${formatMoney(pendingValue, currency)} waiting for your decision${oldest ? `, oldest sent ${timeAgo(oldest)}` : ""}.`
        : "Nothing is waiting for your decision.";

  return (
    <section
      data-approvals-panel
      className={`overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)] transition-colors ${
        pending > 0 ? "border-amber-200" : "border-slate-100"
      }`}
    >
      <span
        aria-hidden="true"
        className={`block h-1 bg-gradient-to-r ${pending > 0 ? "from-amber-400 via-orange-300 to-[#ff7aa0]" : "from-[#0A0082] to-[#4f63c9]"}`}
      />
      <button
        type="button"
        data-approvals-toggle
        aria-expanded={open}
        aria-controls="em-approvals-body"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full flex-wrap items-center gap-x-5 gap-y-3 p-4 text-left sm:p-5 transition-colors hover:bg-slate-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0082]/40"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              pending > 0 ? "bg-amber-400/15 text-amber-700" : "bg-[#0A0082]/10 text-[#0A0082]"
            }`}
          >
            <ClipboardCheck size={18} aria-hidden="true" />
            {pending > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3d72] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {pending}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-[#0a174e]">Team approvals</span>
              {pending > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Action needed</span>
              )}
            </span>
            <span data-approvals-summary className="mt-0.5 block text-xs text-slate-500">
              {summary}
            </span>
          </span>
        </span>

        {!isLoading && !isError && (
          <span className="grid w-full grid-cols-2 gap-2 lg:w-auto lg:min-w-[300px]">
            <Stat label="Approved" value={approved} sub="last 30 days" box="bg-emerald-50 text-emerald-800" text="text-emerald-700" />
            <Stat label="Sent back" value={sentBack} sub="last 30 days" box="bg-rose-50 text-rose-800" text="text-[#ff3d72]" />
          </span>
        )}

        <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#0A0082] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition group-hover:bg-[#0a174e]">
          {open ? "Hide details" : "Show details"}
          <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div id="em-approvals-body" className="space-y-4 border-t border-slate-100 bg-slate-50/30 p-4">
          {isError ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertTriangle className="h-6 w-6 text-rose-500" aria-hidden="true" />
              <p className="text-sm font-semibold text-rose-700">Couldn't load your approvals.</p>
              <button type="button" onClick={() => refetch()} className="text-xs font-semibold text-[#0A0082] hover:underline">
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <p className="py-8 text-center text-xs text-slate-400">Loading...</p>
          ) : (
            <>
              <DecisionMix approved={approved} sentBack={sentBack} />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="rounded-xl border border-slate-100 bg-white p-3 lg:col-span-3">
                  <h3 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-[#0a174e]">
                    <Inbox size={15} className="text-amber-600" aria-hidden="true" />
                    {config.attentionTitle}
                    <span className="text-xs font-normal text-slate-400">{config.attentionSubtitle}</span>
                  </h3>
                  <ItemList items={waiting} currency={currency} linkFor={config.link} showEmployee={config.showEmployee} empty={config.attentionEmpty} />
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-3 lg:col-span-2">
                  <h3 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-[#0a174e]">
                    <TrendingUp size={15} className="text-teal-600" aria-hidden="true" />
                    {config.activityTitle}
                  </h3>
                  <ItemList items={data?.activity} currency={currency} linkFor={config.link} showEmployee={config.showEmployee} timeline empty="No recent decisions yet." />
                </div>
              </div>

              {actions.length > 0 && (
                <div className="flex flex-wrap gap-2" data-approval-actions>
                  {actions.map((a) => {
                    const Icon = ICONS[a.icon] || FileText;
                    return (
                      <button
                        key={a.key}
                        type="button"
                        data-quick-action={a.key}
                        onClick={() => navigate(a.to)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 ${
                          a.primary ? "bg-[#0A0082] text-white hover:bg-[#0a174e]" : "border border-slate-200 bg-white text-[#0a174e] hover:border-[#0A0082]/30"
                        }`}
                      >
                        <Icon size={14} aria-hidden="true" />
                        {a.label}
                        <ArrowUpRight size={13} aria-hidden="true" className="opacity-70" />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
