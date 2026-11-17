import clsx from "clsx";
import { importSpec, reconSpec } from "../../constants/gstItc";
import { formatDateTime } from "../../utils/formatters";
import { ComponentTable, ErrorBlock, LoadingBlock, SectionCard, StatusPill } from "./GstUi";
import { useGstr2bSummary } from "../hooks/useGstItc";
import { periodLabel } from "../utils/gstFormat";

/**
 * Reconciliation counts. Each tile with a `filter` opens the reconciliation list on that status.
 * Every figure is the backend's (GET /gstr2b/matches/summary) - nothing is added up here.
 */
const COUNT_TILES = [
  { key: "total_ap_invoices", label: "Total AP invoices" },
  { key: "total_gstr2b_records", label: "Total GSTR-2B records" },
  { key: "matched", label: "Matched", filter: "MATCHED", hint: "incl. amended" },
  { key: "partially_matched", label: "Partially matched", filter: "PARTIALLY_MATCHED" },
  { key: "mismatched", label: "Mismatched", filter: "MISMATCHED", hint: "incl. credit notes", warn: true },
  { key: "missing_in_gstr2b", label: "Missing in GSTR-2B", filter: "MISSING_IN_GSTR2B", warn: true },
  { key: "missing_in_ap", label: "Missing in AP", filter: "MISSING_IN_AP", warn: true },
  { key: "duplicates", label: "Duplicate records", filter: "DUPLICATE", warn: true },
  { key: "review_required_count", label: "Requires review", filter: "REQUIRES_REVIEW", warn: true },
];

function CountTile({ tile, value, onSelect }) {
  const body = (
    <>
      <p className="text-[11px] font-medium text-slate-500">{tile.label}</p>
      <p className={clsx("mt-0.5 text-xl font-semibold tabular-nums", tile.warn && value ? "text-amber-600" : "text-slate-800")}>{value ?? "—"}</p>
      {tile.hint && <p className="text-[10px] text-slate-400">{tile.hint}</p>}
    </>
  );
  if (!tile.filter || !onSelect) return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">{body}</div>;
  return (
    <button
      type="button"
      onClick={() => onSelect(tile.filter)}
      title={`Show ${reconSpec(tile.filter).label.toLowerCase()} records`}
      className="flex flex-col items-start justify-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 focus:outline-none focus:ring-2 focus:ring-[#0A0082]/20"
    >
      {body}
    </button>
  );
}

export default function ItcOverview({ period, onSelectStatus }) {
  const { data, isLoading, isError, error } = useGstr2bSummary(period);

  if (isLoading) return <LoadingBlock text="Loading the period summary..." />;
  if (isError) return <ErrorBlock error={error} fallback="Could not load the GST input credit overview." />;
  if (!data) return null;

  const rows = [
    { label: "Eligible ITC", values: data.eligible_itc, hint: "Finance decision or system suggestion" },
    { label: "Ineligible ITC", values: data.ineligible_itc },
    { label: "Pending review", values: data.pending_review_itc, count: data.eligibility_pending_review_count },
    { label: "Approved for GSTR-3B", values: data.approved_for_gstr3b, count: data.approved_for_gstr3b_count, hint: "Approved, not yet claimed" },
    { label: "Claimed in GSTR-3B", values: data.claimed_in_gstr3b, count: data.claimed_in_gstr3b_count, hint: "Verified filings, net of reversals", emphasis: true },
  ];
  const unconfirmed = Number(data.eligible_itc_unconfirmed?.total || 0);

  return (
    <SectionCard
      title={`GST Input Credit Overview · ${periodLabel(period)}`}
      actions={(
        <span className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          GSTR-2B <StatusPill spec={importSpec(data.import_status)} />
          {data.file_name && <span title={data.file_name} className="max-w-[16rem] truncate">{data.file_name}</span>}
          {data.imported_at && <span>· {formatDateTime(data.imported_at)}</span>}
        </span>
      )}
      bodyClassName="space-y-4 p-4"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {COUNT_TILES.map((t) => <CountTile key={t.key} tile={t} value={data[t.key]} onSelect={onSelectStatus} />)}
      </div>
      <ComponentTable rows={rows} showCount caption="Input tax credit by component" />
      <p className="text-xs text-slate-400">
        Amounts and counts are calculated by the AP backend for the period&apos;s purchase invoices.
        {unconfirmed > 0 && " Part of the eligible credit is still a system suggestion that Finance has not reviewed."}
        {" "}Approval is internal - credit counts as claimed only after a recorded GSTR-3B filing is verified by a second Finance user.
      </p>
    </SectionCard>
  );
}
