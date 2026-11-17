import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageGuide from "../../guide/components/PageGuide";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import { AP_ROUTES } from "../../constants/routes";
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
 * GST input credit for one return period: the backend's monthly overview, then GSTR-2B import and
 * reconciliation -> ITC eligibility review -> internal approval for GSTR-3B -> recorded GSTR-3B
 * filing -> second-user verification -> claim tracking. The period, tab and status filter live
 * in the URL (so links and Back keep them) and the period is also remembered for the session.
 */
export default function GstItcPage() {
  const { canManageGstItc } = useApPermissions();
  const [params, setParams] = useSearchParams();
  const periods = useGstPeriods();
  const [itcInvoiceId, setItcInvoiceId] = useState(null);
  const [filingPeriod, setFilingPeriod] = useState(undefined); // undefined = closed

  const urlPeriod = PERIOD_RE.test(params.get("period") || "") ? params.get("period") : null;
  const period = urlPeriod || storedPeriod() || (periods.data ? pickDefaultPeriod(periods.data) : null);
  const tab = TABS.some((t) => t.value === params.get("tab")) ? params.get("tab") : "gstr2b";
  const status = params.get("status") || "";

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
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
            onChange={(p) => update({ period: p, status: "" })} />
        )}
      />
      <PageGuide page="gst" />

      {!period ? (
        periods.isError ? <ErrorBlock error={periods.error} fallback="Could not load the return periods." /> : <LoadingBlock text="Loading return periods..." />
      ) : (
        <>
          <ItcOverview period={period} onSelectStatus={(s) => update({ tab: "gstr2b", status: s })} />

          <SegmentedTabs value={tab} onChange={(v) => update({ tab: v === "gstr2b" ? "" : v })} tabs={TABS} />

          {tab === "gstr2b" && (
            <Gstr2bPanel period={period} periods={periods.data || []} canManage={canManageGstItc}
              status={status} onStatusChange={(s) => update({ status: s })} onOpenItc={setItcInvoiceId} />
          )}
          {tab === "review" && <ItcReviewPanel period={period} onOpenItc={setItcInvoiceId} />}
          {tab === "filings" && (
            <Gstr3bFilingsPanel period={period} canManage={canManageGstItc} onRecordFiling={() => setFilingPeriod(period)} />
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
