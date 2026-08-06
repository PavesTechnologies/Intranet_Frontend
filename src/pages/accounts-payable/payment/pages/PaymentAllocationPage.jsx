import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import FormSelect from "../../../../components/forms/FormSelect";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import PaymentAllocationGrid from "../components/PaymentAllocationGrid";
import { usePaymentBatches, usePaymentBatch } from "../hooks/usePaymentBatches";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function PaymentAllocationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: batches = [], isLoading: isLoadingBatches } = usePaymentBatches();

  const [selectedBatchId, setSelectedBatchId] = useState(searchParams.get("batch") || "");

  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  const { data: batchDetail, isLoading: isLoadingBatch } = usePaymentBatch(selectedBatchId);

  const batchOptions = batches.map((batch) => ({ value: batch.id, label: batch.id }));

  const handleBatchChange = (e) => {
    const value = e.target.value;
    setSelectedBatchId(value);
    setSearchParams({ batch: value });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Payment Allocation" subtitle="See how a payment batch allocates across vendors" />

      <PageCard>
        <PageCardContent className="space-y-4">
          <div className="max-w-xs">
            <FormSelect
              label="Payment Batch"
              name="batch"
              options={batchOptions}
              value={selectedBatchId}
              onChange={handleBatchChange}
            />
          </div>

          {isLoadingBatches || isLoadingBatch ? (
            <LoadingSpinner text="Loading allocation..." />
          ) : batchDetail ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className={Fonts.smallText}>Scheduled Date</p>
                  <p className={Fonts.label}>{formatDate(batchDetail.scheduledDate)}</p>
                </div>
                <div>
                  <p className={Fonts.smallText}>Invoice Count</p>
                  <p className={Fonts.label}>{batchDetail.invoiceCount}</p>
                </div>
                <div>
                  <p className={Fonts.smallText}>Total Amount</p>
                  <p className={Fonts.label}>{formatCurrency(batchDetail.totalAmount)}</p>
                </div>
                <div>
                  <p className={Fonts.smallText}>Status</p>
                  <p className={Fonts.label}>{batchDetail.status}</p>
                </div>
              </div>

              <PaymentAllocationGrid batch={batchDetail} />
            </>
          ) : (
            <p className={Fonts.paragraphMuted}>Select a payment batch to view its allocation.</p>
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
}
