import { QUEUE_LABELS, getVisibleQueueTypes } from "../../constants/queueTypes";
import { useApPermissions } from "../../hooks/useApPermissions";

/**
 * Which tabs render at all is permission-driven (getVisibleQueueTypes), not a fixed list — an AP
 * Executive, an Approver, and a Finance Executive each see a different subset, matching exactly
 * what their UMS permissions let them act on. Validation is deliberately excluded from every
 * user's set — it's a backend processing stage, surfaced via the Status filter and the invoice
 * detail page instead of a top-level tab (QUEUE_TYPES.VALIDATION still exists for the standalone
 * Validation Queue page).
 */
export default function InvoiceStatusTabs({ activeQueueType, onChange }) {
  const permissions = useApPermissions();
  const visibleQueueTypes = getVisibleQueueTypes(permissions);

  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
      {visibleQueueTypes.map((queueType) => (
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
