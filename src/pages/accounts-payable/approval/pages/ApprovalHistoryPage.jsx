import React, { useMemo, useState } from "react";
import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Searchbar from "../../../../components/filter/Searchbar";
import FilterListbox from "../../../../components/filter/FilterListbox";
import Pagination from "../../../../components/Pagination/pagination";
import GenericTable from "../../../../components/Table/table";
import StatusBadge from "../../../../components/status/statusbadge";
import { useApprovalHistory } from "../hooks/useApprovals";
import { INVOICE_STATUS } from "../../constants/invoiceStatus";
import { formatCurrency, formatDate } from "../../utils/formatters";

const PAGE_SIZE = 8;

const DECISION_OPTIONS = [
  { value: "all", label: "All Decisions" },
  { value: INVOICE_STATUS.APPROVED, label: "Approved" },
  { value: INVOICE_STATUS.REJECTED, label: "Rejected" },
];

const HEADERS = ["Invoice #", "Vendor", "Amount", "Decision", "Decided By", "Decided Date"];
const COLUMNS = ["invoiceNo", "vendor", "amount", "decision", "decidedBy", "decidedDate"];

export default function ApprovalHistoryPage() {
  const { data = [], isLoading, isError, error } = useApprovalHistory();
  const [search, setSearch] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((invoice) => {
      const matchesDecision = decisionFilter === "all" || invoice.status === decisionFilter;
      const matchesSearch =
        !query || invoice.id.toLowerCase().includes(query) || (invoice.vendorName || "").toLowerCase().includes(query);
      return matchesDecision && matchesSearch;
    });
  }, [data, search, decisionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageInvoices = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const rows = pageInvoices.map((invoice) => {
    const isApproved = invoice.status === INVOICE_STATUS.APPROVED;
    return {
      invoiceNo: invoice.id,
      vendor: invoice.vendorName,
      amount: formatCurrency(invoice.amount),
      decision: <StatusBadge label={invoice.status} size="sm" />,
      decidedBy: isApproved ? invoice.approvedBy || "—" : invoice.rejectedBy || "—",
      decidedDate: formatDate(isApproved ? invoice.approvedDate : invoice.rejectedDate),
    };
  });

  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleDecisionChange = (value) => {
    setDecisionFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Approval History" subtitle="Invoices that have already been approved or rejected." />

      <PageCard>
        <PageCardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="sm:flex-1">
              <Searchbar value={search} onChange={() => {}} onSearch={handleSearch} placeholder="Search invoice # or vendor..." />
            </div>
            <div className="w-full sm:w-56">
              <FilterListbox options={DECISION_OPTIONS} value={decisionFilter} onChange={handleDecisionChange} />
            </div>
          </div>

          {isError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load approval history{error?.message ? `: ${error.message}` : "."}
            </div>
          )}

          <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={isLoading} />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          />
        </PageCardContent>
      </PageCard>
    </div>
  );
}
