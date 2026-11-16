import { useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import { GSTR2B_MATCH, reconSpec } from "../../constants/gstItc";
import { formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { useGstr2bMatches, useGstRegister, useMapGstr2bMatch } from "../hooks/useGstItc";
import { inr, monthDate } from "../utils/gstFormat";
import { Field, TextArea } from "./GstUi";

const DEAD = ["REJECTED"];

/**
 * Candidate AP invoices for a GSTR-2B document: only the same supplier GSTIN. They come from the
 * period's "missing in GSTR-2B" invoices and the ITC register of the document's month. The backend
 * re-checks the GSTIN, the one-document-per-invoice rule and the invoice status, and re-compares
 * the record - the status is never forced to MATCHED here.
 */
export default function ManualMappingModal({ match, period, onClose }) {
  const doc = match.supplier_gstr2b_details || {};
  const gstin = (doc.supplier_gstin || "").toUpperCase();
  const currentId = match.purchase_invoice_details?.invoice_id ?? null;
  const missing = useGstr2bMatches({ returnPeriod: period, status: "MISSING_IN_GSTR2B", search: gstin, pageSize: 200 });
  const register = useGstRegister(doc.document_date ? monthDate(doc.document_date) : undefined);
  const mapMatch = useMapGstr2bMatch();
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");

  const candidates = useMemo(() => {
    const out = new Map();
    for (const item of missing.data?.items || []) {
      const inv = item.purchase_invoice_details;
      if (inv && (inv.supplier_gstin || "").toUpperCase() === gstin) {
        out.set(inv.invoice_id, { ...inv, gst: inv.gst_total, twob: "MISSING" });
      }
    }
    for (const r of register.data?.invoices || []) {
      if ((r.supplier_gstin || "").toUpperCase() === gstin && !DEAD.includes(r.invoice_status) && !out.has(r.invoice_id)) {
        out.set(r.invoice_id, { ...r, gst: r.itc, twob: r.gstr2b });
      }
    }
    return [...out.values()].sort((a, b) => String(b.invoice_date).localeCompare(String(a.invoice_date)));
  }, [missing.data, register.data, gstin]);

  const loading = missing.isLoading || register.isLoading;
  const commentsError = comments.trim().length > 0 && comments.trim().length < 5 ? "At least 5 characters" : "";

  const submit = async () => {
    if (mapMatch.isPending) return;
    setError("");
    try {
      const updated = await mapMatch.mutateAsync({ matchId: match.match_id, invoiceId: selected, comments: comments.trim() });
      toast.success(`Mapped and compared again - status: ${reconSpec(updated?.reconciliation_status).label}.`);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not map the document."));
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => !mapMatch.isPending && onClose()}
      title="Map to an AP invoice"
      subtitle="The record is compared again field by field after mapping; automatic re-matching keeps manual mappings."
      size="3xl"
      footer={(
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="small" onClick={onClose} disabled={mapMatch.isPending}>Cancel</Button>
          <Button variant="primary" size="small" onClick={submit} loading={mapMatch.isPending}
            disabled={!selected || comments.trim().length < 5}>
            Map invoice
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
          <Field label="GSTR-2B document">{doc.document_number}</Field>
          <Field label="Supplier GSTIN"><span className="font-mono text-xs">{gstin}</span></Field>
          <Field label="Document date">{formatDate(doc.document_date)}</Field>
          <Field label="GST filed">{inr(doc.gst_total)}</Field>
        </dl>

        <div>
          <p className="text-xs font-medium text-slate-600">AP invoices from the same supplier GSTIN</p>
          {loading ? (
            <p className="py-6 text-center text-xs text-slate-500">Finding invoices...</p>
          ) : candidates.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              No AP invoice under {gstin} in this period or the document&apos;s month. Book the invoice first, or check the
              supplier GSTIN on the vendor master - documents cannot be mapped across GSTINs.
            </p>
          ) : (
            <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-3 py-2" scope="col"><span className="sr-only">Select</span></th>
                    <th className="px-3 py-2" scope="col">Invoice</th>
                    <th className="px-3 py-2 text-right" scope="col">Taxable</th>
                    <th className="px-3 py-2 text-right" scope="col">GST</th>
                    <th className="px-3 py-2" scope="col">GSTR-2B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((c) => (
                    <tr key={c.invoice_id} className={clsx("cursor-pointer", selected === c.invoice_id && "bg-indigo-50/60")}
                      onClick={() => setSelected(c.invoice_id)}>
                      <td className="px-3 py-2">
                        <input type="radio" name="mapping-invoice" aria-label={`Select ${c.invoice_number}`}
                          checked={selected === c.invoice_id} onChange={() => setSelected(c.invoice_id)} />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-slate-800">{c.invoice_number}</span>
                        {c.invoice_id === currentId && <span className="ml-1 text-xs text-slate-400">(current)</span>}
                        <div className="text-xs text-slate-500">{c.vendor_name} · {formatDate(c.invoice_date)}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{inr(c.taxable_value)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{inr(c.gst)}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{c.twob ? GSTR2B_MATCH[c.twob]?.label || c.twob : "Not checked"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <TextArea label="Comments (required)" value={comments} onChange={(e) => setComments(e.target.value)} maxLength={1000}
          placeholder="Why this invoice, e.g. supplier mistyped the invoice number" error={commentsError} />
        {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </div>
    </Modal>
  );
}
