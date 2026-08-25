import React, { useState } from "react";
import { toast } from "react-toastify";
import Button from "@/components/Button/Button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase } from "lucide-react";
import { addTalentPoolCandidateToCampaign } from "../services/talentPoolService";
import { formatApiError } from "../../campaigns/services/campaignservice";
import CampaignPickerModal from "./CampaignPickerModal";

function initialsOf(name) {
  return (name || "??")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

// One card per candidate, sourced entirely from one GET /talent-pool/candidates
// item — skills/best_composite_score are already batched server-side
// (TalentPoolService.search_candidates), so this component makes no calls of
// its own to render. The "Eligible" badge isn't a response field: every
// candidate this search returns is ALREADY talent-pool eligible by
// construction (TalentPoolService.search_candidates only ever includes
// candidates with an eligible resume — see its own docstring), so it's
// shown as a fixed fact of this list, not a per-candidate value read off
// the item. Only the first 6 skills are previewed here (chips, not the
// summary paragraph) — they wrap onto a second line via flex-wrap rather
// than overflowing, and the button row still pins to the bottom (mt-auto)
// regardless of how many lines that takes. The Skills tab on the profile
// page still shows the candidate's full skill list.
const PRIMARY_SKILLS_COUNT = 6;

export default function TalentPoolCard({ item, onViewProfile, isSelected, onToggleSelect, onAdded }) {
  const { candidate, skills, best_composite_score: bestCompositeScore } = item;
  const primarySkills = (skills || []).slice(0, PRIMARY_SKILLS_COUNT);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleAddToCampaign = async (campaignId) => {
    try {
      await addTalentPoolCandidateToCampaign(candidate.candidate_id, campaignId);
      toast.success(`${candidate.full_name || "Candidate"} added to the campaign.`);
      setPickerOpen(false);
      onAdded?.();
    } catch (err) {
      toast.error(formatApiError(err, "Failed to add this candidate to the campaign."));
    }
  };

  return (
    <div className={`bg-white border rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow h-full flex flex-col ${isSelected ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"}`}>
      <div className="flex items-start gap-2.5 mb-3">
        {onToggleSelect && (
          <input
            type="checkbox"
            className="accent-indigo-600 h-4 w-4 shrink-0 mt-1"
            checked={!!isSelected}
            onChange={() => onToggleSelect(candidate.candidate_id)}
            aria-label={`Select ${candidate.full_name || "candidate"}`}
          />
        )}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
          {initialsOf(candidate.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="font-bold text-[13.5px] truncate text-slate-900 flex-1 min-w-0"
              title={candidate.full_name || "Unknown Candidate"}
            >
              {candidate.full_name || "Unknown Candidate"}
            </span>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-2 py-0.5 text-[9.5px] shrink-0">
              Eligible
            </Badge>
          </div>
          <div className="text-[11.5px] truncate text-slate-400">{candidate.designation || "—"}</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-1.5 text-center shrink-0">
          <div className="text-[8.5px] text-slate-400 leading-none">Overall</div>
          <div className="text-[13px] font-extrabold text-slate-900 leading-tight">{bestCompositeScore ?? "—"}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11.5px] text-slate-400 mb-2.5">
        {candidate.location && (
          <span className="flex items-center gap-1">
            <MapPin size={11} /> {candidate.location}
          </span>
        )}
        {candidate.experience != null && (
          <span className="flex items-center gap-1">
            <Briefcase size={11} /> {candidate.experience} yrs
          </span>
        )}
      </div>

      {primarySkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {primarySkills.map((s) => (
            <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1">
        <Button variant="outline" size="small" className="flex-1" onClick={onViewProfile}>
          View Profile
        </Button>
        <Button variant="primary" size="small" className="flex-1" onClick={() => setPickerOpen(true)}>
          Add To Campaign
        </Button>
      </div>

      <CampaignPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add to Campaign"
        description={`Add ${candidate.full_name || "this candidate"} to an active campaign.`}
        onConfirm={handleAddToCampaign}
      />
    </div>
  );
}
