import { AlertTriangle, CheckCircle2, Circle, Loader2, MinusCircle, XCircle } from "lucide-react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";

export const VALIDATION_STAGES = [
  { key: "extraction", label: "Extraction Validation", runningText: "Validating extracted data..." },
  { key: "vendor", label: "Vendor Validation", runningText: "Validating vendor..." },
  { key: "buyer", label: "Buyer Validation", runningText: "Validating buyer..." },
  { key: "gst", label: "GST Tax Validation", runningText: "Validating GST tax details..." },
];

const SETTLED_STAGE_STATUSES = ["SUCCESS", "FAILED", "SKIPPED"];

const STATUS_ICON = {
  SUCCESS: { Icon: CheckCircle2, className: "text-emerald-600" },
  RUNNING: { Icon: Loader2, className: "animate-spin text-[#0A0082]" },
  FAILED: { Icon: XCircle, className: "text-red-600" },
  WAITING: { Icon: Circle, className: "text-gray-300" },
  SKIPPED: { Icon: MinusCircle, className: "text-gray-400" },
};

function StatusIcon({ status }) {
  const entry = STATUS_ICON[status] || STATUS_ICON.WAITING;
  const Icon = entry.Icon;
  return <Icon className={`h-5 w-5 shrink-0 ${entry.className}`} aria-hidden="true" />;
}

/** `ms` → "67 ms" below one second, "1.2 s" / "30.8 s" at or above it. */
export function formatDurationMs(ms) {
  if (ms == null || !Number.isFinite(ms)) return "";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function extractionDetailText(extraction) {
  if (extraction.status === "RUNNING") return "Extracting invoice data... This may take a few moments.";
  if (extraction.status === "FAILED") return extraction.errorMessage || "Unable to extract invoice data.";
  return "Invoice fields extracted successfully";
}

function validationStageDetailText(stage, status) {
  switch (status) {
    case "SUCCESS":
      return "Validation completed";
    case "RUNNING":
      return stage.runningText;
    case "FAILED":
      return "Validation failed";
    case "SKIPPED":
      return "Skipped";
    default:
      return "Waiting";
  }
}

function ValidationStageRow({ stage, stageState }) {
  const status = stageState?.status || "WAITING";
  const issues = Array.isArray(stageState?.issues) ? stageState.issues : [];

  return (
    <li className="flex items-start gap-3">
      <StatusIcon status={status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={`text-sm font-medium ${
              status === "FAILED"
                ? "text-red-700"
                : status === "WAITING" || status === "SKIPPED"
                ? "text-gray-400"
                : "text-gray-800"
            }`}
          >
            {stage.label}
          </span>
          {stageState?.duration_ms != null && (
            <span className="shrink-0 font-mono text-xs text-gray-400">{formatDurationMs(stageState.duration_ms)}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{validationStageDetailText(stage, status)}</p>
        {status === "FAILED" && issues.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {issues.map((issue, index) => (
              <li key={index} className="text-xs text-red-600">
                • {issue}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function resolveSummaryBanner(validation) {
  if (validation.status === "FAILED") {
    return {
      tone: "red",
      Icon: XCircle,
      title: "Invoice validation failed",
      subtitle: validation.errorMessage || "The validation job could not be completed.",
    };
  }

  if (validation.status !== "COMPLETED") return null;

  if (validation.isValid && !validation.requiresManualReview) {
    return {
      tone: "emerald",
      Icon: CheckCircle2,
      title: "Invoice Validation Complete",
      subtitle: "All validation stages passed.",
    };
  }

  if (validation.isValid && validation.requiresManualReview) {
    return {
      tone: "gray",
      Icon: AlertTriangle,
      title: "Validation completed — Manual review required",
      subtitle: null,
    };
  }

  return {
    tone: "red",
    Icon: XCircle,
    title: validation.requiresManualReview ? "Validation requires manual review" : "Invoice validation failed",
    subtitle: null,
  };
}

const BANNER_TONE_CLASSES = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  red: "border-red-200 bg-red-50 text-red-800",
  gray: "border-gray-200 bg-gray-50 text-gray-700",
};

/**
 * Renders the two-level Invoice Processing pipeline (Invoice Extraction, then the nested Invoice
 * Validation stages) purely from observed state — no fabricated sub-stages, percentages, or
 * durations. Orchestration (API calls, navigation) lives in InvoiceUploadPage; this component
 * only visualizes whatever state it's given.
 *
 * @param {Object} props
 * @param {string} props.fileName
 * @param {{status: "RUNNING"|"SUCCESS"|"FAILED", durationMs: number|null, errorMessage: string|null}} props.extraction
 * @param {null|{
 *   status: "QUEUED"|"RUNNING"|"COMPLETED"|"FAILED",
 *   stages: Record<string, {status: string, duration_ms: number|null, issues?: string[]}>,
 *   isValid: boolean|undefined,
 *   requiresManualReview: boolean|undefined,
 *   issues: string[],
 *   pollUnavailable?: boolean,
 *   errorMessage?: string,
 * }} props.validation
 */
export default function InvoiceProcessingPipeline({ fileName, extraction, validation }) {
  const stages = validation?.stages || {};
  const settledCount = VALIDATION_STAGES.filter((stage) =>
    SETTLED_STAGE_STATUSES.includes(stages[stage.key]?.status),
  ).length;
  const isValidationInFlight = validation && !["COMPLETED", "FAILED"].includes(validation.status);
  const banner = validation ? resolveSummaryBanner(validation) : null;

  const stageLevelIssues = new Set();
  VALIDATION_STAGES.forEach((stage) => {
    (stages[stage.key]?.issues || []).forEach((issue) => stageLevelIssues.add(issue));
  });
  const overallIssues = (validation?.issues || []).filter((issue) => !stageLevelIssues.has(issue));

  const liveAnnouncement = (() => {
    if (extraction.status === "RUNNING") return "Extracting invoice data";
    if (extraction.status === "FAILED") return "Invoice extraction failed";
    if (!validation) return "Invoice extraction complete";
    if (validation.status === "COMPLETED") return banner?.title || "Invoice validation complete";
    if (validation.status === "FAILED") return "Invoice validation failed";
    return "Invoice validation in progress";
  })();

  return (
    <PageCard>
      <PageCardContent>
        <p className="sr-only" aria-live="polite">
          {liveAnnouncement}
        </p>

        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Invoice Processing</h2>
          {fileName && <p className="mt-0.5 truncate text-xs text-gray-500">{fileName}</p>}
        </div>

        <div className="flex items-start gap-3">
          <StatusIcon status={extraction.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className={`text-sm font-medium ${extraction.status === "FAILED" ? "text-red-700" : "text-gray-900"}`}>
                Invoice Extraction
              </span>
              {extraction.status === "SUCCESS" && extraction.durationMs != null && (
                <span className="shrink-0 font-mono text-xs text-gray-400">{formatDurationMs(extraction.durationMs)}</span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{extractionDetailText(extraction)}</p>
          </div>
        </div>

        {validation && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Invoice Validation</h3>

            <ul className="ml-2 space-y-3 border-l border-gray-200 pl-4">
              {VALIDATION_STAGES.map((stage) => (
                <ValidationStageRow key={stage.key} stage={stage} stageState={stages[stage.key]} />
              ))}
            </ul>

            {isValidationInFlight && (
              <p className="mt-3 text-center text-xs text-gray-500">
                {settledCount} / {VALIDATION_STAGES.length} validation stages
              </p>
            )}

            {validation.pollUnavailable && (
              <p role="status" className="mt-3 flex items-center gap-2 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Unable to retrieve current validation status. Retrying...
              </p>
            )}

            {banner && (
              <div className={`mt-4 rounded-lg border p-3 ${BANNER_TONE_CLASSES[banner.tone]}`}>
                <div className="flex items-center gap-2">
                  <banner.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <p className="text-sm font-semibold">{banner.title}</p>
                </div>
                {banner.subtitle && <p className="mt-1 text-sm">{banner.subtitle}</p>}

                {overallIssues.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Issues</p>
                    <ul className="mt-1 space-y-1">
                      {overallIssues.map((issue, index) => (
                        <li key={index} className="text-sm">
                          • {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </PageCardContent>
    </PageCard>
  );
}
