// Type reference for the Campaign feature, derived directly from the backend
// Pydantic schemas in Ai_Hiring_Module/app/schemas/campaign/*.py. Not enforced
// by a build-time type-checker (no tsconfig.json in this repo) — used for
// documentation/IDE hints only, mirroring the existing precedent at
// src/pages/Projects/types/index.ts. All actual components/services stay .jsx/.js.

export type CampaignStatus = "ACTIVE" | "PAUSED" | "CLOSED";

export type CampaignClosureReason =
  | "POSITION_FILLED"
  | "BUDGET_FREEZE"
  | "ROLE_CANCELLED"
  | "INTAKE_COMPLETE"
  | "OTHER";

export interface CampaignResponse {
  id: string;
  name: string;
  status: string;
  jd_title: string;
  jd_version: number;
  max_candidates: number | null;
  hiring_manager: string | null;
  candidate_count: number;
  shortlisted_count: number;
  deadline: string | null;
  created_at: string;
  approaching_cap: boolean;
  deadline_soon: boolean;
  overdue_review: boolean;
  pipeline_stalled: boolean;
  warning: string | null;
  duplicated_from_campaign_id: string | null;
  duplicated_from_campaign_name: string | null;
}

export interface CampaignMinimalResponse {
  id: string;
  name: string;
}

export interface CampaignCreateRequest {
  name: string;
  jd_id: string;
  max_candidates?: number | null;
  deadline?: string | null;
  weight_deterministic?: number;
  weight_semantic?: number;
  weight_ai?: number;
  semantic_threshold?: number;
  ai_threshold?: number;
  deterministic_threshold?: number;
  hiring_manager_id: string;
  recruiter_id: string;
}

export interface CampaignUpdateRequest {
  name?: string;
  status?: CampaignStatus;
  deadline?: string | null;
  clear_deadline?: boolean;
  max_candidates?: number | null;
  clear_max_candidates?: boolean;
  hiring_manager_id?: string;
  weight_deterministic?: number;
  weight_semantic?: number;
  weight_ai?: number;
  semantic_threshold?: number;
  ai_threshold?: number;
  deterministic_threshold?: number;
  confirm_scoring_change?: boolean;
}

export interface CampaignCloseRequest {
  closure_reason: CampaignClosureReason;
}

export interface CampaignClosureImpactSummaryResponse {
  candidate_count: number;
  stage_counts: Record<string, number>;
  in_progress_task_count: number;
  pending_human_decision_count: number;
  in_progress_bulk_job_count: number;
  warning: string;
}

export interface CampaignClosureResultResponse {
  campaign_id: string;
  campaign_name: string;
  closed_at: string;
  closure_reason: CampaignClosureReason;
  candidate_count: number;
  stage_counts: Record<string, number>;
  selected_count: number;
  rejected_count: number;
  tasks_cancelled_count: number;
  bulk_uploads_cancelled_count: number;
}

export interface JDReadinessIssue {
  code: string;
  message: string;
}

export interface CampaignReopenReadinessResponse {
  is_ready: boolean;
  issues: JDReadinessIssue[];
  campaign_id: string;
  campaign_name: string;
  jd_id: string;
  jd_title: string;
  max_candidates: number | null;
  candidate_count: number;
  deadline: string | null;
  weight_deterministic: number;
  weight_semantic: number;
  weight_ai: number;
}

export interface CampaignReopenResultResponse {
  campaign_id: string;
  campaign_name: string;
  status: string;
  reopened_at: string;
  deadline_cleared: boolean;
  original_closure_reason: string | null;
  closed_at: string | null;
  duration_closed_days: number | null;
}

export interface PauseImpactSummaryResponse {
  candidate_count: number;
  queued_task_count: number;
  processing_bulk_job_count: number;
  warning: string;
}

export interface ResumeSummaryResponse {
  paused_task_count: number;
  pending_resume_count: number;
  estimated_processing_seconds: number | null;
  warning: string;
}

export interface CampaignWeightPresetResponse {
  id: string;
  name: string;
  description: string | null;
  weight_deterministic: number;
  weight_semantic: number;
  weight_ai: number;
  deterministic_threshold: number;
  semantic_threshold: number;
  ai_threshold: number;
  created_by: string;
  created_at: string;
}

export interface CampaignWeightPresetCreateRequest {
  name: string;
  description?: string | null;
  weight_deterministic: number;
  weight_semantic: number;
  weight_ai: number;
  deterministic_threshold: number;
  semantic_threshold: number;
  ai_threshold: number;
}

export type CampaignWeightPresetUpdateRequest = CampaignWeightPresetCreateRequest;

export interface CampaignScoringConfigurationResponse {
  weight_deterministic: number;
  weight_semantic: number;
  weight_ai: number;
  semantic_threshold: number;
  ai_threshold: number;
  deterministic_threshold: number;
  total_weight: number;
  formula: string;
  layers: { layer: string; weight: number; threshold: number | null; description: string }[];
  defaults: CampaignScoringDefaultsResponse;
  warning: string | null;
}

export interface CampaignScoringDefaultsResponse {
  weight_deterministic: number;
  weight_semantic: number;
  weight_ai: number;
  semantic_threshold: number;
  ai_threshold: number;
}

export interface PlatformDefaultWeightsUpdateRequest {
  weight_deterministic: number;
  weight_semantic: number;
  weight_ai: number;
  semantic_threshold: number;
  ai_threshold: number;
}

export interface ProcessingStatusSummaryResponse {
  queued_count: number;
  running_count: number;
  retry_count: number;
  dead_count: number;
  paused_count: number;
  dead_letter_queue_count: number;
}

export interface DeadLetterQueueEntryResponse {
  id: string;
  task_type: string;
  final_error_message: string;
  retry_count: number;
  moved_to_dlq_at: string;
  last_attempted_at: string | null;
  campaign_candidate_id: string | null;
  replay_supported: boolean;
  replayed_at: string | null;
  resolution_notes: string | null;
}

export interface CampaignDetailResponse {
  id: string;
  campaign_info: {
    name: string;
    status: string;
    created_by_name: string | null;
    created_at: string;
    updated_at: string | null;
    duplicated_from_campaign_id: string | null;
    duplicated_from_campaign_name: string | null;
  };
  jd_configuration: {
    jd_id: string;
    jd_title: string;
    version_number: number;
    jurisdiction: string | null;
    mandatory_skill_count: number;
  };
  scoring_configuration: {
    weight_deterministic: number;
    weight_semantic: number;
    weight_ai: number;
    semantic_threshold: number;
    ai_threshold: number;
    deterministic_threshold: number;
  } | null;
  pipeline_limits: {
    max_candidates: number | null;
    current_candidate_count: number;
    deadline: string | null;
  };
  hiring_manager: { full_name: string; email: string } | null;
}
