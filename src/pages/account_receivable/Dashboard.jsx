import PageHeader from "../../components/ui/PageHeader";

export default function AccountReceivableDashboard() {
  return (
    <>
      <PageHeader
        title="Account Receivable Dashboard"
        subtitle="Workspace for receivables, billing setup, and billing data acquisition."
      />
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Account Receivable Dashboard</h2>
      </section>
    </>
  );
}
