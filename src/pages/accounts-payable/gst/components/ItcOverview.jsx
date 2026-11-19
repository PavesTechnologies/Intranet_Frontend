import clsx from "clsx";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { MATCH_GROUPS, NEXT_STEPS, RECON_STAGE_STATE, WORKFLOW_STAGES, filingSpec, importSpec } from "../../constants/gstItc";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { useGstWorkflow, useGstr2bSummary } from "../hooks/useGstItc";
import { inrOrDash, periodLabel } from "../utils/gstFormat";
import { ErrorBlock, LoadingBlock, SectionCard, StatusPill } from "./GstUi";

const total = (parts) => inrOrDash(parts?.total);

function Figure({ label, value, hint, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <dt className="text-slate-500">{label}</dt>
      <dd className={clsx("text-right tabular-nums", strong ? "font-semibold text-slate-900" : "text-slate-700")}>
        {value}{hint && <span className="block text-[10px] font-normal text-slate-400">{hint}</span>}
      </dd>
    </div>
  );
}

const NOT_IMPORTED = ["NOT_IMPORTED", "FAILED"];

/**
 * The matching stage's state, from what the backend returned - never from the counts' values:
 *   NOT_IMPORTED  no (successful) GSTR-2B import - the zero counts mean "not matched yet", not "nothing to match"
 *   PENDING       an import exists but the response carries no match-group results
 *   REVIEW        the backend's next step is to resolve the reconciliation
 *   COMPLETED     imported and matched; the next step is past matching
 */
export function reconciliationState(w) {
  const status = w?.gstr2b_import?.import_status;
  if (!status || NOT_IMPORTED.includes(status)) return "NOT_IMPORTED";
  const r = w.reconciliation;
  if (!r || MATCH_GROUPS.some((g) => r[g.countKey] === undefined || r[g.countKey] === null)) return "PENDING";
  if (w.next_step === "RESOLVE_RECONCILIATION") return "REVIEW";
  return "COMPLETED";
}

/**
 * AP invoices of the period waiting for the GSTR-2B: `total_ap_invoices` of GET /gstr2b/matches/summary (the
 * workflow does not carry it). Rendered - and so requested - only while the GSTR-2B is not imported; the query is
 * shared with the reconciliation tab. Nothing is shown when the backend gives no count.
 */
function AwaitingInvoices({ period }) {
  const { data, isLoading } = useGstr2bSummary(period, "OFFICIAL");
  if (isLoading) return <p className="text-[11px] text-slate-400">Counting AP invoices...</p>;
  const n = data?.total_ap_invoices;
  if (n === undefined || n === null) return null;
  return (
    <p className="text-xs text-slate-700">
      <span className="font-semibold tabular-nums">{n}</span> AP invoice(s) awaiting reconciliation
    </p>
  );
}

function ReconciliationStage({ w, period, onSelectGroup, onSelectStatus }) {
  const state = reconciliationState(w);
  const r = w.reconciliation || {};
  const i = w.gstr2b_import || {};
  if (state === "NOT_IMPORTED") {
    return (
      <>
        <div><StatusPill spec={RECON_STAGE_STATE.NOT_IMPORTED} /></div>
        <AwaitingInvoices period={period} />
        {i.available_from && <p className="text-[11px] text-slate-500">GSTR-2B expected from {formatDate(i.available_from)}</p>}
        <p className="text-[11px] text-slate-400">
          {i.import_status === "FAILED" ? "The last import failed. " : ""}Matching starts after the GSTR-2B is imported.
        </p>
      </>
    );
  }
  if (state === "PENDING") {
    return (
      <>
        <div><StatusPill spec={RECON_STAGE_STATE.PENDING} /></div>
        <p className="text-[11px] text-slate-500">GSTR-2B imported - the matching results are not available yet.</p>
      </>
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill spec={RECON_STAGE_STATE[state]} />
        <span className="text-[10px] text-slate-400">{r.total_records ?? "—"} GSTR-2B record(s)</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {MATCH_GROUPS.map((g) => (
          <button key={g.value} type="button" onClick={() => onSelectGroup(g.value)} title={g.hint}
            className="rounded-md border border-slate-200 px-2 py-1 text-left hover:border-indigo-300 hover:bg-indigo-50/40 focus:outline-none focus:ring-2 focus:ring-[#0A0082]/20">
            <span className="block text-[10px] text-slate-500">{g.label}</span>
            <span className={clsx("text-sm font-semibold tabular-nums",
              g.value !== "MATCHED" && Number(r[g.countKey]) > 0 ? "text-amber-600" : "text-slate-800")}>{r[g.countKey]}</span>
          </button>
        ))}
      </div>
      {r.missing_in_gstr2b !== undefined && r.missing_in_gstr2b !== null && (
        <button type="button" onClick={() => onSelectStatus("MISSING_IN_GSTR2B")}
          className="flex items-baseline justify-between gap-2 rounded-md border border-dashed border-slate-200 px-2 py-1 text-left text-[11px] hover:border-indigo-300">
          <span className="text-slate-500">AP invoices missing in GSTR-2B</span>
          <span className={clsx("font-semibold tabular-nums", Number(r.missing_in_gstr2b) > 0 ? "text-rose-600" : "text-slate-800")}>
            {r.missing_in_gstr2b}
          </span>
        </button>
      )}
    </>
  );
}

/** Each stage's figures, exactly as GET /itc/workflow returned them - nothing is added up here. */
function StageBody({ stage, w, period, onSelectGroup, onSelectStatus }) {
  switch (stage.key) {
    case "gstr2b_import": {
      const i = w.gstr2b_import || {};
      return (
        <>
          <div><StatusPill spec={importSpec(i.import_status)} /></div>
          {i.import_status === "NOT_IMPORTED" ? (
            <p className="text-xs text-slate-500">{i.available_from ? `Available on the portal from ${formatDate(i.available_from)}` : "Not imported yet"}</p>
          ) : (
            <dl className="space-y-1">
              <Figure label="Records" value={`${i.accepted_records ?? "—"} / ${i.total_records ?? "—"}`} />
              <Figure label="GST in GSTR-2B" value={inrOrDash(i.total_gst)} strong />
              {i.imported_at && <p className="text-[10px] text-slate-400">{formatDateTime(i.imported_at)}</p>}
            </dl>
          )}
        </>
      );
    }
    case "reconciliation":
      return <ReconciliationStage w={w} period={period} onSelectGroup={onSelectGroup} onSelectStatus={onSelectStatus} />;
    case "itc_eligibility": {
      const e = w.itc_eligibility || {};
      return (
        <dl className="space-y-1">
          <Figure label="Eligible" value={total(e.eligible_itc)} strong />
          <Figure label="Pending review" value={total(e.pending_itc)}
            hint={Number(e.awaiting_finance_confirmation_itc?.total) > 0 ? `${total(e.awaiting_finance_confirmation_itc)} awaiting Finance` : null} />
          <Figure label="Ineligible" value={total(e.ineligible_itc)} />
        </dl>
      );
    }
    case "approval": {
      const a = w.approval || {};
      return (
        <dl className="space-y-1">
          <Figure label="Approved" value={total(a.approved_itc)} hint={a.counts ? `${a.counts.approved} invoice(s)` : null} strong />
          <Figure label="Pending approval" value={total(a.pending_approval_itc)} hint={a.counts ? `${a.counts.pending_approval} to approve · ${a.counts.under_review} under review` : null} />
          <Figure label="Rejected" value={total(a.rejected_itc)} />
        </dl>
      );
    }
    case "itc_register": {
      const g = w.itc_register || {};
      return (
        <dl className="space-y-1">
          <Figure label="Identified" value={total(g.total_itc_identified)} />
          <Figure label="Claimed" value={total(g.total_claimed_itc)} strong />
          <Figure label="Remaining claimable" value={total(g.remaining_claimable_itc)} />
        </dl>
      );
    }
    case "gstr3b_claim": {
      const c = w.gstr3b_claim || {};
      return (
        <>
          <div><StatusPill spec={filingSpec(c.filing_status)} /></div>
          <dl className="space-y-1">
            <Figure label="Ready to claim" value={total(c.ready_for_claim_itc)} />
            {Number(c.in_filing_awaiting_verification_itc?.total) > 0 && (
              <Figure label="Awaiting verification" value={total(c.in_filing_awaiting_verification_itc)} />
            )}
            <Figure label="Claimed" value={total(c.claimed_itc)} strong />
            {c.due_date && <p className="text-[10px] text-slate-400">Due {formatDate(c.due_date)}</p>}
          </dl>
        </>
      );
    }
    default:
      return null;
  }
}

/**
 * The period's GST input credit workflow (GET /itc/workflow): six stages with the backend's figures, and the
 * backend's next_step as the one action to take. Progress is never worked out here - the stage the next step
 * points at is highlighted, and "complete" is shown only when the backend says COMPLETE.
 */
export default function ItcOverview({ period, canManage, onNextStep, onOpenStage, onSelectGroup, onSelectStatus = () => {} }) {
  const { data: w, isLoading, isError, error } = useGstWorkflow(period);

  if (isLoading) return <LoadingBlock text="Loading the period's workflow..." />;
  if (isError) return <ErrorBlock error={error} fallback="Could not load the GST input credit workflow." />;
  if (!w) return null;

  const step = NEXT_STEPS[w.next_step];
  const complete = w.next_step === "COMPLETE";
  // manage actions (upload, record) are offered to managers only; everyone else is taken to the stage's view
  const actionLabel = step && !step.done && step.action && step.action !== "verify" && !canManage ? `View: ${step.label}` : step?.label;

  return (
    <SectionCard
      title={`GST ITC workflow · ${periodLabel(period)}`}
      actions={<span className="text-xs text-slate-400">Official GSTR-2B only{w.as_of ? ` · as of ${formatDate(w.as_of)}` : ""}</span>}
      bodyClassName="space-y-4 p-4"
    >
      <div role="status" aria-label="Next step"
        className={clsx("flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3",
          complete ? "border-emerald-200 bg-emerald-50" : "border-indigo-200 bg-indigo-50/60")}>
        <div className="flex items-center gap-2 text-sm">
          {complete && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />}
          <span className="text-slate-500">{complete ? "Status:" : "Next step:"}</span>
          <span className="font-semibold text-slate-900">{step?.label || w.next_step || "—"}</span>
        </div>
        {step && (
          <Button size="small" variant={complete ? "outline" : "primary"} onClick={() => onNextStep(w.next_step, w)}>
            {complete ? "View ITC register" : actionLabel} <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Button>
        )}
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {WORKFLOW_STAGES.map((stage, i) => {
          const current = stage.steps.includes(w.next_step);
          return (
            <li key={stage.key} aria-current={current ? "step" : undefined}
              className={clsx("flex flex-col gap-2 rounded-lg border bg-white p-3",
                current ? "border-indigo-400 ring-2 ring-indigo-100" : complete ? "border-emerald-200" : "border-slate-200")}>
              <button type="button" onClick={() => onOpenStage(stage.tab)}
                className="flex items-center gap-2 text-left text-xs font-semibold text-slate-700 hover:text-indigo-700">
                <span className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                  current ? "bg-[#0A0082] text-white" : complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                  {complete ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : i + 1}
                </span>
                {stage.label}
                {current && <span className="sr-only">(next step)</span>}
              </button>
              <StageBody stage={stage} w={w} period={period} onSelectGroup={onSelectGroup} onSelectStatus={onSelectStatus} />
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-slate-400">
        Figures and the next step are calculated by the AP backend. Matching does not make credit eligible; approval is internal -
        credit counts as claimed only after a recorded GSTR-3B filing is verified.
      </p>
    </SectionCard>
  );
}
