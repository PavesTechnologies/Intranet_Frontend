import InvoiceQueueView from "../components/InvoiceQueueView";
import { QUEUE_TYPES } from "../../constants/queueTypes";

export default function InvoiceOcrReviewQueuePage() {
  return (
    <InvoiceQueueView
      title="OCR Review Queue"
      subtitle="Invoices awaiting OCR field review or correction"
      defaultQueueType={QUEUE_TYPES.OCR_REVIEW}
    />
  );
}
