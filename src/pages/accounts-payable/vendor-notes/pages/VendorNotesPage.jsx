import { useState } from "react";
import PageGuide from "../../guide/components/PageGuide";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { toast } from "react-toastify";
import { FileMinus2, FilePlus2 } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { AP_ROUTES } from "../../constants/routes";
import { NOTE_STATUS, NOTE_TYPE } from "../../constants/vendorNotes";
import { formatMoney } from "../../dashboard/components/insights";
import { formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";
import { openBlobInNewTab } from "../../utils/documentUpload";
import { useApPermissions } from "../../hooks/useApPermissions";
import vendorNoteService from "../services/vendorNoteService";
import { useApplicableInvoices, useApplyNote, useCancelNote, useVendorNotes } from "../hooks/useVendorNotes";
import NoteFormModal from "../components/NoteFormModal";

const FILTERS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Not applied" },
  { value: "APPLIED", label: "Applied" },
  { value: "CANCELLED", label: "Cancelled" },
];

function NoteRow({ note, canManage }) {
  const [mode, setMode] = useState(null); // apply | cancel
  const [value, setValue] = useState("");
  const apply = useApplyNote();
  const cancel = useCancelNote();
  const { data: invoices = [] } = useApplicableInvoices(mode === "apply" ? note.vendor_id : null);
  const status = NOTE_STATUS[note.status];

  const submit = async () => {
    try {
      if (mode === "apply") {
        const result = await apply.mutateAsync({ noteId: note.note_id, invoiceId: value });
        toast.success(`Applied.${result.tds_note ? ` ${result.tds_note}` : ""}`);
      } else {
        await cancel.mutateAsync({ noteId: note.note_id, reason: value });
        toast.success("Note cancelled.");
      }
      setMode(null);
      setValue("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the note."));
    }
  };

  const viewDocument = async () => {
    try {
      openBlobInNewTab(await vendorNoteService.document(note.note_id), `${note.note_number}.pdf`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not open the document."));
    }
  };

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-800">{note.note_number}</span>
          <span className="text-xs text-slate-500">{NOTE_TYPE[note.note_type]?.label} · {note.vendor_name} · {formatDate(note.note_date)}</span>
          <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", status?.tone)}>{status?.label}</span>
        </div>
        <p className="text-xs text-slate-600">{note.reason}</p>
        <p className="text-xs text-slate-500">
          {note.reference_invoice_number && <>Corrects{" "}
            <Link to={AP_ROUTES.INVOICE_DETAIL(note.reference_invoice_id)} className="text-indigo-600 hover:text-indigo-700">{note.reference_invoice_number}</Link> · </>}
          {note.applied_invoice_number && <>Applied to{" "}
            <Link to={AP_ROUTES.INVOICE_DETAIL(note.applied_invoice_id)} className="text-indigo-600 hover:text-indigo-700">{note.applied_invoice_number}</Link></>}
          {note.tds_note && <span className="block">{note.tds_note}</span>}
          {note.itc_period && <span className="block">GST credit reduced in the {formatDate(note.itc_period)} return</span>}
          {note.cancel_reason && <span className="block italic">“{note.cancel_reason}”</span>}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold tabular-nums text-slate-800">{formatMoney(note.total_amount, "INR")}</p>
        {Number(note.gst) > 0 && <p className="text-xs text-slate-500">incl. GST {formatMoney(note.gst, "INR")}</p>}
      </div>
      <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
        {note.has_document && <Button size="small" variant="ghost" onClick={viewDocument}>View document</Button>}
        {canManage && note.status === "OPEN" && !mode && (
          <>
            <Button size="small" variant="outline" onClick={() => setMode("apply")}>Apply to invoice</Button>
            <Button size="small" variant="ghost" onClick={() => setMode("cancel")}>Cancel note</Button>
          </>
        )}
        {mode === "apply" && (
          <span className="flex flex-wrap items-center gap-2">
            <select aria-label="Invoice to apply to" className="h-8 max-w-xs rounded-md border border-slate-300 px-2 text-xs" value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">{invoices.length ? "Choose the invoice" : "No unpaid approved invoice"}</option>
              {invoices.map((i) => (
                <option key={i.invoice_id} value={i.invoice_id}>{i.invoice_number} · owed {formatMoney(i.outstanding, "INR")}</option>
              ))}
            </select>
            <Button size="small" variant="primary" disabled={!value} loading={apply.isPending} onClick={submit}>Apply</Button>
            <Button size="small" variant="ghost" onClick={() => setMode(null)}>Back</Button>
          </span>
        )}
        {mode === "cancel" && (
          <span className="flex flex-wrap items-center gap-2">
            <input aria-label="Reason for cancelling" className="h-8 w-56 rounded-md border border-slate-300 px-2 text-xs" placeholder="Why (min 5 chars)"
              value={value} onChange={(e) => setValue(e.target.value)} />
            <Button size="small" variant="primary" disabled={value.trim().length < 5} loading={cancel.isPending} onClick={submit}>Cancel note</Button>
            <Button size="small" variant="ghost" onClick={() => setMode(null)}>Back</Button>
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * Credit and debit notes: record a vendor's credit note or raise a debit note, and set it off
 * against the vendor's unpaid invoice so the payable, TDS and GST credit are right.
 */
export default function VendorNotesPage() {
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(null); // CREDIT_NOTE | DEBIT_NOTE
  const { data, isLoading, isError, error } = useVendorNotes(status ? { status } : {});
  const { canManageVendorNotes } = useApPermissions();

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Accounts Payable", to: AP_ROUTES.DASHBOARD }, { label: "Credit & debit notes" }]} />
      <PageHeader
        title="Credit & debit notes"
        subtitle="Corrections to vendor invoices - credit notes from vendors, debit notes we raise"
        actions={canManageVendorNotes && (
          <>
            <Button variant="outline" size="small" onClick={() => setCreating("DEBIT_NOTE")}><FileMinus2 size={14} /> Raise debit note</Button>
            <Button variant="primary" size="small" onClick={() => setCreating("CREDIT_NOTE")}><FilePlus2 size={14} /> Record credit note</Button>
          </>
        )}
      />
      <PageGuide page="notes" />
      {data?.summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Not yet applied</p>
            <p className={clsx("mt-1 text-2xl font-semibold tabular-nums", data.summary.open ? "text-amber-600" : "text-slate-800")}>{data.summary.open}</p>
            <p className="text-xs text-slate-400">{formatMoney(data.summary.open_amount, "INR")} - apply before paying the vendor</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Applied</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-800">{data.summary.applied}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">GST on credit notes</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-800">{formatMoney(data.summary.credit_gst, "INR")}</p>
            <p className="text-xs text-slate-400">Comes off the input credit claimed</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter notes">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" onClick={() => setStatus(f.value)} aria-pressed={status === f.value}
            className={clsx("rounded-full border px-3 py-1 text-xs font-medium", status === f.value ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600")}>
            {f.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-20"><LoadingSpinner text="Loading notes..." /></div>
      ) : isError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(error, "Could not load the notes.")}</p>
      ) : data.notes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500">No notes here.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {data.notes.map((n) => <NoteRow key={n.note_id} note={n} canManage={canManageVendorNotes} />)}
        </ul>
      )}
      {creating && <NoteFormModal noteType={creating} onClose={() => setCreating(null)} />}
    </div>
  );
}
