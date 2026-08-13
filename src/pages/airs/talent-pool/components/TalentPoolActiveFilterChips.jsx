import React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function titleCase(value) {
  return String(value)
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function Chip({ label, onRemove }) {
  return (
    <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-semibold px-2.5 py-1 text-[11.5px] gap-1.5">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-slate-950" aria-label={`Remove ${label} filter`}>
        <X size={11} />
      </button>
    </Badge>
  );
}

// Shows every currently-applied filter (search text is shown separately —
// see TalentPoolFilters) as a removable chip. Removing one calls
// removeFilterValue from useTalentPool, which updates the applied filter
// state and refetches immediately — no "Apply" step for chip removal.
export default function TalentPoolActiveFilterChips({ filters, campaignOptions, onRemove }) {
  const campaignName = (id) => campaignOptions.find((c) => c.id === id)?.name || id;

  const hasAny =
    filters.locations.length > 0 ||
    filters.designations.length > 0 ||
    filters.degreeLevels.length > 0 ||
    filters.educationFields.length > 0 ||
    filters.campaignIds.length > 0 ||
    filters.pipelineStages.length > 0 ||
    filters.experienceMin !== "" ||
    filters.experienceMax !== "" ||
    filters.scoreMin !== "" ||
    filters.scoreMax !== "";

  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4">
      {filters.locations.map((v) => (
        <Chip key={`loc-${v}`} label={v} onRemove={() => onRemove("locations", v)} />
      ))}
      {filters.designations.map((v) => (
        <Chip key={`des-${v}`} label={v} onRemove={() => onRemove("designations", v)} />
      ))}
      {filters.degreeLevels.map((v) => (
        <Chip key={`deg-${v}`} label={titleCase(v)} onRemove={() => onRemove("degreeLevels", v)} />
      ))}
      {filters.educationFields.map((v) => (
        <Chip key={`edu-${v}`} label={v} onRemove={() => onRemove("educationFields", v)} />
      ))}
      {filters.campaignIds.map((v) => (
        <Chip key={`camp-${v}`} label={campaignName(v)} onRemove={() => onRemove("campaignIds", v)} />
      ))}
      {filters.pipelineStages.map((v) => (
        <Chip key={`stage-${v}`} label={titleCase(v)} onRemove={() => onRemove("pipelineStages", v)} />
      ))}
      {(filters.experienceMin !== "" || filters.experienceMax !== "") && (
        <Chip
          label={`${filters.experienceMin || "0"}-${filters.experienceMax || "∞"} Years`}
          onRemove={() => onRemove("experience")}
        />
      )}
      {(filters.scoreMin !== "" || filters.scoreMax !== "") && (
        <Chip
          label={`Score ${filters.scoreMin || "0"}-${filters.scoreMax || "100"}`}
          onRemove={() => onRemove("score")}
        />
      )}
    </div>
  );
}
