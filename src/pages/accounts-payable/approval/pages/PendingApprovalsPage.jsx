import React, { useMemo, useState } from "react";
import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import FilterListbox from "../../../../components/filter/FilterListbox";
import Pagination from "../../../../components/Pagination/pagination";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { useApprovals } from "../hooks/useApprovals";
import { APPROVAL_TIERS } from "../../constants/approvalTiers";
import ApprovalQueueTable from "../components/ApprovalQueueTable";
import ApprovalDecisionModal from "../components/ApprovalDecisionModal";

const PAGE_SIZE = 8;

const TIER_OPTIONS = [
  { value: "all", label: "All Tiers" },
  ...APPROVAL_TIERS.map((tier) => ({ value: tier.tier, label: tier.label })),
];

export default function PendingApprovalsPage() {
  const { data = [], isLoading, isError, error } = useApprovals();
  const [tierFilter, setTierFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const filtered = useMemo(
    () => (tierFilter === "all" ? data : data.filter((invoice) => invoice.tier === tierFilter)),
    [data, tierFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageInvoices = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleTierChange = (value) => {
    setTierFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Approvals"
        subtitle="Invoices awaiting your review, grouped by approval tier."
      />

      <PageCard>
        <PageCardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={Fonts.smallText}>
              {filtered.length} invoice{filtered.length === 1 ? "" : "s"} pending approval
            </p>
            <div className="w-full sm:w-56">
              <FilterListbox options={TIER_OPTIONS} value={tierFilter} onChange={handleTierChange} />
            </div>
          </div>

          {isError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load pending approvals{error?.message ? `: ${error.message}` : "."}
            </div>
          )}

          <ApprovalQueueTable
            invoices={pageInvoices}
            loading={isLoading}
            onReview={(invoice) => setSelectedInvoice(invoice)}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          />
        </PageCardContent>
      </PageCard>

      <ApprovalDecisionModal
        isOpen={Boolean(selectedInvoice)}
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
