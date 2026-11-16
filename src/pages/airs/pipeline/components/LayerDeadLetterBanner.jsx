import React from "react";
import { AlertOctagon, Clock, RotateCcw } from "lucide-react";
import Button from "../../../../components/Button/Button";

// Upstream failures (Gemini/Google API errors) come through as the raw str()
// of the exception — pull out just the human-readable 'message' value, same
// as CampaignDetails' Dead Letter Queue section.
function extractErrorMessage(raw) {
  if (!raw) return raw;
  const match = raw.match(/['"]message['"]\s*:\s*['"]((?:[^'"\\]|\\.)*)['"]/);
  return match ? match[1] : raw;
}

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

// Shown above a scorecard layer tab whose task dead-lettered — explains why
// the tab has no data and lets a recruiter retry just that step (DLQ replay
// re-runs only the failed task, not the earlier layers). `failure` is the
// backend's LayerFailureResponse (tab endpoint `failure` / parsed-json
// `failed_layers`).
export default function LayerDeadLetterBanner({ layerLabel, failure, onRetry, retrying = false }) {
  if (!failure) return null;

  return (
    <div className="mb-4 p-3 rounded-xl border border-rose-200 bg-rose-50/60">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <AlertOctagon className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-rose-700">{layerLabel} did not complete for this candidate</p>
            <p className="text-xs text-rose-700 mt-1 truncate">
              {failure.error_summary || extractErrorMessage(failure.error_message)}
            </p>
            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {fmtDate(failure.last_attempted_at || failure.moved_to_dlq_at)}
            </p>
            {!failure.can_retry && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                This step can't be retried from here.
              </p>
            )}
          </div>
        </div>
        {failure.can_retry && (
          <Button
            variant="danger"
            size="small"
            loading={retrying}
            loadingText="Retrying..."
            onClick={() => onRetry(failure)}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retry {layerLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
