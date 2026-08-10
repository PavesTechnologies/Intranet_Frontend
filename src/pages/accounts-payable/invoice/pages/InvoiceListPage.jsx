import InvoiceQueueView from "../components/InvoiceQueueView";
import { QUEUE_TYPES } from "../../constants/queueTypes";

/** Primary Invoice Management page — route: /accounts-payable/invoices */
export default function InvoiceListPage() {
  return (
    <InvoiceQueueView
      title="Invoice Management"
      subtitle="Manage and track vendor invoices"
      defaultQueueType={QUEUE_TYPES.ALL_INVOICES}
      showUploadAction
      showKpis
    />
  );
}
