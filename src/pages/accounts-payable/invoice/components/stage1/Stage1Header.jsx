import { Info } from "lucide-react";
import { VALIDATION_STAGES } from "../InvoiceProcessingPipeline";

const STEP_LABELS = { extraction: "Extraction", vendor: "Vendor", buyer: "Buyer", gst: "GST Tax" };

const STATUS_TEXT = { SUCCESS: "Completed", RUNNING: "In Progress", FAILED: "Failed", SKIPPED: "Skipped", WAITING: "Waiting" };

const STATUS_COLOR = {
  SUCCESS: { circle: "border-emerald-500 text-emerald-600", text: "text-emerald-600" },
  RUNNING: { circle: "border-[#0A0082] text-[#0A0082]", text: "text-[#0A0082]" },
  FAILED: { circle: "border-red-500 text-red-600", text: "text-red-600" },
  SKIPPED: { circle: "border-gray-300 text-gray-400", text: "text-gray-400" },
  WAITING: { circle: "border-gray-300 text-gray-400", text: "text-gray-400" },
};

/**
 * Page header for the Stage 1 review screen: title/subtitle on the left, the four-stage numbered
 * status strip ("pipeline flow") on the right — driven entirely by `pipeline.validation.stages`,
 * the same backend stage data InvoiceProcessingPipeline already renders. Purely informational;
 * there's a single review form below regardless of these statuses, so this never switches
 * anything and never takes a click.
 */
export default function Stage1Header({ stages }) {
  return (
    <div className="mb-5 flex flex-col gap-4 border-b border-gray-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          Invoice Validation
          <Info
            className="h-4 w-4 text-gray-400"
            aria-hidden="true"
            title="Review the extracted fields against the original document before saving."
          />
        </h1>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-500">
          <span>Progress through Extraction, Vendor, Buyer, and GST Tax validation.</span>
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        {VALIDATION_STAGES.map((stage, index) => {
          const status = stages?.[stage.key]?.status || "WAITING";
          const colors = STATUS_COLOR[status] || STATUS_COLOR.WAITING;

          return (
            <div key={stage.key} className="flex items-center gap-2">
              <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${colors.circle}`}>
                {index + 1}
              </span>
              <span className="text-left leading-tight">
                <span className="block text-sm font-semibold text-gray-800">{STEP_LABELS[stage.key]}</span>
                <span className={`block text-xs font-medium ${colors.text}`}>{STATUS_TEXT[status]}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
