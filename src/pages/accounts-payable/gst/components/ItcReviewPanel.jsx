import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import Button from "../../../../components/Button/Button";
import { AP_ROUTES } from "../../constants/routes";
import { GSTR2B_MATCH, ITC_STATUS, LEGACY_CLAIM_LABEL, approvalSpec, eligibilitySpec } from "../../constants/gstItc";
import { Empty } from "../../dashboard/components/insights";
import { formatDate } from "../../utils/formatters";
import { useGstRegister } from "../hooks/useGstItc";
import { inr, monthDate, periodLabel } from "../utils/gstFormat";
import { ErrorBlock, LoadingBlock, SectionCard, StatusPill } from "./GstUi";

const UNDER_REVIEW = ["PENDING_REVIEW", "REQUIRES_CLARIFICATION"];
const CLAIMED = ["CLAIMED", "PARTIALLY_CLAIMED", "REVERSED"];

/**
 * Worklist views over the backend's own flags (eligibility basis, approval status, claim
 * blockers) - they only choose which rows to show; no credit is calculated here.
 */
const VIEWS = [
  { value: "all", label: "All", test: () => true },
  {
    value: "eligibility",
    label: "Eligibility review",
    test: (r) => r.itc_status === "PENDING" && (r.eligibility_basis !== "FINANCE_DECISION" || UNDER_REVIEW.includes(r.itc_eligibility_api_status)),
  },
  {
    value: "ready",
    label: "Ready for approval",
    test: (r) => r.eligibility_basis === "FINANCE_DECISION" && r.itc_eligibility_api_status === "ELIGIBLE"
      && ["PENDING", "PARTIALLY_CLAIMED"].includes(r.itc_status) && !(r.claim_blockers || []).length
      && r.approval_status !== "APPROVED_FOR_GSTR3B",
  },
  { value: "approved", label: "Approved for GSTR-3B", test: (r) => r.approval_status === "APPROVED_FOR_GSTR3B" },
  { value: "claimed", label: "Claimed / reversed", test: (r) => CLAIMED.includes(r.itc_status) },
  { value: "legacy", label: "Legacy claims", test: (r) => r.claim_source === "LEGACY" },
];

/** The period's purchase invoices (GET /itc?month=) with their eligibility, approval and claim state. */
export default function ItcReviewPanel({ period, onOpenItc }) {
  const { data, isLoading, isError, error } = useGstRegister(monthDate(period));
  const [view, setView] = useState("all");

  if (isLoading) return <LoadingBlock text="Loading the period's invoices..." />;
  if (isError) return <ErrorBlock error={error} fallback="Could not load the ITC register." />;

  const invoices = data?.invoices || [];
  const counts = Object.fromEntries(VIEWS.map((v) => [v.value, invoices.filter(v.test).length]));
  const shown = invoices.filter(VIEWS.find((v) => v.value === view).test);

  return (
    <SectionCard
      title={`ITC eligibility & approval · invoices dated ${periodLabel(period)}`}
      actions={(
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
          {VIEWS.filter((v) => v.value !== "legacy" || counts.legacy > 0).map((v) => (
            <button key={v.value} type="button" aria-pressed={view === v.value} onClick={() => setView(v.value)}
              className={clsx("rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                view === v.value ? "bg-[#0A0082] text-white ring-[#0A0082]" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}>
              {v.label} · {counts[v.value]}
            </button>
          ))}
        </div>
      )}
    >
      {shown.length === 0 ? (
        <Empty text={invoices.length ? "No invoice in this view." : "No purchase invoices dated in this month."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                {["Invoice", "Supplier GSTIN", "Taxable", "IGST", "CGST", "SGST", "Cess", "ITC", "GSTR-2B", "Eligibility", "Approval", "Claim", ""].map((h, i) => (
                  <th key={h || i} scope="col" className={clsx("px-3 py-2", ["Taxable", "IGST", "CGST", "SGST", "Cess", "ITC"].includes(h) && "text-right")}>
                    {h || <span className="sr-only">Actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((r) => (
                <tr key={r.invoice_id}>
                  <td className="px-3 py-2">
                    <Link to={AP_ROUTES.INVOICE_DETAIL(r.invoice_id)} className="font-medium text-indigo-600 hover:underline">{r.invoice_number}</Link>
                    <div className="text-xs text-slate-500">{r.vendor_name} · {formatDate(r.invoice_date)}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">
                    {r.supplier_gstin || "—"}
                    <div className="font-sans text-slate-400">{r.supply_type === "INTER" ? "Inter-state" : "Intra-state"}</div>
                  </td>
                  {["taxable_value", "igst", "cgst", "sgst", "cess", "itc"].map((k) => (
                    <td key={k} className={clsx("px-3 py-2 text-right tabular-nums", k === "itc" && "font-semibold text-slate-800")}>
                      {Number(r[k]) ? inr(r[k]) : "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-xs text-slate-500">{r.gstr2b ? GSTR2B_MATCH[r.gstr2b]?.label || r.gstr2b : "Not checked"}</td>
                  <td className="px-3 py-2">
                    <StatusPill spec={eligibilitySpec(r.itc_eligibility_api_status || r.itc_eligibility)} />
                    {r.eligibility_basis === "SYSTEM_SUGGESTION" && <div className="mt-0.5 text-[11px] text-slate-400">System suggestion</div>}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill spec={approvalSpec(r.approval_status)} />
                    {r.approval_period && <div className="mt-0.5 text-[11px] text-slate-400">{periodLabel(r.approval_period)}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {ITC_STATUS[r.itc_status] ?? r.itc_status}{r.claim_period ? ` · ${periodLabel(r.claim_period)}` : ""}
                    {r.claim_source === "LEGACY" && <div className="font-medium text-amber-700">{LEGACY_CLAIM_LABEL}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="small" variant="outline" onClick={() => onOpenItc(r.invoice_id)}>Review</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
