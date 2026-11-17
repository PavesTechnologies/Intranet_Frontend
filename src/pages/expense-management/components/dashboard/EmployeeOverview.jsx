import React from "react";
import { AlertTriangle, ArrowDown, BadgeCheck, CheckCircle2, Clock3, HandCoins, Info, PiggyBank, ReceiptText, Wallet } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { TONES } from "@/components/ui/SectionCard";
import { SECTION, scrollToSection } from "./sectionAnchors";

// The top of the employee dashboard, in the same white-card style as the rest of the page. It answers three questions
// in plain language: what should I do now (the "next step" callout), how much money is still coming to me and where
// it is (the headline and the payment progress bar), and the four figures an employee checks most (the tiles).
// Every amount is the backend's figure.

const num = (byKey, key) => (byKey[key] ? Number(byKey[key].value) || 0 : 0);
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// Where approved money sits on its way to the employee. Green = done, amber = in progress, navy tint = not started.
const SPLIT = [
  { key: "erPaid", label: "Paid to you", help: "Credited to your bank account", dot: "bg-emerald-500" },
  { key: "erPendingAp", label: "Payment in progress", help: "With the Accounts Payable team", dot: "bg-amber-400" },
  { key: "erToSendAp", label: "Approved, queued", help: "Not yet sent to Accounts Payable", dot: "bg-[#0A0082]/30" },
];

function nextStep({ overdue, dueSoon, needsAction, outstanding, onTheWay, currency }) {
  const todo = { target: SECTION.needsYou, cta: "Show me the list" };
  if (overdue > 0)
    return { ...todo, tone: "rose", icon: AlertTriangle, title: "Action needed", text: `${overdue} cash advance settlement${overdue === 1 ? " is" : "s are"} overdue. Settle ${overdue === 1 ? "it" : "them"} first.` };
  if (needsAction > 0)
    return { ...todo, tone: "amber", icon: AlertTriangle, title: "Action needed", text: `${needsAction} item${needsAction === 1 ? "" : "s"} waiting on you. See the list below.` };
  if (dueSoon > 0)
    return { ...todo, tone: "amber", icon: Clock3, title: "Coming up", text: `${dueSoon} advance settlement${dueSoon === 1 ? " is" : "s are"} due within a week.` };
  if (outstanding > 0)
    return { target: SECTION.advance, cta: "View my advance", tone: "info", icon: Info, title: "Good to know", text: `${formatMoney(outstanding, currency)} of your advance is still to be accounted for. Submit the expenses against it.` };
  if (onTheWay > 0)
    return { target: SECTION.reimbursement, cta: "Track payment", tone: "info", icon: Clock3, title: "In progress", text: "Your approved money is with Finance and Accounts Payable. Nothing for you to do." };
  return { tone: "good", icon: CheckCircle2, title: "All good", text: "You're all caught up. Nothing needs you right now." };
}

const STEP_TONE = {
  rose: { box: "border-rose-200 bg-rose-50 text-rose-800", icon: "bg-rose-100 text-rose-600", btn: "bg-rose-600 text-white hover:bg-rose-700" },
  amber: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: "bg-amber-100 text-amber-700", btn: "bg-amber-500 text-white hover:bg-amber-600" },
  info: { box: "border-[#0A0082]/15 bg-[#0A0082]/[0.04] text-[#0a174e]", icon: "bg-[#0A0082]/10 text-[#0A0082]", btn: "bg-[#0A0082] text-white hover:bg-[#0a174e]" },
  good: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "bg-emerald-100 text-emerald-700", btn: "" },
};

// A figure tile. Clicking it scrolls to the section that explains the figure in full.
function Tile({ icon: Icon, label, value, hint, help, tone = "navy", highlight = false, target, cta }) {
  const t = TONES[tone] || TONES.navy;
  return (
    <button
      type="button"
      data-tile-target={target}
      onClick={() => scrollToSection(target)}
      className={`group relative flex h-full min-w-0 flex-col justify-between gap-4 overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40 ${
        highlight ? "border-[#ff3d72]/30" : "border-slate-100 hover:border-transparent"
      }`}
    >
      <span className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.tile} transition-transform duration-200 group-hover:scale-110`}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#0a174e]">{label}</span>
          <span className="block text-[11px] leading-snug text-slate-500">{help}</span>
        </span>
      </span>
      <span className="block min-w-0">
        <span className="block truncate text-xl font-bold tabular-nums text-[#0a174e]">{value}</span>
        {hint && <span className="mt-0.5 block truncate text-xs text-slate-500">{hint}</span>}
        <span className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2.5 text-xs font-medium text-[#0A0082]/70 transition-colors group-hover:text-[#0A0082]">
          {cta}
          <ArrowDown size={13} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-y-0.5" />
        </span>
      </span>
      <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${t.bar} transition-opacity ${highlight ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
    </button>
  );
}

export default function EmployeeOverview({ byKey, currency, attentionCount = 0, reminders = [] }) {
  const claimed = num(byKey, "erClaimed");
  const approved = num(byKey, "erApproved");
  const payable = num(byKey, "erPayable");
  const paid = num(byKey, "erPaid");
  const onTheWay = num(byKey, "erToSendAp") + num(byKey, "erPendingAp");
  const received = num(byKey, "caDisbursed");
  const outstanding = num(byKey, "caOutstanding");

  const overdue = reminders.filter((r) => r.overdue).length;
  const dueSoon = reminders.length - overdue;
  const needsAction = Math.max(0, attentionCount - reminders.length);
  const step = nextStep({ overdue, dueSoon, needsAction, outstanding, onTheWay, currency });
  const StepIcon = step.icon;
  const stepTone = STEP_TONE[step.tone];
  const paidPct = pct(paid, payable);

  const reportsHint = byKey.claimed?.hint || "All submitted reports";

  return (
    <section
      data-overview
      className="flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES.navy.tile}`}>
            <PiggyBank size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-[#0a174e]">Your money at a glance</h2>
            <p className="mt-0.5 text-xs text-slate-500">A simple summary of your expense claims and cash advances</p>
          </div>
        </div>
      </header>

      {/* What should I do now? */}
      <div data-next-step-box className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${stepTone.box}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stepTone.icon}`}>
          <StepIcon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{step.title}</p>
          <p data-next-step className="text-sm font-medium">{step.text}</p>
        </div>
        {step.target && (
          <button
            type="button"
            data-next-step-go={step.target}
            onClick={() => scrollToSection(step.target)}
            className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0A0082]/40 ${stepTone.btn}`}
          >
            {step.cta}
            <ArrowDown size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Headline: money still coming, and where it is */}
        <div className="flex h-full flex-col gap-5 rounded-2xl border border-[#0A0082]/10 bg-gradient-to-br from-[#0A0082]/[0.04] to-[#ff3d72]/[0.03] p-5 xl:col-span-5">
          <div>
            <p className="text-sm font-medium text-slate-600">On its way to you</p>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-[#0A0082] sm:text-4xl">{formatMoney(onTheWay, currency)}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              {onTheWay > 0
                ? "Approved, but not in your bank account yet."
                : paid > 0
                  ? "Nothing pending. Everything approved has been paid."
                  : "No approved claims are waiting to be paid."}{" "}
              Already paid to you: <span className="font-semibold text-emerald-700">{formatMoney(paid, currency)}</span>
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-slate-600">Reimbursement progress</span>
              <span className="font-semibold tabular-nums text-[#0a174e]">{paidPct}% of {formatMoney(payable, currency)} paid</span>
            </div>
            <div
              className="mt-2 flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={`Paid ${paidPct}% of what is payable to you`}
            >
              {payable > 0 &&
                SPLIT.map((s) => {
                  const w = Math.min(100, Math.max(0, (num(byKey, s.key) / payable) * 100));
                  return w > 0 ? <span key={s.key} className={`h-full first:rounded-l-full last:rounded-r-full ${s.dot}`} style={{ width: `${w}%` }} /> : null;
                })}
            </div>
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl bg-white/70 ring-1 ring-slate-100">
              {SPLIT.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-slate-700">{s.label}</span>
                      <span className="block text-[11px] text-slate-400">{s.help}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs tabular-nums">
                    <span className="block font-semibold text-[#0a174e]">{formatMoney(num(byKey, s.key), currency)}</span>
                    <span className="block text-[11px] text-slate-400">{pct(num(byKey, s.key), payable)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            data-tile-target={SECTION.reimbursement}
            onClick={() => scrollToSection(SECTION.reimbursement)}
            className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-semibold text-[#0A0082]/80 transition-colors hover:text-[#0A0082] focus:outline-none focus-visible:underline"
          >
            See the full reimbursement breakdown
            <ArrowDown size={13} aria-hidden="true" />
          </button>
        </div>

        {/* The four figures checked most; each opens the section that explains it */}
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-7">
          <Tile
            icon={ReceiptText}
            label="Total claimed"
            help="Everything you have submitted for reimbursement"
            value={formatMoney(claimed, currency)}
            hint={reportsHint}
            tone="navy"
            target={SECTION.journey}
            cta="Where are my reports?"
          />
          <Tile
            icon={BadgeCheck}
            label="Approved"
            help="Accepted by your manager and Finance"
            value={formatMoney(approved, currency)}
            hint={claimed > 0 ? `${pct(approved, claimed)}% of what you claimed` : "Nothing claimed yet"}
            tone="teal"
            target={SECTION.reimbursement}
            cta="View reimbursement"
          />
          <Tile
            icon={Wallet}
            label="Advance to account for"
            help="Cash advance not yet backed by submitted expenses"
            value={formatMoney(outstanding, currency)}
            hint={received > 0 ? `of ${formatMoney(received, currency)} advance received` : "No advance received"}
            tone="amber"
            target={SECTION.advance}
            cta="View cash advance"
          />
          <Tile
            icon={HandCoins}
            label="Waiting on you"
            help="Returned reports, drafts and settlements to finish"
            value={`${attentionCount} item${attentionCount === 1 ? "" : "s"}`}
            hint={overdue > 0 ? `${overdue} overdue settlement${overdue === 1 ? "" : "s"}` : attentionCount ? "Pending your action" : "Nothing pending"}
            tone="pink"
            highlight={attentionCount > 0}
            target={SECTION.needsYou}
            cta="Show me the list"
          />
        </div>
      </div>
    </section>
  );
}
