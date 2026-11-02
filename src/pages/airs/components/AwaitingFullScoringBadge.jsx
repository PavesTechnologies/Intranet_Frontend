import React from "react";
import { Hourglass } from "lucide-react";

// A candidate the no-LLM fallback held for review (daily LLM cap or a provider outage): scored with
// the scan and rules only. Full scoring runs automatically once quota returns, and its outcome is
// applied unless someone has acted on the candidate in the meantime. The API flag is
// awaiting_full_scoring (mapped to awaitingFullScoring).
const TITLE =
  "Scored without the LLM (daily cap reached or provider unavailable). Full scoring runs automatically " +
  "when quota returns; its outcome is applied unless someone has acted on this candidate first.";

export default function AwaitingFullScoringBadge({ show, compact = false }) {
  if (!show) return null;
  return (
    <span
      title={TITLE}
      className={`inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 text-amber-800 font-semibold whitespace-nowrap ${
        compact ? "px-1.5 py-0.5 text-[9.5px]" : "px-2 py-0.5 text-[10.5px]"
      }`}
    >
      <Hourglass className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      Awaiting full scoring
    </span>
  );
}
