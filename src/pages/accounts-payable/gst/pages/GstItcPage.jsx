import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageGuide from "../../guide/components/PageGuide";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import { AP_ROUTES } from "../../constants/routes";
import { NEXT_STEPS } from "../../constants/gstItc";
import { SegmentedTabs } from "../../dashboard/components/insights";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useGstPeriods } from "../hooks/useGstItc";
import { periodLabel, pickDefaultPeriod } from "../utils/gstFormat";
import GstPeriodSelect from "../components/GstPeriodSelect";
import ItcOverview from "../components/ItcOverview";
import Gstr2bPanel from "../components/Gstr2bPanel";
import ItcReviewPanel from "../components/ItcReviewPanel";
import Gstr3bFilingsPanel from "../components/Gstr3bFilingsPanel";
import ItcRegisterPanel from "../components/ItcRegisterPanel";
import ItcDetailDrawer from "../components/ItcDetailDrawer";
import RecordFilingModal from "../components/RecordFilingModal";
import { ErrorBlock, LoadingBlock } from "../components/GstUi";

const TABS = [
  { value: "gstr2b", label: "GSTR-2B reconciliation" },
  { value: "review", label: "ITC eligibility & approval" },
  { value: "filings", label: "GSTR-3B filings" },
  { value: "register", label: "ITC register" },
];
const PERIOD_KEY = "ap.gst.period";
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const storedPeriod = () => {
  try {
    const v = window.sessionStorage.getItem(PERIOD_KEY);
    return PERIOD_RE.test(v || "") ? v : null;
  } catch {
    return null;
  }
};

/**
 * GST input credit for one return period: the backend's workflow (GET /itc/workflow) with its next step, then GSTR-2B import and
 * reconciliation -> ITC eligibility review -> internal approval for GSTR-3B -> recorded GSTR-3B
 * filing -> verification -> claim tracking. The period, tab and status filter live
 * in the URL (so links and Back keep them) and the period is also remembered for the session.
 */
export default function GstItcPage() {
  const { canManageGstItc } = useApPermissions();
  const [params, setParams] = useSearchParams();
  const periods = useGstPeriods();
  const [itcInvoiceId, setItcInvoiceId] = useState(null);
  const [filingPeriod, setFilingPeriod] = useState(undefined); // undefined = closed
  const [importRequested, setImportRequested] = useState(false); // the workflow's "Upload GSTR-2B" opens the import once

  const urlPeriod = PERIOD_RE.test(params.get("period") || "") ? params.get("period") : null;
  const period = urlPeriod || storedPeriod() || (periods.data ? pickDefaultPeriod(periods.data) : null);
  const tab = TABS.some((t) => t.value === params.get("tab")) ? params.get("tab") : "gstr2b";
  const status = params.get("status") || "";
  const group = params.get("group") || "";
  const view = params.get("view") || "";
  const filingId = Number(params.get("filing")) || null;

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const openTab = (t, extra = {}) => update({ tab: t === "gstr2b" ? "" : t, ...extra });

  /** The backend's next_step decides what to do; this only opens where it is done. */
  const onNextStep = (code, workflow) => {
    const step = NEXT_STEPS[code];
    if (!step) return;
    const filing = workflow?.gstr3b_claim?.filing;
    openTab(step.tab, {
      view: step.view || "", status: "", group: "",
      filing: step.action === "verify" && filing?.filing_id ? String(filing.filing_id) : "",
    });
    if (step.action === "import" && canManageGstItc) setImportRequested(true);
    if (step.action === "record" && canManageGstItc) setFilingPeriod(period);
  };

  useEffect(() => {
    if (!period) return;
    try {
      window.sessionStorage.setItem(PERIOD_KEY, period);
    } catch {
      /* storage unavailable - the URL still carries the period */
    }
  }, [period]);

  const current = periods.data?.find((p) => p.period === period);
  const title = current?.display_name || (period ? `Purchase Invoices · ${periodLabel(period)}` : "Purchase Invoices");

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Accounts Payable", to: AP_ROUTES.DASHBOARD }, { label: "GST input credit" }]} />
      <PageHeader
        title={title}
        subtitle="Reconcile purchase invoices with GSTR-2B, review eligible Input Tax Credit and track GSTR-3B claims."
        actions={period && (
          <GstPeriodSelect periods={periods.data || []} value={period}
            onChange={(p) => update({ period: p, status: "", group: "", filing: "" })} />
        )}
      />
      <PageGuide page="gst" />

      {!period ? (
        periods.isError ? <ErrorBlock error={periods.error} fallback="Could not load the return periods." /> : <LoadingBlock text="Loading return periods..." />
      ) : (
        <>
          <ItcOverview period={period} canManage={canManageGstItc} onNextStep={onNextStep}
            onOpenStage={(t) => openTab(t)} onSelectGroup={(g) => openTab("gstr2b", { group: g, status: "" })}
            onSelectStatus={(st) => openTab("gstr2b", { status: st, group: "" })} />

          <SegmentedTabs value={tab} onChange={(v) => openTab(v)} tabs={TABS} />

          {tab === "gstr2b" && (
            <Gstr2bPanel period={period} periods={periods.data || []} canManage={canManageGstItc}
              status={status} onStatusChange={(s) => update({ status: s })}
              group={group} onGroupChange={(g) => update({ group: g })}
              importRequested={importRequested} onImportHandled={() => setImportRequested(false)} onOpenItc={setItcInvoiceId} />
          )}
          {tab === "review" && (
            <ItcReviewPanel period={period} view={view} onViewChange={(v) => update({ view: v === "all" ? "" : v })} onOpenItc={setItcInvoiceId} />
          )}
          {tab === "filings" && (
            <Gstr3bFilingsPanel period={period} canManage={canManageGstItc} onRecordFiling={() => setFilingPeriod(period)}
              openFilingId={filingId} onOpenFiling={(id) => update({ filing: id ? String(id) : "" })} />
          )}
          {tab === "register" && (
            <ItcRegisterPanel period={period} canManage={canManageGstItc} onOpenItc={setItcInvoiceId}
              onRecordFiling={(p) => setFilingPeriod(p || period)} />
          )}
        </>
      )}

      {itcInvoiceId && (
        <ItcDetailDrawer invoiceId={itcInvoiceId} period={period} canManage={canManageGstItc} onClose={() => setItcInvoiceId(null)} />
      )}
      {filingPeriod !== undefined && canManageGstItc && (
        <RecordFilingModal defaultPeriod={filingPeriod} onClose={() => setFilingPeriod(undefined)} />
      )}
    </div>
  );
}
