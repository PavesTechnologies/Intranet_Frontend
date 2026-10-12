// src/pages/accounts-payable/invoice/pages/InvoiceReviewWorkbenchPage.jsx
// Route: /accounts-payable/invoices/review-workbench  (INVOICE_OCR_REVIEW or INVOICE_SEND_FOR_APPROVAL)
// "Review & Send": clean invoices are reviewed and sent for approval together; department and
// category are suggested for NON_PO invoices; anything that needs a person's eye is listed with the
// reason and reviewed on its own. The server re-checks every invoice before acting.
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import clsx from "clsx";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Info, Send, XCircle } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import { SegmentedTabs, Empty, formatMoney } from "../../dashboard/components/insights";
import { AP_ROUTES } from "../../constants/routes";
import { QUEUE_TYPES } from "../../constants/queueTypes";
import { getApiErrorMessage } from "../../utils/apiError";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import { usePurchaseCategoriesByDepartment } from "../../system-configuration/hooks/usePurchaseCategories";
import { useBulkReviewMutation, useBulkSendMutation, useReviewWorkbench } from "../hooks/useReviewWorkbench";
import { useRecheckInvoice } from "../../automation/hooks/useApAutomation";
import { AUTOMATION_OUTCOME } from "../../constants/apAutomation";
import { formatDateTime } from "../components/bulk/BulkUploadParts";

const SOURCE_LABEL = {
  PO: "From PO",
  VENDOR_MAPPING: "Vendor default",
  LAST_INVOICE: "Vendor's last invoice",
  INVOICE: "Entered",
};
const CODING_KEYS = ["coding", "policy"];
const RESULT_META = {
  SENT: { label: "Sent for approval", className: "text-emerald-700", icon: CheckCircle2 },
  REVIEWED: { label: "Reviewed, not sent", className: "text-amber-700", icon: AlertTriangle },
  SKIPPED: { label: "Skipped", className: "text-slate-600", icon: Info },
  FAILED: { label: "Failed", className: "text-rose-700", icon: XCircle },
};

/** Blocking failures other than coding (coding can be fixed right here). */
function hardBlocks(row) {
  return row.checks.filter((c) => c.blocking && !c.ok && !CODING_KEYS.includes(c.key));
}

export function isSelectable(row, override) {
  if (row.ready) return true;
  if (row.invoice_type === "PO" || hardBlocks(row).length) return false;
  return Boolean(override?.department_id && override?.purchase_category_id);
}

function CategorySelect({ departmentId, value, onChange, disabled, label }) {
  const { data: categories = [], isLoading } = usePurchaseCategoriesByDepartment(departmentId ? Number(departmentId) : undefined);
  return (
    <select
      aria-label={label}
      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs disabled:bg-slate-50"
      value={value || ""}
      disabled={disabled || !departmentId}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{!departmentId ? "Category" : isLoading ? "Loading…" : "Select category"}</option>
      {categories
        .filter((c) => c.is_active)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
    </select>
  );
}

function DepartmentSelect({ departments, value, onChange, disabled, label }) {
  return (
    <select
      aria-label={label}
      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs disabled:bg-slate-50"
      value={value || ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">Department</option>
      {departments
        .filter((d) => d.is_active)
        .map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
    </select>
  );
}

function CodingCell({ row, override, departments, onChange, editable }) {
  if (row.invoice_type === "PO" || !editable) {
    return row.department_name ? (
      <div>
        <p className="text-slate-800">{row.department_name}</p>
        <p className="text-xs text-slate-500">
          {row.purchase_category_name}
          {row.coding_source && <span className="ml-1 text-slate-400">· {SOURCE_LABEL[row.coding_source]}</span>}
        </p>
      </div>
    ) : (
      <span className="text-xs text-slate-400">—</span>
    );
  }
  const dept = override?.department_id ?? row.department_id;
  const cat = override ? override.purchase_category_id : row.purchase_category_id;
  return (
    <div className="w-48 space-y-1">
      <DepartmentSelect
        departments={departments}
        value={dept}
        label={`Department for ${row.invoice_number}`}
        onChange={(v) => onChange({ department_id: v, purchase_category_id: null })}
      />
      <CategorySelect departmentId={dept} value={cat} label={`Category for ${row.invoice_number}`} onChange={(v) => onChange({ department_id: dept, purchase_category_id: v })} />
      {row.coding_source && !override && (
        <p className="text-[11px] text-[#0A0082]" title="Suggested - change it if it is wrong">
          Suggested: {SOURCE_LABEL[row.coding_source]}
        </p>
      )}
    </div>
  );
}

function Checks({ row, override }) {
  const fixedByOverride = override?.department_id && override?.purchase_category_id;
  return (
    <ul className="space-y-0.5 text-xs">
      {row.checks
        .filter((c) => !(fixedByOverride && CODING_KEYS.includes(c.key)))
        .map((c) => {
          const Icon = c.ok ? CheckCircle2 : c.blocking ? XCircle : AlertTriangle;
          return (
            <li key={c.key} className={clsx("flex items-start gap-1", c.ok ? "text-slate-500" : c.blocking ? "text-rose-700" : "text-amber-700")}>
              <Icon className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{c.message}</span>
            </li>
          );
        })}
      {fixedByOverride && <li className="text-slate-500">Department / category chosen - checked again when you submit.</li>}
      {row.automation && (
        <li className="pt-0.5 text-[11px] text-slate-500">
          AP automation: {AUTOMATION_OUTCOME[row.automation.outcome]?.label || row.automation.outcome}
          {row.automation.at ? ` · ${formatDateTime(row.automation.at)}` : ""}
        </li>
      )}
    </ul>
  );
}

/** Invoice Management's Approval tab lists both "reviewed, not sent" and "pending approval". */
export const APPROVAL_QUEUE_URL = `${AP_ROUTES.INVOICE_LIST}?queue=${QUEUE_TYPES.APPROVAL}`;

function ResultsPanel({ response, onClose }) {
  const navigate = useNavigate();
  if (!response) return null;
  const s = response.summary;
  const moved = s.SENT + s.REVIEWED;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-live="polite" aria-labelledby="results-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="results-title" className="text-base font-semibold text-slate-900">
          Result: {s.SENT} sent · {s.REVIEWED} reviewed, not sent · {s.SKIPPED + s.FAILED} not processed
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {moved > 0 && (
            <Button size="small" variant="primary" onClick={() => navigate(APPROVAL_QUEUE_URL)}>
              View in Invoice Management <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <Button size="small" variant="ghost" onClick={onClose}>
            Continue reviewing
          </Button>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-slate-100 text-sm">
        {response.results.map((r) => {
          const meta = RESULT_META[r.status] || RESULT_META.FAILED;
          return (
            <li key={r.invoice_id} className="flex flex-wrap items-start gap-x-3 gap-y-0.5 py-2">
              <span className={clsx("inline-flex w-44 shrink-0 items-center gap-1 font-medium", meta.className)}>
                <meta.icon className="h-4 w-4" aria-hidden /> {meta.label}
              </span>
              <Link to={AP_ROUTES.INVOICE_DETAIL(r.invoice_id)} className="font-medium text-[#0A0082] hover:underline">
                {r.invoice_number || `Invoice #${r.invoice_id}`}
              </Link>
              {r.message && <span className="text-slate-600">{r.message}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function InvoiceReviewWorkbenchPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("to_review");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(() => new Set());
  const [overrides, setOverrides] = useState({});
  const [bulkDept, setBulkDept] = useState(null);
  const [bulkCat, setBulkCat] = useState(null);
  const [response, setResponse] = useState(null);
  const { data, isLoading, isError, error } = useReviewWorkbench(stage);
  const { data: departments = [] } = useDepartments();
  const bulkReview = useBulkReviewMutation();
  const bulkSend = useBulkSendMutation();
  const recheck = useRecheckInvoice();
  const busy = bulkReview.isPending || bulkSend.isPending || recheck.isPending;

  const recheckRow = async (row) => {
    try {
      const result = await recheck.mutateAsync(row.invoice_id);
      const label = AUTOMATION_OUTCOME[result.outcome]?.label || result.outcome;
      (result.outcome === "EXCEPTION" ? toast.info : toast.success)(
        `${row.invoice_number}: ${label}${result.reasons?.[0] ? ` - ${result.reasons[0]}` : ""}`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not re-check this invoice."));
    }
  };

  const rows = useMemo(() => data?.items || [], [data]);
  const maxBulk = data?.max_bulk || 25;
  const editable = stage === "to_review" && data?.can_review;
  const selectable = (row) => isSelectable(row, overrides[row.invoice_id]);
  const visible = rows.filter((r) => (filter === "ready" ? selectable(r) : filter === "attention" ? !selectable(r) : true));
  const selectedRows = rows.filter((r) => selected.has(r.invoice_id) && selectable(r));
  const selectableVisible = visible.filter(selectable);
  const readyCount = rows.filter(selectable).length;

  const switchStage = (next) => {
    setStage(next);
    setSelected(new Set());
    setOverrides({});
    setResponse(null);
  };

  const toggle = (id) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxBulk) next.add(id);
      else toast.info(`At most ${maxBulk} invoices at a time.`);
      return next;
    });

  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((r) => selected.has(r.invoice_id));
  const toggleAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(selectableVisible.slice(0, maxBulk).map((r) => r.invoice_id)));

  const applyToSelected = () => {
    if (!bulkDept || !bulkCat) return;
    const targets = rows.filter((r) => selected.has(r.invoice_id) && r.invoice_type !== "PO");
    setOverrides((cur) => {
      const next = { ...cur };
      targets.forEach((r) => (next[r.invoice_id] = { department_id: bulkDept, purchase_category_id: bulkCat }));
      return next;
    });
    toast.success(`Department and category applied to ${targets.length} invoice${targets.length === 1 ? "" : "s"}.`);
  };

  const submit = async (send) => {
    try {
      const result =
        stage === "reviewed"
          ? await bulkSend.mutateAsync(selectedRows.map((r) => r.invoice_id))
          : await bulkReview.mutateAsync({
              sendForApproval: send,
              items: selectedRows.map((r) => ({ invoice_id: r.invoice_id, ...(overrides[r.invoice_id] || {}) })),
            });
      setResponse(result);
      const sent = result.summary?.SENT || 0;
      if (sent) toast.success(`${sent} invoice${sent === 1 ? "" : "s"} sent for approval.`);
      setSelected(new Set());
      setOverrides({});
    } catch (err) {
      toast.error(getApiErrorMessage(err, "The action failed. Please try again."));
    }
  };

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Review & Send"
        subtitle="Clean invoices are reviewed and sent for approval together. Invoices that need a closer look show why."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(AP_ROUTES.INVOICE_LIST)}>
              <ArrowLeft className="h-4 w-4" /> Back to Invoices
            </Button>
            <Button variant="outline" onClick={() => navigate(AP_ROUTES.INVOICE_OCR_REVIEW)}>
              OCR review queue
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          value={stage}
          onChange={switchStage}
          tabs={[
            { value: "to_review", label: "To review" },
            { value: "reviewed", label: "Reviewed, not sent" },
          ]}
        />
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: "All", count: rows.length },
            { value: "ready", label: "Ready", count: readyCount },
            { value: "attention", label: "Needs a closer look", count: rows.length - readyCount },
          ]}
        />
      </div>

      <ResultsPanel response={response} onClose={() => setResponse(null)} />

      {selectedRows.length > 0 && (
        <div className="rounded-xl border border-[#0A0082]/20 bg-[#0A0082]/[0.04] px-5 py-3" role="region" aria-label="Bulk actions">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">
              {selectedRows.length} selected <span className="font-normal text-slate-500">(max {maxBulk})</span>
            </span>
            {editable && selectedRows.some((r) => r.invoice_type !== "PO") && (
              <div className="flex items-center gap-2">
                <div className="w-40">
                  <DepartmentSelect departments={departments} value={bulkDept} label="Department for selected" onChange={(v) => { setBulkDept(v); setBulkCat(null); }} />
                </div>
                <div className="w-40">
                  <CategorySelect departmentId={bulkDept} value={bulkCat} label="Category for selected" onChange={setBulkCat} />
                </div>
                <Button size="small" variant="outline" onClick={applyToSelected} disabled={!bulkDept || !bulkCat}>
                  Apply to selected
                </Button>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {stage === "to_review" ? (
                <>
                  <Button variant="outline" onClick={() => submit(false)} disabled={busy}>
                    Review only
                  </Button>
                  {data?.can_send && (
                    <Button variant="primary" onClick={() => submit(true)} loading={busy} loadingText="Processing...">
                      <Send className="h-4 w-4" /> Review & send {selectedRows.length}
                    </Button>
                  )}
                </>
              ) : (
                data?.can_send && (
                  <Button variant="primary" onClick={() => submit(true)} loading={busy} loadingText="Sending...">
                    <Send className="h-4 w-4" /> Send {selectedRows.length} for approval
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {isError ? (
          <p className="px-5 py-6 text-sm text-rose-700">{getApiErrorMessage(error, "Could not load invoices.")}</p>
        ) : isLoading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading invoices…</p>
        ) : visible.length === 0 ? (
          <Empty text={stage === "to_review" ? "No invoices waiting for review." : "No reviewed invoices waiting to be sent."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-4 py-2 text-left">
                    <input type="checkbox" aria-label="Select all ready invoices" checked={allVisibleSelected} onChange={toggleAll} disabled={!selectableVisible.length} />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Invoice</th>
                  <th className="px-3 py-2 text-left font-semibold">Amount</th>
                  <th className="px-3 py-2 text-left font-semibold">Department / category</th>
                  <th className="px-3 py-2 text-left font-semibold">Checks</th>
                  <th className="px-4 py-2 text-left" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((row) => {
                  const canSelect = selectable(row);
                  return (
                    <tr key={row.invoice_id} className={clsx("align-top", selected.has(row.invoice_id) && "bg-[#0A0082]/[0.03]")}>
                      <td className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.invoice_number}`}
                          checked={selected.has(row.invoice_id)}
                          disabled={!canSelect || busy}
                          title={canSelect ? undefined : "Review this invoice on its own"}
                          onChange={() => toggle(row.invoice_id)}
                        />
                      </td>
                      <td className="px-3 py-3 text-left">
                        <p className="font-semibold text-slate-900">{row.invoice_number}</p>
                        <p className="max-w-[240px] truncate text-xs text-slate-500" title={row.vendor_name}>
                          {row.vendor_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {row.invoice_type === "PO" ? "PO" : "Non-PO"} · received {formatDateTime(row.created_at)}
                          {row.source === "EMAIL" ? " · by email" : row.batch_id ? ` · batch #${row.batch_id}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-left font-medium text-slate-800">{formatMoney(row.net_amount, row.currency_code)}</td>
                      <td className="px-3 py-3 text-left">
                        <CodingCell
                          row={row}
                          editable={editable}
                          override={overrides[row.invoice_id]}
                          departments={departments}
                          onChange={(o) => setOverrides((cur) => ({ ...cur, [row.invoice_id]: o }))}
                        />
                      </td>
                      <td className="px-3 py-3 text-left">
                        <Checks row={row} override={overrides[row.invoice_id]} />
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex flex-col items-start gap-1.5">
                          <Button size="small" variant="outline" onClick={() => navigate(AP_ROUTES.INVOICE_DETAIL(row.invoice_id))}>
                            {canSelect ? "Open" : "Review"}
                          </Button>
                          {stage === "to_review" && row.invoice_type === "PO" && !row.ready && data?.can_review && (
                            <Button size="small" variant="ghost" onClick={() => recheckRow(row)} disabled={busy} title="Run the touchless checks again (e.g. after the goods receipt was recorded)">
                              Re-check
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
