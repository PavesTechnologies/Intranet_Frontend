import { AlertTriangle, Check, Minus, X } from "lucide-react";
import { formatDate } from "../../../utils/formatters";
import { STAGE_STATE } from "../../utils/invoiceWorkflowProgress";

const STATE_META = {
  [STAGE_STATE.COMPLETE]: { label: "Completed", circle: "bg-emerald-600 text-white border-emerald-600", text: "text-emerald-700", Icon: Check },
  [STAGE_STATE.CURRENT]: { label: "In progress", circle: "bg-blue-50 text-blue-700 border-blue-600", text: "text-blue-700" },
  [STAGE_STATE.PENDING]: { label: "Pending", circle: "bg-white text-gray-400 border-gray-300", text: "text-gray-500" },
  [STAGE_STATE.REJECTED]: { label: "Rejected", circle: "bg-red-600 text-white border-red-600", text: "text-red-700", Icon: X },
  [STAGE_STATE.FAILED]: { label: "Failed", circle: "bg-red-50 text-red-700 border-red-500", text: "text-red-700", Icon: AlertTriangle },
  [STAGE_STATE.BLOCKED]: { label: "Action needed", circle: "bg-amber-50 text-amber-700 border-amber-500", text: "text-amber-700", Icon: AlertTriangle },
  [STAGE_STATE.SKIPPED]: { label: "Not applicable", circle: "bg-gray-50 text-gray-400 border-dashed border-gray-300", text: "text-gray-400", Icon: Minus },
};

/**
 * Horizontal workflow progress (vertical list below `sm`). Purely presentational — stages come
 * from deriveWorkflowStages, never hardcoded here.
 * @param {{stages: Array<{key: string, label: string, state: string, note: string|null, timestamp: string|null}>}} props
 */
export default function InvoiceWorkflowTracker({ stages }) {
  return (
    <nav aria-label="Invoice workflow progress">
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-0">
        {stages.map((stage, index) => {
          const meta = STATE_META[stage.state] || STATE_META[STAGE_STATE.PENDING];
          const previous = stages[index - 1];
          const connectorDone = previous?.state === STAGE_STATE.COMPLETE;
          const Icon = meta.Icon;
          return (
            <li
              key={stage.key}
              className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-0 sm:px-2 sm:text-center"
              aria-current={stage.state === STAGE_STATE.CURRENT ? "step" : undefined}
              data-state={stage.state}
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-4 hidden h-0.5 w-full sm:block ${connectorDone ? "bg-emerald-500" : "bg-gray-200"}`}
                  style={{ marginRight: "1rem" }}
                />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${meta.circle} ${
                  stage.state === STAGE_STATE.CURRENT ? "ring-4 ring-blue-100" : ""
                }`}
              >
                {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <div className="min-w-0 sm:mt-2">
                <p className={`text-sm font-semibold ${stage.state === STAGE_STATE.PENDING ? "text-gray-500" : "text-gray-900"}`}>
                  {stage.label}
                </p>
                <p className={`text-xs font-medium ${meta.text}`}>{meta.label}</p>
                {stage.note && <p className="mt-0.5 text-xs text-gray-500">{stage.note}</p>}
                {stage.timestamp && (stage.state === STAGE_STATE.COMPLETE || stage.state === STAGE_STATE.REJECTED || stage.state === STAGE_STATE.FAILED) && (
                  <p className="mt-0.5 text-[11px] text-gray-400">{formatDate(stage.timestamp)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
