import React, { useState } from "react";
import { BadgeCheck, CalendarDays, Check, CheckCircle2, Copy, FilePen, Wallet, FileText, Landmark, MessageSquareText, Plane, ShieldCheck, UserCheck, XCircle } from "lucide-react";

// The top of a supplementary claim, laid out like the top of an expense report (ReportHeroCard): what it is, where it is
// now in plain words, how much it is for, what can be done, the key facts, and the five steps with the date of each.

const STEPS = [
  { label: "Draft", caption: "Expenses and receipts", icon: FilePen },
  { label: "Manager approval", caption: "Your reporting manager", icon: UserCheck },
  { label: "Finance approval", caption: "Finance checks it", icon: ShieldCheck },
  { label: "Payment", caption: "AP pays, or set against advance", icon: Landmark },
  { label: "Settled", caption: "Money received", icon: BadgeCheck },
];

/** Where a claim is: the current step, a tone, and the words for it. */
export function claimJourney(claim) {
  const s = claim?.status;
  const offsetOnly = Number(claim?.advanceOffsetAmount) > 0 && Number(claim?.advanceOffsetAmount) >= Number(claim?.totalAmount);
  switch (s) {
    case "DRAFT":
      return { step: 0, tone: "neutral", label: "Draft - not submitted", hint: "Add the missed expenses with receipts and submit" };
    case "CLARIFICATION_REQUIRED":
      return { step: 0, tone: "action", label: "Needs your changes", hint: "A reviewer asked for clarification - update and resubmit" };
    case "PENDING_MANAGER":
      return { step: 1, tone: "info", label: "With your manager", hint: "Waiting for your manager's decision" };
    case "MANAGER_REJECTED":
      return { step: 1, tone: "danger", label: "Rejected by your manager", hint: "See the reason in the history", stopped: true };
    case "PENDING_FINANCE":
      return { step: 2, tone: "violet", label: "With Finance", hint: "Finance is checking the expenses" };
    case "FINANCE_REJECTED":
      return { step: 2, tone: "danger", label: "Rejected by Finance", hint: "See the reason in the history", stopped: true };
    case "APPROVED":
    case "PAYMENT_PENDING":
      return { step: 3, tone: "payment", label: "Approved - awaiting payment", hint: "AP pays it to your bank" };
    case "SETTLED":
      return {
        step: 4, tone: "success", label: offsetOnly ? "Settled against your advance" : "Settled - paid",
        hint: offsetOnly ? "Taken from the carried-forward balance, nothing paid to your bank" : "Money received",
      };
    case "CANCELLED":
      return { step: 0, tone: "neutral", label: "Cancelled", hint: "This claim was withdrawn", stopped: true };
    default:
      return { step: 0, tone: "neutral", label: s || "Draft", hint: "" };
  }
}

const TONE = {
  neutral: { bar: "from-slate-400 to-slate-300", box: "border-slate-200 bg-slate-50 text-slate-700" },
  info: { bar: "from-blue-500 to-sky-400", box: "border-blue-200 bg-blue-50 text-blue-800" },
  violet: { bar: "from-violet-500 to-fuchsia-400", box: "border-violet-200 bg-violet-50 text-violet-800" },
  action: { bar: "from-orange-500 to-amber-400", box: "border-orange-200 bg-orange-50 text-orange-800" },
  payment: { bar: "from-[#0A0082] to-[#4f63c9]", box: "border-indigo-200 bg-indigo-50 text-indigo-800" },
  success: { bar: "from-emerald-500 to-teal-400", box: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  danger: { bar: "from-rose-500 to-[#ff7aa0]", box: "border-rose-200 bg-rose-50 text-rose-800" },
};

const fmtDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const claimMoney = (value, currency) => {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency || ""} ${n.toFixed(2)}`;
  }
};

function Fact({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0082]/[0.06] text-[#0A0082]">
        <Icon size={15} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`mt-0.5 break-words text-sm font-medium text-[#0a174e] ${mono ? "font-mono text-xs" : ""}`}>{value || "Not given"}</p>
      </div>
    </div>
  );
}

/** The date each step happened, from the claim's history (the newest entry that reached that step). */
function stepDates(claim) {
  const reached = (statuses) =>
    (claim.history || []).filter((h) => statuses.includes(h.newStatus)).map((h) => h.createdAt).sort().pop() || null;
  return [
    claim.createdAt,
    claim.submittedAt || reached(["PENDING_MANAGER"]),
    reached(["PENDING_FINANCE", "MANAGER_REJECTED"]),
    reached(["PAYMENT_PENDING", "APPROVED", "FINANCE_REJECTED"]),
    claim.settledAt || reached(["SETTLED"]),
  ];
}

function Tracker({ claim, journey }) {
  const dates = stepDates(claim);
  const current = journey.step;
  const finished = current === STEPS.length - 1;
  return (
    <ol className="grid grid-cols-5 gap-1" data-claim-tracker aria-label="Claim progress">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current || (finished && i === current);
        const isCurrent = i === current && !finished;
        const stopped = journey.stopped && i === current;
        const date = done || isCurrent ? fmtDate(dates[i]) : null;
        return (
          <li key={step.label} data-step={step.label} aria-current={isCurrent ? "step" : undefined} className="relative flex flex-col items-center text-center">
            {i < STEPS.length - 1 && (
              <span aria-hidden="true" className={`absolute left-1/2 top-[18px] h-0.5 w-full ${i < current ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
            <span
              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-white transition ${
                stopped
                  ? "bg-rose-500 text-white"
                  : done
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-[#0A0082] text-white shadow-[0_0_0_4px_rgba(10,0,130,0.15)]"
                      : "bg-slate-100 text-slate-400"
              }`}
            >
              {stopped ? <XCircle size={16} aria-hidden="true" /> : done ? <Check size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
            </span>
            <p className={`mt-2 text-xs font-semibold ${done || isCurrent ? "text-[#0a174e]" : "text-slate-400"}`}>{step.label}</p>
            <p className="hidden text-[11px] text-slate-400 sm:block">{step.caption}</p>
            {date && <p className={`mt-0.5 text-[11px] font-medium tabular-nums ${isCurrent ? "text-[#0A0082]" : "text-emerald-700"}`}>{date}</p>}
            {isCurrent && !date && <p className="mt-0.5 text-[11px] font-medium text-[#0A0082]">In progress</p>}
          </li>
        );
      })}
    </ol>
  );
}

const REASON_LABEL = {
  RECEIPT_RECEIVED_LATE: "Receipt received late",
  FORGOT_TO_SUBMIT: "Forgot to submit it in the report",
  NOT_AVAILABLE_IN_REPORT: "Expense was not in the report",
  OTHER: "Other",
};

export default function ClaimHeroCard({ claim, statusPill, actions, notice, employeeName }) {
  const [copied, setCopied] = useState(false);
  const journey = claimJourney(claim);
  const tone = TONE[journey.tone] || TONE.neutral;
  const count = claim.items?.length || 0;
  const trip =
    claim.reportTripStart || claim.reportTripEnd
      ? [fmtDate(claim.reportTripStart), fmtDate(claim.reportTripEnd)].filter(Boolean).join(" – ")
      : null;
  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(claim.claimNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  return (
    <section
      data-claim-hero
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)]"
    >
      <span aria-hidden="true" className={`block h-1.5 bg-gradient-to-r ${tone.bar}`} />
      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#0a174e]">Supplementary claim</h1>
              {statusPill}
            </div>
            <button
              type="button"
              onClick={copyNumber}
              title="Copy claim number"
              className="mt-1 inline-flex items-center gap-1.5 rounded-md font-mono text-xs text-slate-500 transition hover:text-[#0A0082]"
            >
              {claim.claimNumber}
              {copied ? <Check size={12} className="text-emerald-600" aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
            </button>
            <div className={`mt-3 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl border px-3 py-2 text-sm ${tone.box}`} data-claim-journey>
              <span className="font-semibold">{journey.label}</span>
              {journey.hint && <span className="text-xs opacity-80">· {journey.hint}</span>}
            </div>
            {notice}
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <div className="lg:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total claimed</p>
              <p className="text-3xl font-bold tabular-nums tracking-tight text-[#0a174e]" data-claim-total>
                {claimMoney(claim.totalAmount, claim.currencyCode)}
              </p>
              <p className="text-xs text-slate-500">
                {count} expense{count === 1 ? "" : "s"}
                {claim.status === "SETTLED" && <span className="font-semibold text-emerald-700"> · settled {fmtDate(claim.settledAt) || ""}</span>}
              </p>
            </div>
            {actions}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <Fact icon={FileText} label="Original report" value={claim.reportNumber} mono />
          <Fact icon={MessageSquareText} label="Why it was missed" value={claim.lateReasonText || REASON_LABEL[claim.lateReasonCode]} />
          <Fact icon={Plane} label="Trip / event dates" value={trip} />
          <Fact icon={CalendarDays} label={claim.submittedAt ? "Submitted" : "Created"} value={fmtDate(claim.submittedAt || claim.createdAt)} />
          {employeeName && <Fact icon={UserCheck} label="Employee" value={employeeName} />}
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50/80 px-2 py-4 sm:px-4">
          <Tracker claim={claim} journey={journey} />
        </div>
      </div>
    </section>
  );
}

/** The navy money summary, like the expense report's: total, expenses, receipts, and how it was or will be paid. */
export function ClaimMoneySummary({ claim, withReceipt, statusLabel }) {
  const cur = claim.currencyCode;
  const total = Number(claim.totalAmount) || 0;
  const offset = Number(claim.advanceOffsetAmount) || 0;
  const count = claim.items?.length || 0;
  const paid = claim.paymentStatus === "PAID" || claim.status === "SETTLED";
  const rows = [
    { label: "Expenses on this claim", value: count },
    { label: "With a receipt", value: `${withReceipt} of ${count}`, tone: withReceipt < count ? "text-amber-600" : "text-emerald-700" },
    ...(offset > 0
      ? [
          { label: "Set against your next advance", value: claimMoney(offset, cur), tone: "text-violet-700" },
          { label: "Paid by AP", value: claimMoney(Math.max(0, total - offset), cur), tone: "text-[#0a174e]" },
        ]
      : [{ label: paid ? "Paid by AP" : "To be paid by AP", value: claimMoney(total, cur), tone: paid ? "text-emerald-700" : "text-[#0a174e]" }]),
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)]" data-claim-summary>
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0A0082] via-[#18208f] to-[#2f3f9e] p-5 text-white">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/[0.07]" />
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Money summary</p>
          {statusLabel && <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[#0A0082]">{statusLabel}</span>}
        </div>
        <p className="relative mt-3 text-xs text-white/70">Total in {cur || "INR"}</p>
        <p className="relative text-3xl font-bold tabular-nums">{claimMoney(total, cur)}</p>
        <p className="relative text-xs text-white/70">across {count} expense{count === 1 ? "" : "s"}</p>
      </div>
      <div className="px-5 py-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
            <span className="text-xs font-medium text-slate-500">{r.label}</span>
            <span className={`text-sm font-bold tabular-nums ${r.tone || "text-gray-900"}`}>{r.value}</span>
          </div>
        ))}
        {offset > 0 && (
          <p className="pb-3 pt-1 text-[11px] leading-snug text-slate-500" data-settled-against-advance>
            The original advance's balance was carried forward, so this part was taken from what your next advance holds
            instead of being paid to your bank.
          </p>
        )}
        {/* Like the expense report's "Paid to you" card: shown once the money has actually been settled. */}
        {claim.paymentStatus === "PAID" && (
          <div className="mb-3 mt-2 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/70" data-claim-paid>
            <div className="flex items-center gap-2.5 border-b border-dashed border-emerald-200 px-3.5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-900">Paid to you</p>
                <p className="text-xs text-emerald-700">{claimMoney(Math.max(0, total - offset), cur)}</p>
              </div>
            </div>
            <dl className="space-y-1.5 px-3.5 py-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-emerald-700/80">Paid on</dt>
                <dd className="font-medium text-emerald-900">{fmtDate(claim.settledAt) || "Recorded by AP"}</dd>
              </div>
              {claim.paymentReference && (
                <div className="flex justify-between gap-3">
                  <dt className="text-emerald-700/80">Reference</dt>
                  <dd className="truncate font-mono font-medium text-emerald-900">{claim.paymentReference}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
        {claim.status === "SETTLED" && offset > 0 && offset >= total && (
          <div className="mb-3 mt-2 flex items-center gap-2.5 rounded-xl border border-violet-200 bg-violet-50/70 px-3.5 py-3" data-claim-offset-settled>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white">
              <Wallet size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-violet-900">Settled against your advance</p>
              <p className="text-xs text-violet-700">{claimMoney(offset, cur)} on {fmtDate(claim.settledAt) || "approval"} · nothing paid to your bank</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
