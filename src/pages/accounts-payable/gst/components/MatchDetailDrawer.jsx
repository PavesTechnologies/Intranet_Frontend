import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Check, X } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { AP_ROUTES } from "../../constants/routes";
import { ITC_STATUS, RECON_REVIEW, eligibilitySpec, reconSpec } from "../../constants/gstItc";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { useGstr2bMatchDetail, useMapGstr2bMatch, useReviewGstr2bMatch } from "../hooks/useGstItc";
import { inr } from "../utils/gstFormat";
import { ConfirmDialog, Drawer, ErrorBlock, Field, LoadingBlock, StatusPill, TextArea } from "./GstUi";
import ManualMappingModal from "./ManualMappingModal";

const COMPARISON_ROWS = [
  ["document_number", "Document number"],
  ["document_date", "Document date"],
  ["document_type", "Document type"],
  ["supplier_gstin", "Supplier GSTIN"],
  ["taxable_value", "Taxable value", true],
  ["igst", "IGST", true],
  ["cgst", "CGST", true],
  ["sgst", "SGST", true],
  ["cess", "Cess", true],
];
const DOC_TYPE = { INV: "Invoice", CN: "Credit note", DN: "Debit note" };

function Comparison({ comparison }) {
  if (!comparison) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <caption className="sr-only">Field-level comparison</caption>
        <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
          <tr>
            <th className="px-3 py-2" scope="col">Field</th>
            <th className="px-3 py-2" scope="col">GSTR-2B</th>
            <th className="px-3 py-2" scope="col">AP (books)</th>
            <th className="px-3 py-2" scope="col">Difference</th>
            <th className="px-3 py-2" scope="col"><span className="sr-only">Agrees</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {COMPARISON_ROWS.filter(([key]) => comparison[key]).map(([key, label, money]) => {
            const row = comparison[key];
            const show = (v) => (v === null || v === undefined || v === "" ? "—" : money ? inr(v) : String(v));
            return (
              <tr key={key} className={row.match ? "" : "bg-amber-50/50"}>
                <th scope="row" className="px-3 py-2 text-left text-xs font-medium text-slate-600">{label}</th>
                <td className="px-3 py-2 tabular-nums">{show(row.gstr2b)}</td>
                <td className="px-3 py-2 tabular-nums">{show(row.books)}</td>
                <td className="px-3 py-2 tabular-nums">{money && row.difference !== undefined ? show(row.difference) : ""}</td>
                <td className="px-3 py-2">
                  {row.match
                    ? <Check className="h-4 w-4 text-emerald-600" aria-label="Agrees" />
                    : <X className="h-4 w-4 text-amber-600" aria-label="Differs" />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One GSTR-2B record (GET /gstr2b/matches/{id}): the supplier's document next to the AP invoice,
 * the backend's field-level comparison and reasons, Finance's review and the manual mapping.
 */
export default function MatchDetailDrawer({ matchId, period, canManage, onClose, onOpenItc }) {
  const { data, isLoading, isError, error } = useGstr2bMatchDetail(matchId);
  const review = useReviewGstr2bMatch();
  const mapMatch = useMapGstr2bMatch();
  const [mapping, setMapping] = useState(false);
  const [action, setAction] = useState(null); // ACCEPTED | ON_HOLD | CLEARED | CLEAR_MAPPING
  const [remarks, setRemarks] = useState("");

  const doc = data?.supplier_gstr2b_details || {};
  const inv = data?.purchase_invoice_details;
  const editable = canManage && data?.import_is_current;

  const run = async () => {
    if (review.isPending || mapMatch.isPending) return;
    try {
      if (action === "CLEAR_MAPPING") {
        await mapMatch.mutateAsync({ matchId, invoiceId: null, comments: remarks.trim() });
        toast.success("Manual mapping cleared - the record was matched again automatically.");
      } else {
        await review.mutateAsync({ matchId, decision: action, remarks: remarks.trim() });
        toast.success(action === "CLEARED" ? "Review cleared." : `Record marked ${RECON_REVIEW[action].label.toLowerCase()}.`);
      }
      setAction(null);
      setRemarks("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the record."));
    }
  };

  const ACTION_TEXT = {
    ACCEPTED: ["Accept the difference?", "Accepting reconciles a difference Finance has verified. It never lets credit exceed what the supplier reported, and does not decide ITC eligibility.", "Accept"],
    ON_HOLD: ["Put the record on hold?", "The invoice's credit stays held until the hold is cleared.", "Put on hold"],
    CLEARED: ["Clear the review?", "The record goes back to its matching result.", "Clear review"],
    CLEAR_MAPPING: ["Clear the manual mapping?", "The document is matched again automatically.", "Clear mapping"],
  };

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={data ? `GSTR-2B ${doc.document_number || ""}` : "GSTR-2B record"}
        subtitle={data ? `${doc.supplier_name || ""} · ${doc.supplier_gstin || ""}` : undefined}
        footer={data && editable && (
          <div className="flex flex-wrap justify-end gap-2">
            {data.mapping?.source === "MANUAL" && (
              <Button size="small" variant="ghost" onClick={() => setAction("CLEAR_MAPPING")}>Clear manual mapping</Button>
            )}
            {doc.document_type !== "CN" && (
              <Button size="small" variant="outline" onClick={() => setMapping(true)}>{inv ? "Change mapping" : "Map to AP invoice"}</Button>
            )}
            {data.review_status && <Button size="small" variant="ghost" onClick={() => setAction("CLEARED")}>Clear review</Button>}
            {data.review_status !== "ON_HOLD" && <Button size="small" variant="outline" onClick={() => setAction("ON_HOLD")}>Put on hold</Button>}
            {data.review_status !== "ACCEPTED" && <Button size="small" variant="primary" onClick={() => setAction("ACCEPTED")}>Accept difference</Button>}
          </div>
        )}
      >
        {isLoading ? (
          <LoadingBlock text="Loading the record..." />
        ) : isError ? (
          <ErrorBlock error={error} fallback="Could not load the GSTR-2B record." />
        ) : data && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill spec={reconSpec(data.reconciliation_status)} />
              {data.review_status && <StatusPill spec={RECON_REVIEW[data.review_status] || { label: data.review_status, tone: "" }} />}
              {data.mapping?.source === "MANUAL" && <span className="text-xs text-slate-500">Mapped manually</span>}
              {!data.import_is_current && <span className="text-xs font-medium text-amber-700">From a replaced import (read-only)</span>}
            </div>

            {data.mismatch_reasons?.length > 0 && (
              <ul className="list-disc space-y-0.5 rounded-lg bg-amber-50 py-2 pl-8 pr-3 text-sm text-amber-800">
                {data.mismatch_reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            )}
            {data.gstr2b_itc_available === false && (
              <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                GSTR-2B reports this credit as not available{data.gstr2b_itc_unavailable_reason ? `: ${data.gstr2b_itc_unavailable_reason}` : ""}.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <dl className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3">
                <p className="col-span-2 text-xs font-semibold text-slate-700">Supplier&apos;s GSTR-2B</p>
                <Field label="Document">{DOC_TYPE[doc.document_type] || doc.document_type} {doc.document_number}</Field>
                <Field label="Date">{formatDate(doc.document_date)}</Field>
                <Field label="Taxable value">{inr(doc.taxable_value)}</Field>
                <Field label="GST">{inr(doc.gst_total)}</Field>
                <Field label="Section / row">{[doc.section, doc.source_row].filter(Boolean).join(" · ") || "—"}</Field>
                <Field label="IRN">{doc.irn ? <span className="break-all font-mono text-[11px]">{doc.irn}</span> : "Not reported"}</Field>
                {doc.is_amendment && <Field label="Amends">{doc.original_document_number} ({formatDate(doc.original_document_date)})</Field>}
              </dl>
              <dl className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3">
                <p className="col-span-2 text-xs font-semibold text-slate-700">AP invoice (books)</p>
                {inv ? (
                  <>
                    <Field label="Invoice">
                      <Link to={AP_ROUTES.INVOICE_DETAIL(inv.invoice_id)} className="font-medium text-indigo-600 hover:underline">{inv.invoice_number}</Link>
                    </Field>
                    <Field label="Date">{formatDate(inv.invoice_date)}</Field>
                    <Field label="Taxable value">{inr(inv.taxable_value)}</Field>
                    <Field label="GST">{inr(inv.gst_total)}</Field>
                    <Field label="Vendor">{inv.vendor_name}</Field>
                    <Field label="ITC">
                      <span className="flex flex-wrap gap-1">
                        <StatusPill spec={eligibilitySpec(data.itc_eligibility_api_status || data.itc_eligibility_status)} />
                        {data.itc_claim_status && <span className="text-xs text-slate-500">{ITC_STATUS[data.itc_claim_status] || data.itc_claim_status}</span>}
                      </span>
                    </Field>
                  </>
                ) : (
                  <p className="col-span-2 text-sm text-slate-500">
                    Not matched to an invoice in the books.{doc.document_type === "CN" ? " Credit notes match recorded vendor credit notes." : ""}
                  </p>
                )}
              </dl>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Field-level comparison</h3>
              {data.field_level_comparison ? <Comparison comparison={data.field_level_comparison} /> : <p className="text-sm text-slate-500">Nothing to compare against.</p>}
            </div>

            {inv && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Button size="small" variant="outline" onClick={() => onOpenItc(inv.invoice_id)}>Open ITC eligibility &amp; approval</Button>
                <span className="text-xs text-slate-500">Matching does not make the credit eligible - Finance decides eligibility separately.</span>
              </div>
            )}

            {data.mapping?.source === "MANUAL" && (
              <dl className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3">
                <Field label="Mapped by">{data.mapping.mapped_by}</Field>
                <Field label="Mapped at">{formatDateTime(data.mapping.mapped_at)}</Field>
                <Field label="Comments">{data.mapping.comments}</Field>
              </dl>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Review history</h3>
              {data.review_history?.length ? (
                <ol className="space-y-2">
                  {data.review_history.map((h, i) => (
                    <li key={i} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-800">{h.decision}</span>
                      <span className="text-xs text-slate-500"> · {h.reviewed_by} · {formatDateTime(h.reviewed_at)} · status then {reconSpec(h.match_status).label}</span>
                      <p className="text-slate-600">{h.remarks}</p>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-slate-500">No review recorded.</p>}
            </div>
          </>
        )}
      </Drawer>

      {mapping && data && <ManualMappingModal match={data} period={period} onClose={() => setMapping(false)} />}

      <ConfirmDialog
        open={Boolean(action)}
        title={action ? ACTION_TEXT[action][0] : ""}
        message={action ? ACTION_TEXT[action][1] : ""}
        confirmText={action ? ACTION_TEXT[action][2] : ""}
        loading={review.isPending || mapMatch.isPending}
        confirmDisabled={remarks.trim().length < 5}
        onCancel={() => { setAction(null); setRemarks(""); }}
        onConfirm={run}
      >
        <TextArea label={action === "CLEAR_MAPPING" ? "Comments (required)" : "Remarks (required)"} value={remarks} maxLength={1000}
          onChange={(e) => setRemarks(e.target.value)} hint="At least 5 characters" />
      </ConfirmDialog>
    </>
  );
}

export const docTypeLabel = (t) => DOC_TYPE[t] || t || "";
