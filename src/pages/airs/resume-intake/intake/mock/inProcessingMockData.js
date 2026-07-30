// Mock data for the "In Processing" tab on the Resume Intake list page.
// There is no backend endpoint yet for "resumes currently queued/parsing"
// (getAllResumes only returns finished history pages), so this mirrors that
// same request/response envelope ({ data: { items, total } }, same filter
// params) purely in memory. Swapping in a real endpoint later only means
// replacing getMockInProcessingResumes() below with a service call.

import { PARSE_STAGE_ORDER } from "../constants/intakeConstants";

export const MOCK_IN_PROCESSING_RESUMES = [
  {
    resume_id: "ip-0001",
    candidate_id: "cand-ip-0001",
    candidate_full_name: "Rahul Kapoor",
    candidate_email: "r***@gmail.com",
    file_format: "PDF",
    source: "bulk",
    campaign_id: "CMP-2041",
    campaign_name: "Senior Backend Engineer — Platform Team",
    parse_status: "PARSING",
    current_stage: "AI_EXTRACTION",
    created_at: "2026-07-30T09:58:10Z",
  },
  {
    resume_id: "ip-0002",
    candidate_id: "cand-ip-0002",
    candidate_full_name: "Meera Iyer",
    candidate_email: "m***@yahoo.com",
    file_format: "PDF",
    source: "bulk",
    campaign_id: "CMP-2041",
    campaign_name: "Senior Backend Engineer — Platform Team",
    parse_status: "PENDING",
    current_stage: null,
    created_at: "2026-07-30T09:58:12Z",
  },
  {
    resume_id: "ip-0003",
    candidate_id: "cand-ip-0003",
    candidate_full_name: "Arjun Malhotra",
    candidate_email: "a***@outlook.com",
    file_format: "DOCX",
    source: "bulk",
    campaign_id: "CMP-2042",
    campaign_name: "Frontend Engineer — Growth",
    parse_status: "PARSING",
    current_stage: "SKILL_NORMALIZATION",
    created_at: "2026-07-30T09:57:41Z",
  },
  {
    resume_id: "ip-0004",
    candidate_id: "cand-ip-0004",
    candidate_full_name: "Divya Sharma",
    candidate_email: "d***@gmail.com",
    file_format: "PDF",
    source: "individual",
    campaign_id: "CMP-2039",
    campaign_name: "DevOps / SRE — Infrastructure",
    parse_status: "PARSING",
    current_stage: "TEXT_CLEANING",
    created_at: "2026-07-30T10:01:02Z",
  },
  {
    resume_id: "ip-0005",
    candidate_id: "cand-ip-0005",
    candidate_full_name: "Karan Bhatt",
    candidate_email: "k***@company.com",
    file_format: "PDF",
    source: "bulk",
    campaign_id: "CMP-2042",
    campaign_name: "Frontend Engineer — Growth",
    parse_status: "PENDING",
    current_stage: null,
    created_at: "2026-07-30T09:58:15Z",
  },
  {
    resume_id: "ip-0006",
    candidate_id: "cand-ip-0006",
    candidate_full_name: "Neha Kulkarni",
    candidate_email: "n***@gmail.com",
    file_format: "DOCX",
    source: "bulk",
    campaign_id: "CMP-2036",
    campaign_name: "Data Scientist — Analytics",
    parse_status: "PARSING",
    current_stage: "EMBEDDING_GENERATION",
    created_at: "2026-07-30T09:55:03Z",
  },
];

function stageIndex(stage) {
  const idx = PARSE_STAGE_ORDER.indexOf(stage);
  return idx === -1 ? -1 : idx;
}

export function getStageProgressPct(stage) {
  const idx = stageIndex(stage);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / PARSE_STAGE_ORDER.length) * 100);
}

// Mutates the in-memory list to simulate the pipeline moving forward, so the
// "In Processing" tab visibly changes on each poll instead of sitting static.
// PENDING rows pick up work, PARSING rows step through PARSE_STAGE_ORDER, and
// rows that finish the last stage drop out of the list (as they would once a
// real backend reports PARSED and the row moves into upload history).
export function advanceMockInProcessing() {
  for (let i = MOCK_IN_PROCESSING_RESUMES.length - 1; i >= 0; i -= 1) {
    const row = MOCK_IN_PROCESSING_RESUMES[i];

    if (row.parse_status === "PENDING") {
      if (Math.random() < 0.4) {
        row.parse_status = "PARSING";
        row.current_stage = PARSE_STAGE_ORDER[0];
      }
      continue;
    }

    if (row.parse_status === "PARSING" && Math.random() < 0.5) {
      const nextIdx = stageIndex(row.current_stage) + 1;
      if (nextIdx >= PARSE_STAGE_ORDER.length) {
        MOCK_IN_PROCESSING_RESUMES.splice(i, 1);
      } else {
        row.current_stage = PARSE_STAGE_ORDER[nextIdx];
      }
    }
  }
}

export function getMockInProcessingResumes(filters = {}) {
  const { campaign_id, parse_status, source, sort_by = "created_at", sort_dir = "desc" } = filters;

  const items = MOCK_IN_PROCESSING_RESUMES.filter((row) => {
    if (campaign_id && row.campaign_id !== campaign_id) return false;
    if (parse_status && row.parse_status !== parse_status) return false;
    if (source && row.source !== source) return false;
    return true;
  }).sort((a, b) => {
    const dir = sort_dir === "asc" ? 1 : -1;
    if (sort_by === "parse_status") return a.parse_status.localeCompare(b.parse_status) * dir;
    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
  });

  return Promise.resolve({ data: { items, total: items.length } });
}
