import React from "react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { SECTION, scrollToSection } from "./sectionAnchors";
import { HeroQuickActions } from "./DashboardHero";

// The top of the "My money" dashboard: three compact columns, one per money flow plus their total.
// Each column leads with the one figure to act on, and two short lines say where it comes from:
//   Direct expenses: Paid to your bank   (Approved, On its way)
//   Cash advance:    Still to settle     (Received, Used on bills + returned)
//   Total:           Total approved      (From advance, To your bank)
// A column scrolls to its ledger for the detail. Every figure is the backend's; a few lines add two of them together.

const num = (byKey, key) => (byKey[key] ? Number(byKey[key].value) || 0 : 0);
// Sum of backend figures, or null (shown as "-") until any of them has loaded.
const sumOf = (byKey, keys) => (keys.some((k) => byKey[k]) ? keys.reduce((a, k) => a + num(byKey, k), 0) : null);

const COLUMNS = [
  {
    key: "direct",
    title: "Direct expenses",
    target: SECTION.direct,
    color: "#8fa0ff",
    main: { label: "Paid to your bank", keys: ["drPaid"] },
    lines: [
      { key: "drApproved", label: "Approved", keys: ["drApproved"] },
      { key: "drPending", label: "On its way", keys: ["drToSendAp", "drPendingAp"] },
    ],
  },
  {
    key: "advance",
    title: "Cash advance",
    target: SECTION.advance,
    color: "#eda100",
    main: { label: "Still to settle", keys: ["caOutstanding"] },
    lines: [
      { key: "caDisbursed", label: "Received", keys: ["caDisbursed"] },
      { key: "caAccounted", label: "Used on bills + returned", keys: ["caUsedOnBills", "caReturned", "caCarriedForward"] },
    ],
  },
  {
    key: "total",
    title: "Total",
    target: SECTION.total,
    color: "#1baf7a",
    main: { label: "Total approved", keys: ["erApproved"] },
    lines: [
      { key: "erAdvanceOffset", label: "From advance", keys: ["erAdvanceOffset"] },
      { key: "erPayable", label: "To your bank", keys: ["erPayable"] },
    ],
  },
];

const money = (v, currency) => (v === null ? "-" : formatMoney(v, currency));

export default function EmployeeOverview({ byKey, currency, quickActions = [] }) {
  return (
    <section
      data-overview
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.25)]"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0A0082] via-[#18208f] to-[#2f3f9e] px-5 py-4 text-white sm:px-6">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.06]" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-[#ff3d72]/[0.12] blur-2xl" />

        <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Your expense money</p>
        <div className="relative mt-2 grid gap-2 sm:grid-cols-3">
          {COLUMNS.map((c) => (
            <button
              key={c.key}
              type="button"
              data-money-col={c.key}
              onClick={() => scrollToSection(c.target)}
              className={`relative rounded-xl py-2.5 pl-4 pr-3 text-left ring-1 transition hover:bg-white/[0.16] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                c.key === "total" ? "bg-white/[0.14] ring-white/30" : "bg-white/[0.07] ring-white/15"
              }`}
            >
              <span aria-hidden="true" className="absolute inset-y-3 left-1.5 w-1 rounded-full" style={{ background: c.color }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85">{c.title}</p>
              <p className="mt-1 text-xs text-white/60">{c.main.label}</p>
              <p data-money-main className="truncate text-2xl font-bold tabular-nums">{money(sumOf(byKey, c.main.keys), currency)}</p>
              <dl className="mt-1.5 space-y-0.5 border-t border-white/10 pt-1.5 text-xs">
                {c.lines.map((l) => (
                  <div key={l.key} data-money-line={l.key} className="flex justify-between gap-3">
                    <dt className="truncate text-white/60">{l.label}</dt>
                    <dd className="whitespace-nowrap tabular-nums text-white/90">{money(sumOf(byKey, l.keys), currency)}</dd>
                  </div>
                ))}
              </dl>
            </button>
          ))}
        </div>
        <HeroQuickActions actions={quickActions} />
      </div>
    </section>
  );
}
