// Route: /accounts-payable/tds/challans  (TDS_TRACKING_VIEW or TDS_TRACKING_UPDATE)
// Shared TDS challans and quarterly statement filings, each with the invoices it covers.
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import Pagination from "../../../../components/Pagination/pagination";
import { SegmentedTabs, Empty } from "../../dashboard/components/insights";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";
import { getApiErrorMessage } from "../../utils/apiError";
import { openBlobInNewTab } from "../../utils/documentUpload";
import { tdsChallanService } from "../services/tdsChallanService";
import { useChallanDetail, useChallanList, useFilingDetail, useFilingList } from "../hooks/useTdsChallans";
import { fmtDate, money } from "../components/TdsDocumentParts";

const PAGE_SIZE = 20;

async function openDocument(loader, id) {
  try {
    openBlobInNewTab(await loader(id));
  } catch (err) {
    toast.error(getApiErrorMessage(err, "Could not open the document."));
  }
}

function InvoicesTable({ rows, amountKey = "tds_amount" }) {
  if (!rows?.length) return <Empty text="No invoices." />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
          <th className="py-1.5 text-left font-semibold">Invoice</th>
          <th className="py-1.5 text-left font-semibold">Section</th>
          <th className="py-1.5 text-left font-semibold">Deducted</th>
          <th className="py-1.5 text-right font-semibold">TDS</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
          <tr key={r.invoice_id}>
            <td className="py-1.5 text-left">
              <p className="font-medium text-slate-900">{r.invoice_number}</p>
              <p className="text-xs text-slate-500">{r.vendor_name}</p>
            </td>
            <td className="py-1.5 text-left text-slate-700">{r.section || "—"}</td>
            <td className="py-1.5 text-left text-slate-700">{fmtDate(r.deduction_date)}</td>
            <td className="py-1.5 text-right tabular-nums">{money(r[amountKey] ?? r.tds_amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChallanModal({ id, onClose }) {
  const { data, isLoading } = useChallanDetail(id);
  return (
    <Modal isOpen={Boolean(id)} onClose={onClose} title={data ? `Challan ${data.cin}` : "Challan"} subtitle={data ? `Deposited ${fmtDate(data.deposit_date)} · BSR ${data.bsr_code} · serial ${data.challan_serial_no}` : undefined} size="lg"
      footer={<div className="flex justify-end gap-2">
        {data?.has_document && <Button variant="outline" onClick={() => openDocument(tdsChallanService.challanDocument, id)}><FileText className="h-4 w-4" /> View challan</Button>}
        <Button variant="primary" onClick={onClose}>Close</Button>
      </div>}>
      {isLoading || !data ? <p className="text-sm text-slate-500">Loading…</p> : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            {[["Tax", money(data.tax_amount)], ["Interest", money(data.interest)], ["Total", money(data.total_amount)],
              ["Section", data.section_code || "—"], ["TAN", data.tan || "—"], ["AY", data.assessment_year || "—"]].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>
            ))}
          </dl>
          <InvoicesTable rows={data.allocations} amountKey="allocated_tds_amount" />
        </div>
      )}
    </Modal>
  );
}

function FilingModal({ id, onClose }) {
  const { data, isLoading } = useFilingDetail(id);
  return (
    <Modal isOpen={Boolean(id)} onClose={onClose} title={data ? `${data.form_type} ${data.financial_year} Q${data.quarter}` : "Filing"} subtitle={data ? `Acknowledgement ${data.acknowledgement_no} · filed ${fmtDate(data.filing_date)}` : undefined} size="lg"
      footer={<div className="flex justify-end gap-2">
        {data?.has_document && <Button variant="outline" onClick={() => openDocument(tdsChallanService.filingDocument, id)}><FileText className="h-4 w-4" /> View acknowledgement</Button>}
        <Button variant="primary" onClick={onClose}>Close</Button>
      </div>}>
      {isLoading || !data ? <p className="text-sm text-slate-500">Loading…</p> : <InvoicesTable rows={data.invoices} />}
    </Modal>
  );
}

export default function TdsChallansPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "filings" ? "filings" : "challans";
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const { canUpdateTdsTracking } = useApPermissions();
  const challans = useChallanList(page);
  const filings = useFilingList(page);
  const list = tab === "challans" ? challans : filings;
  const totalPages = Math.max(1, Math.ceil((list.data?.total || 0) / PAGE_SIZE));

  const switchTab = (next) => {
    setParams(next === "filings" ? { tab: "filings" } : {});
    setPage(1);
    setOpenId(null);
  };

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="TDS challans & filings"
        subtitle="One challan or quarterly statement, recorded once for all the invoices it covers."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(AP_ROUTES.TDS_TRACKING)}>
              <ArrowLeft className="h-4 w-4" /> TDS tracking
            </Button>
            {canUpdateTdsTracking && (
              <>
                <Button variant="outline" onClick={() => navigate(AP_ROUTES.TDS_FILING_NEW)}>
                  <Plus className="h-4 w-4" /> Record quarterly filing
                </Button>
                <Button variant="primary" onClick={() => navigate(AP_ROUTES.TDS_CHALLAN_NEW)}>
                  <Plus className="h-4 w-4" /> Record challan
                </Button>
              </>
            )}
          </>
        }
      />

      <SegmentedTabs value={tab} onChange={switchTab} tabs={[{ value: "challans", label: "Challans" }, { value: "filings", label: "Quarterly filings" }]} />

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {list.isError ? (
          <p className="px-5 py-6 text-sm text-rose-700">{getApiErrorMessage(list.error, "Could not load the list.")}</p>
        ) : list.isLoading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>
        ) : !list.data?.items?.length ? (
          <Empty text={tab === "challans" ? "No challans recorded yet." : "No quarterly filings recorded yet."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                {tab === "challans" ? (
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2 text-left font-semibold">CIN</th>
                    <th className="px-3 py-2 text-left font-semibold">Deposited</th>
                    <th className="px-3 py-2 text-left font-semibold">Section</th>
                    <th className="px-3 py-2 text-left font-semibold">Invoices</th>
                    <th className="px-3 py-2 text-left font-semibold">Total paid</th>
                    <th className="px-5 py-2 text-left font-semibold">Evidence</th>
                  </tr>
                ) : (
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2 text-left font-semibold">Statement</th>
                    <th className="px-3 py-2 text-left font-semibold">Acknowledgement</th>
                    <th className="px-3 py-2 text-left font-semibold">Filed</th>
                    <th className="px-3 py-2 text-left font-semibold">Invoices</th>
                    <th className="px-5 py-2 text-left font-semibold">Evidence</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.items.map((row) =>
                  tab === "challans" ? (
                    <tr key={row.challan_id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(row.challan_id)}>
                      <td className="px-5 py-3 text-left font-medium text-slate-900">{row.cin}</td>
                      <td className="px-3 py-3 text-left text-slate-700">{fmtDate(row.deposit_date)}</td>
                      <td className="px-3 py-3 text-left text-slate-700">{row.section_code || "—"}</td>
                      <td className="px-3 py-3 text-left text-slate-700">{row.invoice_count}</td>
                      <td className="px-3 py-3 text-left tabular-nums text-slate-900">{money(row.total_amount)}</td>
                      <td className="px-5 py-3 text-left text-slate-600">{row.has_document ? "Challan attached" : "Reason given"}</td>
                    </tr>
                  ) : (
                    <tr key={row.filing_id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(row.filing_id)}>
                      <td className="px-5 py-3 text-left font-medium text-slate-900">
                        {row.form_type} {row.financial_year} Q{row.quarter}
                        {row.is_revision && <span className="ml-1 text-xs text-amber-700">(correction)</span>}
                      </td>
                      <td className="px-3 py-3 text-left text-slate-700">{row.acknowledgement_no}</td>
                      <td className="px-3 py-3 text-left text-slate-700">{fmtDate(row.filing_date)}</td>
                      <td className="px-3 py-3 text-left text-slate-700">{row.invoice_count}</td>
                      <td className="px-5 py-3 text-left text-slate-600">{row.has_document ? "Acknowledgement attached" : "Reason given"}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-5 py-3">
            <Pagination currentPage={page} totalPages={totalPages} onPrevious={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
          </div>
        )}
      </section>

      {tab === "challans" ? <ChallanModal id={openId} onClose={() => setOpenId(null)} /> : <FilingModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
