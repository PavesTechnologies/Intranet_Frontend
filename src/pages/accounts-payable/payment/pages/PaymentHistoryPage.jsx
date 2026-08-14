import { useState } from "react";
import { toast } from "react-toastify";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import StatusBadge from "../../../../components/status/statusbadge";
import Modal from "../../../../components/Modal/modal";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import FormInput from "../../../../components/forms/FormInput";
import { usePayments } from "../hooks/usePayments";
import { useUpdatePaymentStatusMutation } from "../hooks/usePaymentMutations";
import { useApLookups } from "../../hooks/useApLookups";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";

const HEADERS = ["Payment #", "Vendor", "Scheduled", "Paid", "Amount", "Method", "Reference", "Status", "Actions"];
const COLUMNS = ["id", "vendor", "scheduled", "paid", "amount", "method", "reference", "status", "actions"];

function StatusUpdateModal({ payment, statusOptions, isOpen, onClose }) {
  const updateStatus = useUpdatePaymentStatusMutation();
  const [statusCode, setStatusCode] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState(payment?.reference_number || "");

  if (!payment) return null;

  const handleSubmit = () => {
    if (!statusCode) {
      toast.warning("Select a status.");
      return;
    }
    updateStatus.mutate(
      {
        paymentId: payment.payment_id,
        payload: {
          status_code: statusCode,
          payment_date: paymentDate || null,
          reference_number: referenceNumber || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Payment status updated.");
          onClose();
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not update payment status.")),
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Payment #${payment.payment_id}`}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={updateStatus.isPending}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormSelect
          label="New Status"
          name="statusCode"
          options={[{ value: "", label: "Select status" }, ...statusOptions.map((s) => ({ value: s.code, label: s.label }))]}
          value={statusCode}
          onChange={(e) => setStatusCode(e.target.value)}
        />
        <FormDatePicker label="Payment Date (if cleared/sent)" name="paymentDate" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        <FormInput label="Reference Number" name="referenceNumber" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
      </div>
    </Modal>
  );
}

/** Payment list + status transitions against GET/PATCH /apm/payment. */
export default function PaymentHistoryPage() {
  const { paymentStatuses, paymentStatusOptions } = useApLookups();
  const [statusId, setStatusId] = useState("");
  const [activePayment, setActivePayment] = useState(null);

  const { payments, page, setPage, totalPages, isLoading, isError, error } = usePayments({
    statusId: statusId ? Number(statusId) : undefined,
  });

  const statusOptionsForModal = paymentStatuses.map((s) => ({ code: s.status_code, label: s.status_name }));
  const statusNameById = Object.fromEntries(paymentStatuses.map((s) => [s.status_id, s.status_name]));

  const rows = payments.map((payment) => ({
    id: payment.payment_id,
    vendor: `Vendor #${payment.vendor_id}`,
    scheduled: formatDate(payment.scheduled_date),
    paid: formatDate(payment.payment_date),
    amount: formatCurrency(Number(payment.total_amount)),
    method: payment.payment_method,
    reference: payment.reference_number || "—",
    status: payment.status_id ? <StatusBadge label={statusNameById[payment.status_id] || `#${payment.status_id}`} size="sm" /> : "—",
    actions: (
      <Button variant="outline" size="small" onClick={() => setActivePayment(payment)}>
        Update Status
      </Button>
    ),
  }));

  return (
    <div className="p-6">
      <PageHeader title="Payment History" subtitle="All payments and their current status" />

      <div className="mb-4 max-w-xs">
        <FormSelect
          label="Filter by Status"
          name="statusId"
          options={[{ value: "", label: "All Statuses" }, ...paymentStatusOptions]}
          value={statusId}
          onChange={(e) => setStatusId(e.target.value)}
        />
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(error, "Unable to load payments right now.")}
        </div>
      ) : (
        <>
          <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={isLoading} />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </>
      )}

      <StatusUpdateModal
        payment={activePayment}
        statusOptions={statusOptionsForModal}
        isOpen={Boolean(activePayment)}
        onClose={() => setActivePayment(null)}
      />
    </div>
  );
}
