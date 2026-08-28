// Adapts GET /airs/resumes/candidate/{campaign_candidate_id}/parsed-json into
// the subset of fields SummaryTab/ResumeTab already know how to render.
// Merged onto the campaign-candidate record (mapCandidateScoreDetail.js) by
// the caller — never replaces it. Resume-only fields (skills, work
// experience, education, projects, certifications, file info) always come
// from here, since the campaign-candidates endpoint never sets them
// (hasRealResumeData in resumeMock.js switches ResumeTab to the real branch
// the moment `skills` is an array); department/location/experience/education
// are also included so the caller can fill gaps left blank on the
// campaign-candidate side, without this module deciding when that's safe —
// see mergeResumeFields.
import { textOrDash, arr } from "./candidateDataUtils";

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

export function mapParsedResumeFields(raw) {
  if (!raw) return null;
  const data = raw.data ?? raw;
  const parsed = data.parsed_json ?? {};
  const job = currentOrLatestJob(arr(parsed.work_experience));
  const primaryEducation = arr(parsed.education)[0] ?? {};

  return {
    department: parsed.department || null,
    location: parsed.location || null,
    experience: parsed.total_experience_years ?? null,
    education: formatEducation(primaryEducation),

    skills: arr(parsed.skills),
    certifications: arr(parsed.certifications),
    workExperience: arr(parsed.work_experience).map((w) => ({
      title: textOrDash(w.title),
      company: textOrDash(w.company),
      startDate: w.start_date ?? null,
      endDate: w.end_date ?? null,
      isCurrent: !!w.is_current,
      // The real backend sends a pre-formatted `duration_text` ("1 yr 4
      // mos"); `duration_months` is kept as a fallback in case a caller
      // ever sends the raw number instead.
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
    projects: arr(parsed.projects).map((p) => ({
      name: textOrDash(p.name),
      description: textOrDash(p.description),
      tech: arr(p.tech),
    })),

    downloadUrl: data.download_url ?? null,
    originalFilename: data.original_filename ?? "Resume",
    fileFormat: data.file_format ?? "PDF",
    fileSizeBytes: data.file_size_bytes ?? 0,
    pageCount: data.page_count ?? 1,
  };
}

// Merges parsed-resume fields onto the campaign-candidate record: resume-tab
// fields (skills, workExperience, ...) are always taken from the resume
// response since the campaign-candidate side never sets them; the
// gappy summary fields (department/location/experience/education) only
// fill in where the campaign-candidate response left a blank ("-", 0, or
// null) — a real value from that endpoint always wins.
export function mergeResumeFields(candidate, resumeFields) {
  if (!candidate) return candidate;
  if (!resumeFields) return candidate;
  return {
    ...candidate,
    department: candidate.department === "-" ? resumeFields.department || candidate.department : candidate.department,
    location: candidate.location === "-" ? resumeFields.location || candidate.location : candidate.location,
    experience: candidate.experience || resumeFields.experience || candidate.experience,
    education: candidate.education === "-" ? resumeFields.education || candidate.education : candidate.education,
    skills: resumeFields.skills,
    certifications: resumeFields.certifications,
    workExperience: resumeFields.workExperience,
    educationExtracted: resumeFields.educationExtracted,
    projects: resumeFields.projects,
    downloadUrl: resumeFields.downloadUrl,
    originalFilename: resumeFields.originalFilename,
    fileFormat: resumeFields.fileFormat,
    fileSizeBytes: resumeFields.fileSizeBytes,
    pageCount: resumeFields.pageCount,
  };
}
