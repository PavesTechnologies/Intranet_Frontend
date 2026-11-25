import React from "react";
import { AlertTriangle, CheckCircle2, ReceiptText, Wallet } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { ANCHOR_CLASS, SECTION, anchorProps } from "./sectionAnchors";

// The employee's two ledgers. Each card leads with its closing figure (outstanding / payable) and how far along it is,
// then lists the figures top to bottom like a receipt: deductions marked with a minus, the result in a highlighted row,
// and a segmented bar showing what the result is made of. A footer checks that the parts add up.
// Every figure is the backend's. This file only arranges them and checks that the parts add up.

const num = (byKey, key) => (byKey[key] ? Number(byKey[key].value) : 0);
const share = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// Same meaning on both cards and in the summary banner: green = done, amber = waiting, grey = not started.
const COLOR = { done: "#1baf7a", waiting: "#eda100", idle: "#a8b3c7" };

function Amount({ byKey, kpi, currency, minus = false, plus = false, className = "" }) {
  const item = byKey[kpi];
  return (
    <p data-amount className={`whitespace-nowrap text-right tabular-nums ${className}`}>
      {item ? `${minus ? "− " : plus ? "+ " : ""}${formatMoney(item.value, currency)}` : "-"}
    </p>
  );
}

// `total` may be one key or several (summed). Keys in `optional` count as zero when the backend does not send them.
function Check({ title, total, parts, label, optional = [], byKey, currency }) {
  const value = (k) => (byKey[k] ? Number(byKey[k].value) : optional.includes(k) ? 0 : null);
  const totals = [].concat(total).map(value);
  const t = totals.some((v) => v === null) ? null : totals.reduce((a, b) => a + b, 0);
  const values = parts.map(value);
  const difference = t === null || values.some((v) => v === null) ? null : t - values.reduce((a, b) => a + b, 0);
  const ok = difference !== null && Math.abs(difference) < 0.005;
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <span
      data-check={title}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
      }`}
    >
      <Icon size={13} className="shrink-0" />
      <span className="truncate">
        {difference === null
          ? "Waiting for figures"
          : ok
            ? `Balanced: ${label}`
            : `Off by ${formatMoney(Math.abs(difference), currency)}: ${label}`}
      </span>
    </span>
  );
}

function Card({ ledger, byKey, currency, icon: Icon, tile, headline, anchor, children }) {
  return (
    <section {...(anchor ? anchorProps(anchor) : {})} className={`${ANCHOR_CLASS} flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)] sm:p-5`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tile}`}>
            <Icon size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-[#0a174e]">{ledger.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{ledger.caption}</p>
          </div>
        </div>
        {headline}
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mt-3 border-t border-slate-100 pt-3">
        <Check
          title={ledger.title}
          total={ledger.check.total}
          parts={ledger.check.parts}
          optional={ledger.check.optional}
          label={ledger.check.label}
          byKey={byKey}
          currency={currency}
        />
      </footer>
    </section>
  );
}

// The card's closing figure, top right: a label, the amount, and a progress note.
function Headline({ label, value, note, currency }) {
  return (
    <div className="text-right">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xl font-bold tabular-nums text-[#0a174e]">{formatMoney(value, currency)}</p>
      <p className="text-[11px] text-slate-500">{note}</p>
    </div>
  );
}

// One line of the receipt: label and note on the left, a dotted leader, then the amount on the right.
function Line({ kpi, label, note, byKey, currency, minus = false, plus = false, indent = false, muted = false, strong = false, result = false, dot, pct }) {
  return (
    <div
      data-kpi={kpi}
      className={`flex items-end gap-3 ${result ? "my-1 rounded-xl bg-[#0A0082]/[0.04] px-3 py-2" : "py-1.5"} ${indent ? "pl-2" : ""} ${muted ? "opacity-75" : ""}`}
    >
      <div className="flex min-w-0 shrink-0 items-start gap-2">
        {dot && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden="true" />}
        <div className="min-w-0">
          <p className={`text-sm ${result ? "font-semibold text-[#0A0082]" : strong ? "font-semibold text-slate-900" : "text-slate-700"}`}>
            {label}
            {pct !== undefined && <span className="ml-1.5 text-xs font-normal tabular-nums text-slate-400">{pct}%</span>}
          </p>
          {note && <p className="text-xs text-slate-400">{note}</p>}
        </div>
      </div>
      <span className="mb-1.5 min-w-6 flex-1 border-b border-dotted border-slate-300" aria-hidden="true" />
      <Amount
        byKey={byKey}
        kpi={kpi}
        currency={currency}
        minus={minus}
        plus={plus}
        className={
          result
            ? "text-lg font-bold text-[#0A0082]"
            : minus
              ? "text-sm text-rose-600"
              : strong
                ? "text-base font-semibold text-slate-900"
                : "text-sm text-slate-800"
        }
      />
    </div>
  );
}

// Segmented bar whose parts add up to `base`; segments are separated by a small gap.
function Bar({ parts, base, label }) {
  return (
    <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={label}>
      {base > 0 &&
        parts.map((p) => {
          const w = Math.min(100, Math.max(0, (p.value / base) * 100));
          return w > 0 ? (
            <div key={p.label} title={`${p.label}: ${Math.round(w)}%`} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${w}%`, background: p.color }} />
          ) : null;
        })}
    </div>
  );
}

function Legend({ parts, base }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
      {parts.map((p) => (
        <li key={p.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
          {p.label} <span className="font-semibold tabular-nums text-slate-700">{share(p.value, base)}%</span>
        </li>
      ))}
    </ul>
  );
}

const SectionLabel = ({ children }) => (
  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{children}</p>
);

export function CashAdvanceCard({ ledger, byKey, currency }) {
  const received = num(byKey, "caDisbursed");
  // Balance carried in from an earlier advance is held by the employee but was not paid out as cash, so the money to
  // account for is cash received plus carried in. That is what settled + outstanding add up to.
  const carriedIn = num(byKey, "caCarriedIn");
  const held = received + carriedIn;
  const unmatched = num(byKey, "caCarryUnmatched");
  const settled = num(byKey, "caSettled");
  const outstanding = num(byKey, "caOutstanding");
  const shared = { byKey, currency };
  const parts = [
    { label: "Settled", value: settled, color: COLOR.done },
    { label: "Outstanding", value: outstanding, color: COLOR.waiting },
  ];
  return (
    <Card
      ledger={ledger}
      byKey={byKey}
      currency={currency}
      icon={Wallet}
      anchor={SECTION.advance}
      tile="bg-amber-400/15 text-amber-700"
      headline={
        <Headline
          label="Outstanding"
          value={outstanding}
          currency={currency}
          note={held > 0 ? `${share(settled, held)}% of ${carriedIn > 0 ? "received and carried in" : "received"} is settled` : "No advance received yet"}
        />
      }
    >
      <div className="mt-3">
        <SectionLabel>{carriedIn > 0 ? "Received and carried in, split" : "Received, split"}</SectionLabel>
        <div className="mt-2">
          <Bar base={held} parts={parts} label={`Settled ${share(settled, held)}%, outstanding ${share(outstanding, held)}%`} />
          <Legend parts={parts} base={held} />
        </div>
      </div>

      <div className="mt-3 divide-y divide-dashed divide-slate-200">
        <div>
          <Line kpi="caRequested" label="Requested" note="What you asked for" muted {...shared} />
          <Line kpi="caApproved" label="Approved" note="Manager and Finance approved" muted {...shared} />
        </div>
        <div className="pt-1">
          <Line kpi="caDisbursed" label="Received" note="Paid out to you" strong {...shared} />
          {carriedIn > 0 && <Line kpi="caCarriedIn" label="Carried in" note="Balance moved from an earlier advance" plus {...shared} />}
          <Line kpi="caSettled" label="Settled" note="Verified expenses and refunds against your advances" minus dot={COLOR.done} {...shared} />
        </div>
        <div className="pt-1">
          <Line kpi="caOutstanding" label="Outstanding" note="Still to account for" result {...shared} />
        </div>
      </div>

      {/* Carried-in money must come from another of your advances. A gap means the records do not show where it came
          from, so the outstanding balance may be too high. Shown, never hidden, until Finance corrects the records. */}
      {Math.abs(unmatched) >= 0.005 && (
        <p data-carry-unmatched className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
          <span>
            <span className="font-semibold">{formatMoney(Math.abs(unmatched), currency)}</span>{" "}
            {unmatched > 0
              ? "was carried into your advances but is not recorded as carried out of any other advance, so your outstanding balance may be too high by this amount."
              : "was carried out of your advances but not into another advance."}{" "}
            Ask Finance to review the carry-forward on your advances.
          </span>
        </p>
      )}
    </Card>
  );
}

export function ReimbursementCard({ ledger, byKey, currency }) {
  const payable = num(byKey, "erPayable");
  const toSend = num(byKey, "erToSendAp");
  const waiting = num(byKey, "erPendingAp");
  const paid = num(byKey, "erPaid");
  const shared = { byKey, currency };
  const parts = [
    { label: "Paid", value: paid, color: COLOR.done },
    { label: "Waiting for AP", value: waiting, color: COLOR.waiting },
    { label: "Not yet with AP", value: toSend, color: COLOR.idle },
  ];
  return (
    <Card
      ledger={ledger}
      byKey={byKey}
      currency={currency}
      icon={ReceiptText}
      anchor={SECTION.reimbursement}
      tile="bg-[#0A0082]/10 text-[#0A0082]"
      headline={
        <Headline
          label="Payable to you"
          value={payable}
          currency={currency}
          note={payable > 0 ? `${share(paid, payable)}% already paid` : "Nothing payable yet"}
        />
      }
    >
      <div className="mt-4 divide-y divide-dashed divide-slate-200">
        <div>
          <Line kpi="erClaimed" label="Claimed" note="Everything you submitted" strong {...shared} />
          <Line kpi="erNotApproved" label="Not approved yet" note="Pending, returned or rejected" minus {...shared} />
        </div>
        <div className="pt-1">
          <Line kpi="erApproved" label="Approved" note="Approved for reimbursement" strong {...shared} />
          <Line kpi="erAdvanceOffset" label="Covered by advance" note="Set against your cash advance" minus {...shared} />
          {num(byKey, "erNoPaymentDue") > 0 && (
            <Line kpi="erNoPaymentDue" label="No payment due" note="Approved, nothing reimbursable, no advance involved" minus {...shared} />
          )}
        </div>
        <div className="pt-1">
          <Line kpi="erPayable" label="Payable to you" note="What AP will pay you" result {...shared} />
        </div>
      </div>

      <div className="mt-3">
        <SectionLabel>Payable, by where it is</SectionLabel>
        <div className="mt-2">
          <Bar base={payable} parts={parts} label={`Paid ${share(paid, payable)}%, waiting for AP ${share(waiting, payable)}%, not yet with AP ${share(toSend, payable)}%`} />
        </div>
        <div className="mt-2 divide-y divide-slate-100">
          <Line kpi="erToSendAp" label="Not yet with AP" note="Approved, not sent to AP yet" indent dot={COLOR.idle} pct={share(toSend, payable)} {...shared} />
          <Line kpi="erPendingAp" label="Waiting for AP" note="Sent to AP, not paid yet" indent dot={COLOR.waiting} pct={share(waiting, payable)} {...shared} />
          <Line kpi="erPaid" label="Paid" note="Already paid to you" indent dot={COLOR.done} pct={share(paid, payable)} {...shared} />
        </div>
      </div>
    </Card>
  );
}

export default function EmployeeLedgers({ ledgers, byKey, currency }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <CashAdvanceCard ledger={ledgers.advance} byKey={byKey} currency={currency} />
      <ReimbursementCard ledger={ledgers.reimbursement} byKey={byKey} currency={currency} />
    </div>
  );
}
