import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";

// The employee's two ledgers, laid out as receipts: each card lists its figures top to bottom with dotted leaders,
// deductions are marked with a minus, the result sits below a rule, and a single bar shows what the result is made of.
// Every figure is the backend's. This file only arranges them and checks that the parts add up.

const num = (byKey, key) => (byKey[key] ? Number(byKey[key].value) : 0);

function Amount({ byKey, kpi, currency, minus = false, className = "" }) {
  const item = byKey[kpi];
  return (
    <p data-amount className={`whitespace-nowrap text-right tabular-nums ${className}`}>
      {item ? `${minus ? "− " : ""}${formatMoney(item.value, currency)}` : "-"}
    </p>
  );
}

function Check({ title, total, parts, label, byKey, currency }) {
  const t = byKey[total] ? Number(byKey[total].value) : null;
  const values = parts.map((k) => (byKey[k] ? Number(byKey[k].value) : null));
  const difference = t === null || values.some((v) => v === null) ? null : t - values.reduce((a, b) => a + b, 0);
  const ok = difference !== null && Math.abs(difference) < 0.005;
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <span
      data-check={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
      }`}
    >
      <Icon size={13} />
      {difference === null
        ? "Waiting for figures"
        : ok
          ? `Balanced: ${label}`
          : `Off by ${formatMoney(Math.abs(difference), currency)}: ${label}`}
    </span>
  );
}

function Card({ ledger, byKey, currency, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{ledger.title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{ledger.caption}</p>
        </div>
        <Check
          title={ledger.title}
          total={ledger.check.total}
          parts={ledger.check.parts}
          label={ledger.check.label}
          byKey={byKey}
          currency={currency}
        />
      </header>
      {children}
    </section>
  );
}

// One line of the receipt: label and note on the left, a dotted leader, then the amount on the right.
function Line({ kpi, label, note, byKey, currency, minus = false, indent = false, muted = false, strong = false, result = false }) {
  return (
    <div data-kpi={kpi} className={`flex items-end gap-3 py-2 ${indent ? "pl-5" : ""} ${muted ? "opacity-70" : ""}`}>
      <div className="min-w-0 shrink-0">
        <p className={`text-sm ${strong ? "font-semibold text-slate-900" : "text-slate-700"} ${result ? "text-teal-900" : ""}`}>
          {label}
        </p>
        {note && <p className="text-xs text-slate-400">{note}</p>}
      </div>
      <span className="mb-1.5 min-w-6 flex-1 border-b border-dotted border-slate-300" aria-hidden="true" />
      <Amount
        byKey={byKey}
        kpi={kpi}
        currency={currency}
        minus={minus}
        className={
          result
            ? "text-lg font-bold text-teal-900"
            : strong
              ? "text-base font-semibold text-slate-900"
              : "text-sm text-slate-800"
        }
      />
    </div>
  );
}

// Horizontal bar whose segments add up to `base`.
function Bar({ parts, base }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
      {parts.map((p) => (
        <div
          key={p.label}
          className={p.color}
          style={{ width: `${base > 0 ? Math.min(100, Math.max(0, (p.value / base) * 100)) : 0}%` }}
        />
      ))}
    </div>
  );
}

const SectionLabel = ({ children }) => (
  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{children}</p>
);

export function CashAdvanceCard({ ledger, byKey, currency }) {
  const received = num(byKey, "caDisbursed");
  const settled = num(byKey, "caSettled");
  const outstanding = num(byKey, "caOutstanding");
  const shared = { byKey, currency };
  return (
    <Card ledger={ledger} byKey={byKey} currency={currency}>
      <div className="mt-5 divide-y divide-dashed divide-slate-200">
        <div>
          <Line kpi="caRequested" label="Requested" note="What you asked for" muted {...shared} />
          <Line kpi="caApproved" label="Approved" note="Manager and Finance approved" muted {...shared} />
        </div>
        <div className="pt-1">
          <Line kpi="caDisbursed" label="Received" note="Paid out to you" strong {...shared} />
          <Line kpi="caSettled" label="Settled" note="Verified expenses and refunds against your advances" minus {...shared} />
        </div>
        <div className="pt-1">
          <Line kpi="caOutstanding" label="Outstanding" note="Still to account for" result {...shared} />
        </div>
      </div>

      <div className="mt-5">
        <SectionLabel>Received, split</SectionLabel>
        <div className="mt-2">
          <Bar
            base={received}
            parts={[
              { label: "Settled", value: settled, color: "bg-teal-400" },
              { label: "Outstanding", value: outstanding, color: "bg-amber-400" },
            ]}
          />
        </div>
      </div>
    </Card>
  );
}

export function ReimbursementCard({ ledger, byKey, currency }) {
  const payable = num(byKey, "erPayable");
  const toSend = num(byKey, "erToSendAp");
  const waiting = num(byKey, "erPendingAp");
  const paid = num(byKey, "erPaid");
  const shared = { byKey, currency };
  return (
    <Card ledger={ledger} byKey={byKey} currency={currency}>
      <div className="mt-5 divide-y divide-dashed divide-slate-200">
        <div>
          <Line kpi="erClaimed" label="Claimed" note="Everything you submitted" strong {...shared} />
          <Line kpi="erNotApproved" label="Not approved yet" note="Pending, returned or rejected" minus {...shared} />
        </div>
        <div className="pt-1">
          <Line kpi="erApproved" label="Approved" note="Approved for reimbursement" strong {...shared} />
          <Line kpi="erAdvanceOffset" label="Covered by advance" note="Set against your cash advance" minus {...shared} />
        </div>
        <div className="pt-1">
          <Line kpi="erPayable" label="Payable to you" note="What AP will pay you" result {...shared} />
        </div>
      </div>

      <div className="mt-5">
        <SectionLabel>Payable, by where it is</SectionLabel>
        <div className="mt-2">
          <Bar
            base={payable}
            parts={[
              { label: "Not yet with AP", value: toSend, color: "bg-slate-300" },
              { label: "Waiting for AP", value: waiting, color: "bg-amber-300" },
              { label: "Paid", value: paid, color: "bg-emerald-500" },
            ]}
          />
        </div>
        <div className="mt-2 divide-y divide-slate-100">
          <Line kpi="erToSendAp" label="Not yet with AP" note="Approved, not sent to AP yet" indent {...shared} />
          <Line kpi="erPendingAp" label="Waiting for AP" note="Sent to AP, not paid yet" indent {...shared} />
          <Line kpi="erPaid" label="Paid" note="Already paid to you" indent {...shared} />
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
