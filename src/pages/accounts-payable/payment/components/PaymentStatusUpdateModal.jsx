import { useState } from "react";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import FormInput from "../../../../components/forms/FormInput";
import { useUpdatePaymentStatusMutation } from "../hooks/usePaymentMutations";
import { getApiErrorMessage } from "../../utils/apiError";

/**
 * SCHEDULED -> SENT -> CLEARED / FAILED for a payment created through the scheduled flow
 * (PATCH /payment/{id}/status). Moved here unchanged from the old Payment History page so the
 * payment detail page keeps this capability; recorded payments are created CLEARED and never need it.
 * @param {{payment: {paymentId: number, referenceNumber?: string}|null, statusOptions: {code: string, label: string}[],
 *   isOpen: boolean, onClose: () => void, onUpdated?: () => void}} props
 */
export default function PaymentStatusUpdateModal({ payment, statusOptions, isOpen, onClose, onUpdated }) {
  const updateStatus = useUpdatePaymentStatusMutation();
  const [statusCode, setStatusCode] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState(payment?.referenceNumber || "");

  if (!payment) return null;

  const handleSubmit = () => {
    if (!statusCode) {
      toast.warning("Select a status.");
      return;
    }
    updateStatus.mutate(
      {
        paymentId: payment.paymentId,
        payload: {
          status_code: statusCode,
          payment_date: paymentDate || null,
          reference_number: referenceNumber || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Payment status updated.");
          onUpdated?.();
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
      title={`Update Payment #${payment.paymentId}`}
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
