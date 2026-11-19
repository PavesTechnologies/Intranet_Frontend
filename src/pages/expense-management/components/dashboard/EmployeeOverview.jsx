import React from "react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { SECTION, scrollToSection } from "./sectionAnchors";
import { HeroQuickActions } from "./DashboardHero";

// The top of the "My money" dashboard: how much money is still coming to me, and the key totals beside it.
// Beside the headline, four money cards repeat the key totals from the two ledgers further down (claimed, approved,
// paid, advance outstanding) so they are visible without scrolling; each card scrolls to its ledger for the detail.

const num = (byKey, key) => (byKey[key] ? Number(byKey[key].value) || 0 : 0);

// The money cards in the banner. Same colours as the ledgers: navy = in the system, green = done, amber = waiting.
const MONEY_CARDS = [
  { key: "erClaimed", label: "Total claimed", help: "Everything you submitted", color: "#8fa0ff", target: SECTION.reimbursement },
  { key: "erApproved", label: "Approved", help: "Approved for reimbursement", color: "#8fa0ff", target: SECTION.reimbursement },
  { key: "erPaid", label: "Paid to you", help: "Already in your account", color: "#1baf7a", target: SECTION.reimbursement },
  { key: "caOutstanding", label: "Advance outstanding", help: "Still to account for", color: "#eda100", target: SECTION.advance },
];

export default function EmployeeOverview({ byKey, currency, quickActions = [] }) {
  const paid = num(byKey, "erPaid");
  const onTheWay = num(byKey, "erToSendAp") + num(byKey, "erPendingAp");

  return (
    <section
      data-overview
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.25)]"
    >
      {/* The banner: money still coming to me, and the money cards */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0A0082] via-[#18208f] to-[#2f3f9e] px-5 py-4 text-white sm:px-6">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.06]" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-[#ff3d72]/[0.12] blur-2xl" />

        <div className="relative grid gap-4 lg:grid-cols-12 lg:items-center">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:col-span-12">
            <div className="min-w-0 sm:w-56 sm:shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Your money at a glance</p>
              <div className="mt-1">
                <p className="text-sm font-medium text-white/80">On its way to you</p>
                <p className="mt-0.5 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">{formatMoney(onTheWay, currency)}</p>
                <p className="mt-1 text-xs text-white/70">
                  {onTheWay > 0
                    ? "Approved, but not in your bank account yet."
                    : paid > 0
                      ? "Nothing pending. Everything approved has been paid."
                      : "No approved claims are waiting to be paid."}
                </p>
              </div>
            </div>

            {/* Money cards: the key totals at a glance. Each one opens the ledger it comes from. */}
            <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-4" data-money-cards>
              {MONEY_CARDS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  data-money-card={c.key}
                  title={c.help}
                  onClick={() => scrollToSection(c.target)}
                  className="group relative overflow-hidden rounded-xl bg-white/[0.08] py-2 pl-4 pr-3 text-left ring-1 ring-white/15 transition hover:bg-white/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <span aria-hidden="true" className="absolute inset-y-2 left-1.5 w-1 rounded-full" style={{ background: c.color }} />
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/60">{c.label}</p>
                  <p className="truncate text-lg font-bold tabular-nums">{byKey[c.key] ? formatMoney(byKey[c.key].value, currency) : "-"}</p>
                  <p className="truncate text-[11px] text-white/50">{c.help}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <HeroQuickActions actions={quickActions} />
      </div>
    </section>
  );
}
