import InvoiceQueueView from "../components/InvoiceQueueView";
import { QUEUE_TYPES } from "../../constants/queueTypes";

export default function InvoiceValidationQueuePage() {
  return (
    <InvoiceQueueView
      title="Validation Queue"
      subtitle="Invoices awaiting vendor, GST, PO, and amount validation"
      defaultQueueType={QUEUE_TYPES.VALIDATION}
    />
  );
}
