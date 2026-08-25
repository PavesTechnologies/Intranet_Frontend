// Adapts the raw GET /resumes/candidate/{candidate_id}/parsed-json response
// into the candidate shape CandidateHeader/SummaryTab/ResumeTab already
// render. This is the only data source for the Pipeline Candidate Scorecard —
// there is no scoring/campaign data available here, so score fields default
// to 0 and any field the resume parser doesn't extract (location, phone,
// department, notice period, salary, stage) falls back to a dash.
import { textOrDash, arr, initialsFromName } from "../../candidates/utils/candidateDataUtils";

function currentOrLatestJob(workExperience) {
  return workExperience.find((w) => w.is_current) ?? workExperience[0] ?? {};
}

function formatEducation(education) {
  if (!education.degree && !education.field && !education.institution) return null;
  return [education.degree, education.field, education.institution].filter(Boolean).join(", ");
}

export function mapParsedResumeToCandidate(raw, fallback = {}) {
  if (!raw) return null;
  const data = raw.data ?? raw;
  const parsed = data.parsed_json ?? {};
  const job = currentOrLatestJob(arr(parsed.work_experience));
  const primaryEducation = arr(parsed.education)[0] ?? {};

  return {
    // The Deterministic/Semantic/AI Evaluation tabs call
    // /campaign-candidates/{id}/... via candidate?.id — that needs
    // campaign_candidate_id specifically, not this resume's plain
    // candidate_id. The parsed-json response doesn't carry it, so it comes in
    // through `fallback` (from the Resume Upload History row that linked here).
    id: data.campaign_candidate_id ?? data.campaignCandidateId ?? fallback.campaignCandidateId ?? null,
    candidateId: data.candidate_id ?? null,
    resumeId: data.resume_id ?? null,

    name: textOrDash(fallback.name),
    initials: initialsFromName(fallback.name),
    role: textOrDash(job.title),
    experience: textOrDash(parsed.total_experience_years),
    location: textOrDash(fallback.location),
    createdAt: textOrDash(fallback.createdAt),
    status: textOrDash(fallback.status ?? data.parse_status),
    email: textOrDash(fallback.email),
    phone: textOrDash(fallback.phone),
    department: textOrDash(null),
    company: textOrDash(job.company),
    education: textOrDash(formatEducation(primaryEducation)),
    notice: textOrDash(null),
    salary: textOrDash(null),
    stage: textOrDash(fallback.stage),
    decisionType: fallback.decisionType ?? null,
    decisionSource: fallback.decisionSource ?? null,
    decisionReason: fallback.decisionReason ?? null,
    decisionAt: fallback.decisionAt ?? null,

    // No scoring data exists on this endpoint — the header's score rings
    // just render 0 until a real scoring source is wired in.
    deterministic: 0,
    semantic: 0,
    ats: 0,
    composite: 0,
    risk: 0,

    matchedSkills: [],
    missingSkills: [],
    strengths: [],
    weaknesses: [],
    summary: parsed.summary || "",

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

    aiCandidateSummary: parsed.summary || null,

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
      duration: textOrDash(w.duration_text),
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
