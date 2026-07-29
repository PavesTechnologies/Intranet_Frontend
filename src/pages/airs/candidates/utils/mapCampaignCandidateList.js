// Adapts the raw GET /airs/campaign-candidates/campaign/{campaign_id} list
// response into the row shape CandidateTable / candidateUtils already expect.
// Nothing is computed — every value is read directly from the backend row.
import { textOrDash, numberOr, numberOrDash, initialsFromName } from "./candidateDataUtils";

export function mapCampaignCandidateRow(row = {}) {
  return {
    id: row.campaign_candidate_id ?? row.id ?? null,
    name: textOrDash(row.candidate_name),
    initials: initialsFromName(row.candidate_name),
    role: textOrDash(row.current_designation),
    // Plain-text score columns display "-" when missing; composite feeds a
    // ScoreRing gauge and experience is templated as "N yrs", so both need a
    // real number to avoid a broken arithmetic/render, hence the 0 fallback.
    deterministic: numberOrDash(row.deterministic_score),
    ats: numberOrDash(row.ai_ats_score),
    semantic: numberOrDash(row.semantic_score),
    composite: numberOr(row.composite_score, 0),
    experience: numberOr(row.experience, 0),
    location: textOrDash(row.location),
    stage: textOrDash(row.pipeline_stage),
    risk: numberOrDash(row.risk_score),
    starred: false,
  };
}

export function mapCampaignCandidateList(rawList) {
  return (Array.isArray(rawList) ? rawList : []).map(mapCampaignCandidateRow);
}
