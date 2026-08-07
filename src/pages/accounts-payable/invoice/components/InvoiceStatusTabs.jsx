import { QUEUE_TYPES, QUEUE_LABELS } from "../../constants/queueTypes";

// Explicit display order for existing QUEUE_TYPES keys — adding a new key to queueTypes.js
// and this list is all a future status needs to appear as a tab; no status strings are
// hardcoded here.
const TAB_ORDER = [
  QUEUE_TYPES.ALL_INVOICES,
  QUEUE_TYPES.OCR_REVIEW,
  QUEUE_TYPES.VALIDATION,
  QUEUE_TYPES.READY_FOR_PAYMENT,
  QUEUE_TYPES.PAID,
];

export default function InvoiceStatusTabs({ activeQueueType, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
      {TAB_ORDER.map((queueType) => (
        <button
          key={queueType}
          type="button"
          onClick={() => onChange(queueType)}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeQueueType === queueType
              ? "border-[#0A0082] text-[#0A0082]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {QUEUE_LABELS[queueType]}
        </button>
      ))}
    </div>
  );
}
