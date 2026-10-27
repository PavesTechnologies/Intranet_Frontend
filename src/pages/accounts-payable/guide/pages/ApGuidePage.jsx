// Route: /accounts-payable/guide - "How Accounts Payable works": the whole flow from invoice to books,
// area by area, with the viewer's own part marked and every step linking to where it is done.
import { Link } from "react-router-dom";
import clsx from "clsx";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import { AP_ROUTES } from "../../constants/routes";
import { GLOSSARY, PAGE_GUIDES } from "../../constants/pageGuides";
import { useApPermissions } from "../../hooks/useApPermissions";
import { FlowSteps } from "../components/PageGuide";

// The order money moves through AP, and where each area lives.
const AREAS = [
  { key: "invoices", name: "Invoices", to: AP_ROUTES.INVOICE_LIST },
  { key: "payments", name: "Payments", to: AP_ROUTES.PAYMENT_READY },
  { key: "tdsTracking", name: "TDS", to: AP_ROUTES.TDS_TRACKING },
  { key: "gst", name: "GST input credit", to: AP_ROUTES.GST_ITC },
  { key: "recurring", name: "Recurring invoices", to: AP_ROUTES.RECURRING },
  { key: "notes", name: "Credit & debit notes", to: AP_ROUTES.VENDOR_NOTES },
  { key: "accountingExport", name: "Into the books", to: AP_ROUTES.ACCOUNTING_EXPORT },
];

export default function ApGuidePage() {
  const permissions = useApPermissions() || {};

  return (
    <div className="space-y-5 p-6">
      <Breadcrumb items={[{ label: "Accounts Payable", to: AP_ROUTES.DASHBOARD }, { label: "How it works" }]} />
      <PageHeader
        title="How Accounts Payable works"
        subtitle="From a vendor's invoice to the company's books. Your part is marked - each step opens the page where it is done."
      />

      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600" aria-label="The flow at a glance">
        {["Invoice arrives", "Reviewed", "Approved", "Ready for payment", "Paid (receipt)", "TDS deposited", "TDS filed", "GST claimed", "In the books"].map((s, i, all) => (
          <li key={s} className="flex items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">{s}</span>
            {i < all.length - 1 && <span aria-hidden="true" className="text-slate-300">→</span>}
          </li>
        ))}
      </ol>

      {AREAS.map((area) => {
        const guide = PAGE_GUIDES[area.key];
        if (!guide) return null;
        return (
          <section key={area.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">{area.name}</h2>
              <Link to={area.to} className="text-xs font-medium text-[#0A0082] hover:underline">Open {area.name.toLowerCase()} →</Link>
            </div>
            <p className="mt-1 text-sm text-slate-600">{guide.intro}</p>
            <div className="mt-3 space-y-4">
              {guide.flows.map((flow) => {
                const mine = flow.when(permissions);
                return (
                  <div key={flow.role || area.key} className={clsx("space-y-2", !mine && "opacity-60")}>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {flow.role || "Steps"}
                      {mine ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-emerald-700">Your part</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-slate-500">Done by someone else</span>
                      )}
                    </p>
                    <FlowSteps steps={mine ? flow.steps : flow.steps.map(({ to: _to, ...s }) => s)} />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="glossary-title">
        <h2 id="glossary-title" className="text-base font-semibold text-slate-900">Terms</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-2">
          {Object.entries(GLOSSARY).map(([term, meaning]) => (
            <div key={term} className="min-w-0">
              <dt className="text-sm font-semibold text-slate-800">{term}</dt>
              <dd className="text-sm text-slate-600">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
