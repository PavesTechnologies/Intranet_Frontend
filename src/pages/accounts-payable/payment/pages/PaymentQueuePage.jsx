import React from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import PaymentQueueTable from "../components/PaymentQueueTable";
import PaymentBatchSummaryBar from "../components/PaymentBatchSummaryBar";
import { usePaymentQueue } from "../hooks/usePaymentQueue";
import usePaymentQueueStore from "../store/paymentQueueStore";

export default function PaymentQueuePage() {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading, isError, error } = usePaymentQueue();

  const selectedInvoiceIds = usePaymentQueueStore((state) => state.selectedInvoiceIds);
  const toggleInvoice = usePaymentQueueStore((state) => state.toggleInvoice);

  const selectedInvoices = invoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id));
  const totalAmount = selectedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  const handleStartPaymentRun = () => {
    if (selectedInvoiceIds.length === 0) return;
    navigate("/accounts-payable/payments/processing");
  };

  return (
    <div className="space-y-6 pb-4">
      <PageHeader title="Payment Queue" subtitle="Approved invoices ready for payment" />

      {isLoading && <LoadingSpinner text="Loading approved invoices..." size="lg" />}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load payment queue{error?.message ? `: ${error.message}` : "."}
        </div>
      )}

      {!isLoading && !isError && (
        <PageCard>
          <PageCardContent>
            <PaymentQueueTable
              invoices={invoices}
              selectedInvoiceIds={selectedInvoiceIds}
              onToggleInvoice={toggleInvoice}
            />
          </PageCardContent>
        </PageCard>
      )}

      {!isLoading && !isError && (
        <PaymentBatchSummaryBar
          selectedCount={selectedInvoiceIds.length}
          totalAmount={totalAmount}
          onStartPaymentRun={handleStartPaymentRun}
        />
      )}
    </div>
  );
}
