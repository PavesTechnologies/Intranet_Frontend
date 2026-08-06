import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import FormInput from "../../../../components/forms/FormInput";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { PAYMENT_METHODS } from "../../constants/paymentStatus";
import { usePaymentQueue } from "../hooks/usePaymentQueue";
import { useCreatePaymentBatch } from "../hooks/usePaymentBatches";
import usePaymentQueueStore from "../store/paymentQueueStore";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function PaymentProcessingPage() {
  const navigate = useNavigate();

  const selectedInvoiceIds = usePaymentQueueStore((state) => state.selectedInvoiceIds);
  const clearSelection = usePaymentQueueStore((state) => state.clearSelection);

  const { data: invoices = [], isLoading } = usePaymentQueue();
  const createBatchMutation = useCreatePaymentBatch();

  const [scheduledDate, setScheduledDate] = useState(todayIso());
  const [methodBreakdown, setMethodBreakdown] = useState({
    [PAYMENT_METHODS.ACH]: 60,
    [PAYMENT_METHODS.WIRE]: 30,
    [PAYMENT_METHODS.CHECK]: 10,
  });
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedInvoices = useMemo(
    () => invoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id)),
    [invoices, selectedInvoiceIds]
  );

  const totalAmount = selectedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const methodTotal = Object.values(methodBreakdown).reduce((sum, pct) => sum + Number(pct || 0), 0);
  const isMethodTotalValid = methodTotal === 100;

  const handleMethodChange = (method) => (e) => {
    const value = e.target.value;
    setMethodBreakdown((prev) => ({ ...prev, [method]: value === "" ? "" : Number(value) }));
  };

  const handleConfirmProcess = async () => {
    try {
      await createBatchMutation.mutateAsync({
        invoiceIds: selectedInvoiceIds,
        scheduledDate,
        methodBreakdown: Object.entries(methodBreakdown).map(([method, pct]) => ({
          method,
          pct: Number(pct || 0),
        })),
      });
      clearSelection();
      setShowConfirm(false);
      showStatusToast(`Payment batch created for ${selectedInvoices.length} invoice(s).`, "success");
      navigate("/accounts-payable/payments/history");
    } catch (error) {
      showStatusToast(error?.message || "Failed to process payment batch.", "error");
      setShowConfirm(false);
    }
  };

  if (!isLoading && selectedInvoiceIds.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payment Processing" subtitle="Review and schedule the selected payment run" />
        <PageCard>
          <PageCardContent className="text-center">
            <p className={Fonts.paragraph}>No invoices selected for processing.</p>
            <Link to="/accounts-payable/payments/queue" className={`${Fonts.link} mt-2 inline-block`}>
              Return to Payment Queue
            </Link>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  const rows = selectedInvoices.map((invoice) => ({
    invoiceNumber: invoice.id,
    vendor: invoice.vendorName,
    amount: formatCurrency(invoice.amount),
    dueDate: formatDate(invoice.dueDate),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Payment Processing" subtitle="Review and schedule the selected payment run" />

      {isLoading ? (
        <LoadingSpinner text="Loading selected invoices..." size="lg" />
      ) : (
        <>
          <PageCard>
            <PageCardContent>
              <h2 className={`${Fonts.subheading} mb-3`}>Selected Invoices ({selectedInvoices.length})</h2>
              <GenericTable
                headers={["Invoice #", "Vendor", "Amount", "Due Date"]}
                columns={["invoiceNumber", "vendor", "amount", "dueDate"]}
                rows={rows}
              />
            </PageCardContent>
          </PageCard>

          <PageCard>
            <PageCardContent className="space-y-4">
              <h2 className={Fonts.subheading}>Payment Method Breakdown</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormInput
                  label="ACH %"
                  name="ach"
                  type="number"
                  value={methodBreakdown[PAYMENT_METHODS.ACH]}
                  onChange={handleMethodChange(PAYMENT_METHODS.ACH)}
                />
                <FormInput
                  label="Wire %"
                  name="wire"
                  type="number"
                  value={methodBreakdown[PAYMENT_METHODS.WIRE]}
                  onChange={handleMethodChange(PAYMENT_METHODS.WIRE)}
                />
                <FormInput
                  label="Check %"
                  name="check"
                  type="number"
                  value={methodBreakdown[PAYMENT_METHODS.CHECK]}
                  onChange={handleMethodChange(PAYMENT_METHODS.CHECK)}
                />
              </div>

              {!isMethodTotalValid && (
                <p className="text-xs text-red-500">
                  Method breakdown must total 100% (currently {methodTotal}%).
                </p>
              )}

              <div className="max-w-xs">
                <FormDatePicker
                  label="Scheduled Date"
                  name="scheduledDate"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={todayIso()}
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="medium"
                  disabled={!isMethodTotalValid || !scheduledDate || selectedInvoices.length === 0}
                  onClick={() => setShowConfirm(true)}
                >
                  Confirm & Process Payment
                </Button>
              </div>
            </PageCardContent>
          </PageCard>
        </>
      )}

      <ConfirmationModal
        isOpen={showConfirm}
        title="Process Payment Batch"
        message={`This will mark ${selectedInvoices.length} invoices as paid for a total of ${formatCurrency(
          totalAmount
        )}. Continue?`}
        onConfirm={handleConfirmProcess}
        onCancel={() => setShowConfirm(false)}
        isLoading={createBatchMutation.isPending}
        confirmText="Process Payment"
        variant="success"
      />
    </div>
  );
}
