import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ReceiptText, Sigma, Wallet } from "lucide-react";
import { formatMoney } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { ANCHOR_CLASS, SECTION, anchorProps } from "./sectionAnchors";

// The employee's ledgers, one per money flow, then the total of both:
//   Direct expenses: bills not linked to an advance, paid back to the bank       (dr* figures)
//   Cash advance:    the advance money, and the bills settled against it          (ca* and av* figures)
//   Total:           direct + advance                                             (er* figures)
// Each card reads like a receipt: deductions marked with a minus, the result in a highlighted row, and a footer that
// checks the parts add up. Every figure is the backend's. This file only arranges them and checks the sums.

const num = (byKey, key) => (byKey[key] ? Number(byKey[key].value) || 0 : 0);
const sumOf = (byKey, keys) => (keys.every((k) => byKey[k]) ? keys.reduce((a, k) => a + num(byKey, k), 0) : null);
const share = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const differs = (a, b) => Math.abs(a - b) >= 0.005;

// Same meaning on every card and in the summary banner: green = done, amber = waiting, grey = not started.
const COLOR = { done: "#1baf7a", returned: "#5fd0a5", waiting: "#eda100", idle: "#a8b3c7" };

function Amount({ value, currency, minus = false, plus = false, className = "" }) {
  return (
    <p data-amount className={`whitespace-nowrap text-right tabular-nums ${className}`}>
      {value === null || value === undefined ? "-" : `${minus ? "− " : plus ? "+ " : ""}${formatMoney(value, currency)}`}
    </p>
  );
}

// A footer check: total = sum of parts. Says "Balanced" or by how much it is off; never hides a difference.
// `minus` lists parts that are taken away rather than added.
function Check({ id, total, parts, minus = [], label, byKey, currency }) {
  const t = byKey[total] ? Number(byKey[total].value) : null;
  const added = sumOf(byKey, parts);
  const taken = sumOf(byKey, minus);
  const s = added === null || taken === null ? null : added - taken;
  const difference = t === null || s === null ? null : t - s;
  const ok = difference !== null && !differs(difference, 0);
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <span
      data-check={id}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
      }`}
    >
      <Icon size={13} className="shrink-0" />
      <span className="truncate">
        {difference === null ? "Waiting for figures" : ok ? `Balanced: ${label}` : `Off by ${formatMoney(Math.abs(difference), currency)}: ${label}`}
      </span>
    </span>
  );
}

// An amber note explaining a data problem in plain words, with who should fix it.
const Warning = ({ children, ...rest }) => (
  <p {...rest} className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
    <span>{children}</span>
  </p>
);

function Card({ ledger, byKey, currency, icon: Icon, tile, headline, anchor, warnings = null, className = "", children }) {
  return (
    <section
      {...anchorProps(anchor)}
      data-ledger={anchor}
      className={`${ANCHOR_CLASS} flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(10,0,130,0.04),0_10px_30px_-18px_rgba(10,0,130,0.18)] sm:p-5 ${className}`}
    >
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
      <footer className="mt-3 space-y-2 border-t border-slate-100 pt-3">
        {warnings}
        <div className="flex flex-wrap gap-2">
          {(ledger.checks || []).map((c) => (
            <Check key={c.label} id={`${ledger.title}: ${c.label}`} {...c} byKey={byKey} currency={currency} />
          ))}
        </div>
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
// `value` overrides the figure for a line that adds two backend figures together.
function Line({ kpi, label, note, byKey, currency, value, minus = false, plus = false, indent = false, muted = false, strong = false, result = false, dot, pct }) {
  const v = value !== undefined ? value : byKey[kpi] ? Number(byKey[kpi].value) : null;
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
        value={v}
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
function Bar({ parts, base }) {
  const label = parts.map((p) => `${p.label} ${share(p.value, base)}%`).join(", ");
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

// A small link that opens or closes the detail rows of a block. The block's closing line is always shown.
function FoldToggle({ open, onToggle, label, controls }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className="mb-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-[#0A0082] hover:bg-[#0A0082]/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/30"
    >
      {open ? "Hide" : label}
      <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
  );
}

const SectionLabel = ({ children }) => <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{children}</p>;

// Where the money payable to the bank is now: not yet with AP, waiting for AP, paid. `px` is "dr", "av" or "er".
function BankSplit({ px, byKey, currency }) {
  const payable = num(byKey, `${px}Payable`);
  const toSend = num(byKey, `${px}ToSendAp`);
  const waiting = num(byKey, `${px}PendingAp`);
  const paid = num(byKey, `${px}Paid`);
  const shared = { byKey, currency };
  const parts = [
    { label: "Paid", value: paid, color: COLOR.done },
    { label: "Waiting for AP", value: waiting, color: COLOR.waiting },
    { label: "Not yet with AP", value: toSend, color: COLOR.idle },
  ];
  return (
    <div className="mt-2">
      <Bar base={payable} parts={parts} />
      <div className="mt-1 divide-y divide-slate-100">
        <Line kpi={`${px}ToSendAp`} label="Not yet with AP" note="Approved, not sent to AP yet" indent dot={COLOR.idle} pct={share(toSend, payable)} {...shared} />
        <Line kpi={`${px}PendingAp`} label="Waiting for AP" note="Sent to AP, not paid yet" indent dot={COLOR.waiting} pct={share(waiting, payable)} {...shared} />
        <Line kpi={`${px}Paid`} label="Paid" note="In your bank account" indent dot={COLOR.done} pct={share(paid, payable)} {...shared} />
      </div>
    </div>
  );
}

// ---- Direct expenses: claimed -> approved -> paid to your bank.
export function DirectExpenseCard({ ledger, byKey, currency }) {
  const payable = num(byKey, "drPayable");
  const paid = num(byKey, "drPaid");
  const shared = { byKey, currency };
  return (
    <Card
      ledger={ledger}
      byKey={byKey}
      currency={currency}
      icon={ReceiptText}
      anchor={SECTION.direct}
      tile="bg-[#0A0082]/10 text-[#0A0082]"
      headline={
        <Headline label="To your bank" value={payable} currency={currency} note={payable > 0 ? `${share(paid, payable)}% already paid` : "Nothing approved yet"} />
      }
    >
      <div className="mt-4 divide-y divide-dashed divide-slate-200">
        <div>
          <Line kpi="drClaimed" label="Claimed" note="Bills you submitted" strong {...shared} />
          <Line kpi="drNotApproved" label="Not approved yet" note="Pending, returned or rejected" minus {...shared} />
        </div>
        <div className="pt-1">
          <Line kpi="drPayable" label="Approved, to your bank" note="AP pays all of it to you" result {...shared} />
        </div>
      </div>
      <div className="mt-3">
        <SectionLabel>Where it is now</SectionLabel>
        <BankSplit px="dr" {...shared} />
      </div>
    </Card>
  );
}

// ---- Cash advance: the advance money, then the bills settled against it.
export function CashAdvanceCard({ ledger, byKey, currency }) {
  const received = num(byKey, "caDisbursed");
  const used = num(byKey, "caUsedOnBills");
  const returned = num(byKey, "caReturned");
  const carried = num(byKey, "caCarriedForward");
  const carriedIn = num(byKey, "caCarriedIn");
  // Carried-in balance inside advances already paid out: held by you, but never new cash, so not in "received".
  const carriedInReceived = num(byKey, "caCarriedInReceived");
  const awaiting = num(byKey, "caAwaitingApproval");
  const reduced = num(byKey, "caReducedOnApproval");
  const increased = num(byKey, "caIncreasedOnApproval");
  // The request form's total already includes the earlier balance (new cash + carried in), and the backend's "approved"
  // includes it too. So "Requested" shows that same total as one figure: never below approved unless increased.
  const requestedTotal = byKey.caRequested ? num(byKey, "caRequested") + carriedIn : null;
  // Approved new cash not yet paid out (approved advances awaiting disbursement, or paid out short).
  const notPaidOut = byKey.caApproved && byKey.caDisbursed ? num(byKey, "caApproved") - carriedIn - received : 0;
  const outstanding = num(byKey, "caOutstanding");
  const fromAdvance = num(byKey, "avAdvanceOffset");
  const extra = num(byKey, "avPayable");
  const gap = num(byKey, "caRecordGap");
  // Carried in with no matching carry-out on the records (0 when the backend does not send it).
  const unmatched = num(byKey, "caCarryUnmatched");
  const shared = { byKey, currency };
  // The approval steps and the bills against the advance fold away, so the card leads with where the money went.
  // Folded rows stay in the page (hidden); each block's closing line, the checks and the warnings are always shown.
  const [showApproval, setShowApproval] = useState(false);
  const [showBills, setShowBills] = useState(false);
  const parts = [
    { label: "Used on bills", value: used, color: COLOR.done },
    { label: "Returned", value: returned, color: COLOR.returned },
    ...(carried > 0 ? [{ label: "Carried forward", value: carried, color: COLOR.idle }] : []),
    { label: "Still to settle", value: outstanding, color: COLOR.waiting },
  ];
  const warnings = (
    <>
      {differs(gap, 0) && (
        <Warning data-record-gap>
          Advance records differ by <b className="tabular-nums">{formatMoney(Math.abs(gap), currency)}</b>: the amount recorded as paid out
          does not match the approved advance. Ask Finance to correct it.
        </Warning>
      )}
      {byKey.caUsedOnBills && byKey.avAdvanceOffset && differs(used, fromAdvance) && (
        <Warning data-offset-mismatch>
          Advance records show <b className="tabular-nums">{formatMoney(used, currency)}</b> used on bills, but your reports show{" "}
          <b className="tabular-nums">{formatMoney(fromAdvance, currency)}</b> paid from advance. Ask Finance to check.
        </Warning>
      )}
    </>
  );
  return (
    <Card
      ledger={ledger}
      byKey={byKey}
      currency={currency}
      icon={Wallet}
      anchor={SECTION.advance}
      tile="bg-amber-400/15 text-amber-700"
      warnings={warnings}
      headline={
        <Headline
          label="Still to settle"
          value={outstanding}
          currency={currency}
          note={received > 0 ? `${share(received + carriedInReceived - outstanding, received + carriedInReceived)}% of received is accounted for` : "No advance received yet"}
        />
      }
    >
      <div className="mt-3">
        <SectionLabel>Advance money, where it went</SectionLabel>
        <div className="mt-2">
          <Bar base={received + carriedInReceived} parts={parts} />
          <Legend parts={parts} base={received + carriedInReceived} />
        </div>
      </div>

      <div className="mt-3 divide-y divide-dashed divide-slate-200">
        <div>
          <div id="ca-approval-steps" hidden={!showApproval}>
            <Line
              kpi="caRequested"
              label="Requested"
              note={carriedIn > 0 ? `What you asked for, including ${formatMoney(carriedIn, currency)} from your earlier advance` : "What you asked for"}
              value={requestedTotal}
              muted
              {...shared}
            />
            {awaiting > 0 && (
              <Line kpi="caAwaitingApproval" label="Awaiting approval" note="Still with your manager or Finance" minus muted {...shared} />
            )}
            {reduced > 0 && (
              <Line kpi="caReducedOnApproval" label="Reduced on approval" note="Approver approved less than you asked" minus muted {...shared} />
            )}
            {increased > 0 && (
              <Line kpi="caIncreasedOnApproval" label="Increased on approval" note="Approved more than you asked" plus muted {...shared} />
            )}
          </div>
          <Line kpi="caApproved" label="Approved" note="Manager and Finance approved" muted {...shared} />
          <FoldToggle open={showApproval} onToggle={() => setShowApproval((v) => !v)} label="How was this approved?" controls="ca-approval-steps" />
        </div>
        <div className="pt-1">
          {differs(notPaidOut, 0) && notPaidOut > 0 && (
            <Line kpi="caNotPaidOut" label="Not yet paid out" note="Approved, still to be paid to you" value={notPaidOut} minus muted {...shared} />
          )}
          <Line kpi="caDisbursed" label="Received" note="Advance paid out to you" strong {...shared} />
          {carriedInReceived > 0 && (
            <Line kpi="caCarriedInReceived" label="Carried in" note="Balance moved over from your earlier advance" plus {...shared} />
          )}
          <Line kpi="caUsedOnBills" label="Used on bills" note="Approved bills paid from it" minus dot={COLOR.done} {...shared} />
          <Line kpi="caReturned" label="Returned by you" note="Cash you paid back" minus dot={COLOR.returned} {...shared} />
          {carried > 0 && <Line kpi="caCarriedForward" label="Carried forward" note="Moved to your next advance" minus dot={COLOR.idle} {...shared} />}
        </div>
        <div className="pt-1">
          <Line kpi="caOutstanding" label="Still to settle" note="Submit bills or return this" result {...shared} />
        </div>
      </div>

      <div className="mt-4">
        <SectionLabel>Bills against your advance</SectionLabel>
        <div className="mt-1 divide-y divide-dashed divide-slate-200">
          <div id="ca-bill-lines" hidden={!showBills}>
            <Line kpi="avClaimed" label="Claimed" note="Bills linked to an advance" muted {...shared} />
            <Line kpi="avApproved" label="Approved" note="Approved bills" strong {...shared} />
            <Line kpi="avAdvanceOffset" label="Paid from advance" note="Not paid to your bank" minus {...shared} />
          </div>
          <div className="pt-1">
            <Line kpi="avPayable" label="Extra, to your bank" note="Bills above your advance" result {...shared} />
          </div>
        </div>
        {extra > 0 && (
          <div id="ca-bill-split" hidden={!showBills}>
            <BankSplit px="av" {...shared} />
          </div>
        )}
        <FoldToggle
          open={showBills}
          onToggle={() => setShowBills((v) => !v)}
          label="Show bills"
          controls={extra > 0 ? "ca-bill-lines ca-bill-split" : "ca-bill-lines"}
        />
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

// ---- Total: both flows added together.
export function TotalCard({ ledger, byKey, currency }) {
  const shared = { byKey, currency };
  const pending = sumOf(byKey, ["erToSendAp", "erPendingAp"]);
  return (
    <Card
      ledger={ledger}
      byKey={byKey}
      currency={currency}
      icon={Sigma}
      anchor={SECTION.total}
      tile="bg-emerald-500/10 text-emerald-700"
      className="xl:col-span-2"
      headline={
        <Headline
          label="Total approved"
          value={num(byKey, "erApproved")}
          currency={currency}
          note={`${formatMoney(num(byKey, "erAdvanceOffset"), currency)} from advance · ${formatMoney(num(byKey, "erPayable"), currency)} to bank`}
        />
      }
    >
      <div className="mt-4 grid gap-x-8 gap-y-2 lg:grid-cols-2">
        <div className="divide-y divide-dashed divide-slate-200">
          <SectionLabel>Approved, by flow</SectionLabel>
          <div className="pt-1">
            <Line kpi="drApproved" label="Direct expenses" note="Approved, not linked to an advance" {...shared} />
            <Line kpi="avApproved" label="Against your advance" note="Approved, linked to an advance" plus {...shared} />
          </div>
          <div className="pt-1">
            <Line kpi="erApproved" label="Total approved" note="Direct + against advance" result {...shared} />
          </div>
        </div>
        <div className="divide-y divide-dashed divide-slate-200">
          <SectionLabel>How it was paid</SectionLabel>
          <div className="pt-1">
            <Line kpi="erAdvanceOffset" label="Paid from advance" note="Used your cash advance" dot={COLOR.done} {...shared} />
            <Line kpi="erPaid" label="Paid to your bank" note="Direct + extra above advance" dot={COLOR.done} {...shared} />
            <Line kpi="erPending" label="On its way to your bank" note="Approved, not paid yet" dot={COLOR.waiting} value={pending} {...shared} />
          </div>
          <div className="pt-1">
            <Line kpi="caOutstanding" label="Advance still to settle" note="Submit bills or return this" muted {...shared} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function EmployeeLedgers({ ledgers, byKey, currency }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <DirectExpenseCard ledger={ledgers.direct} byKey={byKey} currency={currency} />
      <CashAdvanceCard ledger={ledgers.advance} byKey={byKey} currency={currency} />
      <TotalCard ledger={ledgers.total} byKey={byKey} currency={currency} />
    </div>
  );
}
