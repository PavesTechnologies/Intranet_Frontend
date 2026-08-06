import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { usePaymentBatches } from "../hooks/usePaymentBatches";
import { formatCurrency, formatDate } from "../../utils/formatters";

const PAGE_SIZE = 10;

export default function PaymentHistoryPage() {
  const navigate = useNavigate();
  const { data: batches = [], isLoading, isError, error } = usePaymentBatches();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(batches.length / PAGE_SIZE));

  const pagedBatches = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return batches.slice(start, start + PAGE_SIZE);
  }, [batches, page]);

  const rows = pagedBatches.map((batch) => ({
    batchId: batch.id,
    scheduledDate: formatDate(batch.scheduledDate),
    completedDate: formatDate(batch.completedDate),
    invoiceCount: batch.invoiceCount,
    totalAmount: formatCurrency(batch.totalAmount),
    status: <StatusBadge label={batch.status} size="sm" />,
    actions: (
      <Button
        variant="outline"
        size="small"
        onClick={() => navigate(`/accounts-payable/payments/allocation?batch=${batch.id}`)}
      >
        View Allocation
      </Button>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Payment History" subtitle="Completed and scheduled payment batches" />

      {isLoading && <LoadingSpinner text="Loading payment history..." size="lg" />}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load payment history{error?.message ? `: ${error.message}` : "."}
        </div>
      )}

      {!isLoading && !isError && (
        <PageCard>
          <PageCardContent>
            <GenericTable
              headers={[
                "Batch ID",
                "Scheduled Date",
                "Completed Date",
                "Invoice Count",
                "Total Amount",
                "Status",
                "Actions",
              ]}
              columns={[
                "batchId",
                "scheduledDate",
                "completedDate",
                "invoiceCount",
                "totalAmount",
                "status",
                "actions",
              ]}
              rows={rows}
            />
            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </div>
          </PageCardContent>
        </PageCard>
      )}
    </div>
  );
}
