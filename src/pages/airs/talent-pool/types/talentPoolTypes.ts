// Type reference for the Talent Pool feature. Not enforced by a build-time
// type-checker (no tsconfig.json in this repo) — used for documentation/IDE
// hints only, mirroring the existing precedent at
// src/pages/airs/campaigns/types/campaignTypes.ts. All actual
// components/hooks stay .jsx/.js.
//
// The dedicated Talent Pool backend (services/talentPoolService.js) backs
// the list + profile page: GET /talent-pool/candidates (search) and
// GET /talent-pool/candidates/{candidate_id} (unified profile). Resume
// Versions / Campaign History stay on the general resume-versions endpoint
// (useResumeVersions) — the profile response only carries the latest
// campaign, not the full history.

export type ResumeParseStatus = "PENDING" | "PARSING" | "PARSED" | "FAILED";
export type PipelineStage = "UPLOADED" | "SCREENING" | "SHORTLISTED" | "SELECTED" | "REJECTED";

export interface CandidateInfo {
  candidate_id: string;
  full_name: string | null;
  email: string | null; // always masked server-side, never the raw address
  designation: string | null;
  experience: number | null;
  location: string | null;
  jurisdiction: string;
}

// One item of GET /talent-pool/candidates — powers the Talent Pool list
// (useTalentPool). Already deduped to one row per candidate server-side.
export interface TalentPoolSearchItem {
  candidate: CandidateInfo;
  matching_resume_id: string; // informational only, never a selection
  matching_resume_version: number;
  summary: string | null;
  skills: string[];
  best_composite_score: number | null;
}

// GET /talent-pool/candidates/{candidate_id} — powers the profile page
// (useTalentPoolProfile): header, Summary tab, Skills tab.
export interface TalentPoolCandidateProfile {
  candidate: CandidateInfo;
  consent: { consent_given: boolean; consent_timestamp: string | null; consent_version: string | null };
  talent_pool: { is_talent_pool_eligible: boolean; embedding_updated_at: string | null };
  resume: {
    resume_id: string | null;
    active_resume_version: number | null;
    uploaded_at: string | null;
    parse_status: ResumeParseStatus | null;
    summary: string | null;
  };
  campaign_summary: {
    total_campaigns: number;
    latest_campaign: string | null;
    latest_pipeline_stage: PipelineStage | null;
  };
  performance_summary: {
    best_composite_score: number | null;
    campaign_name: string | null;
    jd_title: string | null;
    average_composite_score: number | null;
    shortlisted_count: number;
    selected_count: number;
    total_campaigns: number;
    top_5_skills: string[];
  };
}

// One row of GET /resumes/candidate/{candidate_id}/versions — powers both
// ResumeVersionsTab and CampaignHistoryTab (useResumeVersions).
export interface ResumeVersionEntry {
  resume_id: string;
  version_number: number;
  file_format: string;
  parse_status: ResumeParseStatus;
  parse_confidence: number | null;
  uploaded_by: string;
  created_at: string;
  campaigns: { campaign_name: string; pipeline_stage: string }[];
}
