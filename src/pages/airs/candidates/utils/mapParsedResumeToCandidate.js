// Adapts GET /airs/resumes/candidate/{campaign_candidate_id}/parsed-json into
// the full candidate shape CandidateHeader/SummaryTab/ResumeTab/
// CandidateOverridePanel/CandidateNotesPanel render — this is now the single
// data source for the Candidate Scorecard everywhere it's opened (Candidates
// tab, Pipeline Board, Interview Calendar, Resume Upload History), replacing
// the old GET /campaign-candidates/{id} detail call. The endpoint carries
// campaign_candidate_id/campaign_id/email/phone/pipeline_stage/hr_override/
// decision_*/scores/ai_candidate_summary directly now, so `fallback` (the
// row the caller navigated from) is only a stand-in for whatever a given
// backend response still leaves out — the API value always wins when present.
import { isEmpty, textOrDash, numberOr, arr, initialsFromName } from "./candidateDataUtils";

function currentOrLatestJob(workExperience) {
  return workExperience.find((w) => w.is_current) ?? workExperience[0] ?? {};
}

function formatEducation(education) {
  if (!education.degree && !education.field && !education.institution) return null;
  return [education.degree, education.field, education.institution].filter(Boolean).join(", ");
}

function formatDurationMonths(months) {
  if (months == null || Number.isNaN(Number(months))) return null;
  const total = Number(months);
  const years = Math.floor(total / 12);
  const rest = total % 12;
  if (years && rest) return `${years}y ${rest}m`;
  if (years) return `${years} yr${years > 1 ? "s" : ""}`;
  return `${rest} mo${rest === 1 ? "" : "s"}`;
}

// ai_candidate_summary comes back either as a plain string (older/plainer
// responses), a structured { recommendation, strengths, weaknesses } object
// (once AI evaluation has run), or null (not evaluated yet) — normalize all
// three into one shape so SummaryTab never has to sniff the type itself.
function normalizeAiSummary(raw) {
  if (isEmpty(raw)) return null;
  if (typeof raw === "string") return { recommendation: null, strengths: [], weaknesses: [], text: raw };
  return {
    recommendation: raw.recommendation ?? null,
    strengths: arr(raw.strengths),
    weaknesses: arr(raw.weaknesses),
    text: raw.text ?? null,
  };
}

export function mapParsedResumeToCandidate(raw, fallback = {}) {
  if (!raw) return null;
  const data = raw.data ?? raw;
  const parsed = data.parsed_json ?? {};
  const job = currentOrLatestJob(arr(parsed.work_experience));
  const primaryEducation = arr(parsed.education)[0] ?? {};
  const aiSummary = normalizeAiSummary(data.ai_candidate_summary);
  const name = parsed.full_name || fallback.name;

  return {
    // The Deterministic/Semantic/AI Evaluation tabs, notes panel, and
    // override actions all key off this — now returned directly by the
    // endpoint; `fallback` only covers a response that still omits it.
    id: data.campaign_candidate_id ?? data.campaignCandidateId ?? fallback.campaignCandidateId ?? null,
    candidateId: data.candidate_id ?? null,
    resumeId: data.resume_id ?? null,
    campaignId: data.campaign_id ?? fallback.campaignId ?? null,

    name: textOrDash(name),
    initials: initialsFromName(name),
    role: textOrDash(job.title ?? fallback.role),
    experience: numberOr(parsed.total_experience_years, 0),
    location: textOrDash(parsed.location ?? fallback.location),
    createdAt: textOrDash(data.created_at ?? fallback.createdAt),
    status: textOrDash(fallback.status ?? data.parse_status),
    email: textOrDash(data.email ?? fallback.email),
    phone: textOrDash(data.phone ?? fallback.phone),
    department: textOrDash(parsed.department),
    company: textOrDash(job.company),
    education: textOrDash(formatEducation(primaryEducation)),
    notice: textOrDash(fallback.notice),
    salary: textOrDash(fallback.salary),

    stage: textOrDash(data.pipeline_stage ?? fallback.stage),
    // Kept alongside the display-formatted `stage` above — panels compare
    // this against raw values ("REJECTED", "SCREENING"), so it must not be
    // dashed when absent.
    pipelineStage: data.pipeline_stage ?? fallback.stage ?? null,
    hrOverride: !!(data.hr_override ?? fallback.hrOverride),
    overrideReason: data.override_reason ?? fallback.overrideReason ?? null,
    decisionType: data.decision_type ?? fallback.decisionType ?? null,
    decisionSource: data.decision_source ?? fallback.decisionSource ?? null,
    decisionReason: data.decision_reason ?? fallback.decisionReason ?? null,
    decisionAt: data.decision_at ?? fallback.decisionAt ?? null,

    deterministic: numberOr(data.deterministic_score, 0),
    semantic: numberOr(data.semantic_score, 0),
    ats: numberOr(data.ai_ats_score, 0),
    composite: numberOr(data.composite_score, 0),
    risk: 0,

    matchedSkills: [],
    missingSkills: [],
    strengths: aiSummary?.strengths ?? [],
    weaknesses: aiSummary?.weaknesses ?? [],
    // The resume's own extracted professional summary — distinct from the
    // AI evaluation's recommendation below.
    summary: parsed.summary || "",
    aiCandidateSummary: aiSummary,

    // No score-breakdown endpoint backs this record directly — the
    // Deterministic tab fetches its own breakdown by `id` — these just keep
    // any tab that reads them off the shared candidate record from crashing.
    scoreBreakdown: {
      score: 0,
      status: "FAILED",
      mandatoryCoveragePct: 0,
      items: [],
      noVerifiedSkills: true,
      preferredSkillBonus: 0,
    },
    rawScoreBreakdown: {
      score_breakdown: {
        score: 0,
        status: "FAILED",
        mandatory_coverage_pct: 0,
        items: [],
        no_verified_skills: true,
        preferred_skill_bonus: 0,
      },
      experience_validation: {
        required_experience_years: 0,
        candidate_experience_years: parsed.total_experience_years ?? 0,
        tolerance_years: 0,
        result: "FAIL",
      },
      education_validation: {
        required_degree: "",
        candidate_degree: "",
        equivalent_experience_applied: false,
        result: "FAIL",
      },
      score_calculation: {
        skills_score: 0,
        experience_score: 0,
        education_score: 0,
        final_deterministic_score: 0,
      },
    },
    experienceValidation: {
      requiredExperience: 0,
      candidateExperience: parsed.total_experience_years ?? 0,
      toleranceYears: 0,
      result: "FAIL",
    },
    educationValidation: {
      requiredDegree: "",
      candidateDegree: "",
      equivalentExperienceApplied: false,
      result: "FAIL",
    },
    scoreCalculation: {
      skillsScore: 0,
      experienceScore: 0,
      educationScore: 0,
      finalScore: 0,
    },
    deterministicThreshold: 60,

    downloadUrl: data.download_url ?? null,
    originalFilename: data.original_filename ?? "Resume",
    fileFormat: data.file_format ?? "PDF",
    fileSizeBytes: data.file_size_bytes ?? 0,
    pageCount: data.page_count ?? 1,
    projects: arr(parsed.projects).map((p) => ({
      name: textOrDash(p.name),
      description: textOrDash(p.description),
      tech: arr(p.tech),
    })),

    // Resume tab fields — read directly off parsed_json, no synthesized data.
    skills: arr(parsed.skills),
    certifications: arr(parsed.certifications),
    workExperience: arr(parsed.work_experience).map((w) => ({
      title: textOrDash(w.title),
      company: textOrDash(w.company),
      startDate: w.start_date ?? null,
      endDate: w.end_date ?? null,
      isCurrent: !!w.is_current,
      duration: textOrDash(w.duration_text ?? formatDurationMonths(w.duration_months)),
      // Raw resume text often already carries its own bullet glyph
      // (•, -, *, ‣, …) per line — strip it so the UI's own bullet marker
      // doesn't double up with the source text's.
      highlights: (w.description ?? "")
        .split("\n")
        .map((line) => line.trim().replace(/^[•●○◦▪▫‣∙*\-–—]\s*/, ""))
        .filter(Boolean),
    })),
    educationExtracted: arr(parsed.education).map((e) => ({
      degree: textOrDash(formatEducation(e)),
      institution: textOrDash(e.institution),
      year: textOrDash(e.graduation_year),
    })),
  };
}
