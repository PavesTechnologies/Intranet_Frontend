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
    id: data.candidate_id ?? null,
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

    // No scoring data exists on this endpoint — the header's score rings
    // just render 0 until a real scoring source is wired in.
    deterministic: 0,
    semantic: 0,
    ats: 0,
    composite: 0,

    aiCandidateSummary: parsed.summary || null,

    // Resume tab fields — read directly off parsed_json, no synthesized data.
    skills: arr(parsed.skills),
    certifications: arr(parsed.certifications),
    workExperience: arr(parsed.work_experience).map((w) => ({
      title: textOrDash(w.title),
      company: textOrDash(w.company),
      startDate: w.start_date ?? null,
      endDate: w.end_date ?? null,
      isCurrent: !!w.is_current,
      highlights: (w.description ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    })),
    educationExtracted: arr(parsed.education).map((e) => ({
      degree: textOrDash(formatEducation(e)),
      institution: textOrDash(e.institution),
      year: textOrDash(e.graduation_year),
    })),
  };
}
