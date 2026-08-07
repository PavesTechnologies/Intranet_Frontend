// Mock data for the Resume tab — a mock parsed-resume record, used as a
// fallback when the candidate record has no real parsed-resume data (e.g.
// CandidateScorePage, whose campaign-candidates detail endpoint doesn't
// return resume parsing results). No backend integration; the "preview" is
// a plain-text mock rendered in a PDF-page frame.
const CERTIFICATION_POOL = ["AWS Certified Solutions Architect", "Scrum Fundamentals Certified", "Google Cloud Professional", "PMP", "Certified Kubernetes Administrator"];
const PROJECT_POOL = [
  { name: "Internal Analytics Platform", description: "Led the migration of the reporting stack to a event-driven pipeline serving 40+ internal dashboards.", tech: ["React", "Node.js", "Kafka"] },
  { name: "Customer Self-Service Portal", description: "Built a self-service portal reducing support ticket volume by 28%.", tech: ["Next.js", "GraphQL", "PostgreSQL"] },
  { name: "ML Feature Store", description: "Designed a shared feature store used across three model-serving teams.", tech: ["Python", "Spark", "Redis"] },
];

function fileSlug(name) {
  return name.trim().replace(/\s+/g, "_");
}

export function getResumeMock(candidate) {
  const skillsExtracted = [...candidate.matchedSkills, ...candidate.missingSkills];

  return {
    file: {
      name: `${fileSlug(candidate.name)}_Resume.pdf`,
      sizeKb: 180 + (candidate.experience % 5) * 40,
      pageCount: candidate.experience > 8 ? 3 : 2,
      uploadedOn: candidate.appliedOn,
    },
    previewPages: [
      [
        candidate.name.toUpperCase(),
        `${candidate.role} · ${candidate.location}`,
        `${candidate.email}  |  ${candidate.phone}`,
        "",
        "PROFESSIONAL SUMMARY",
        candidate.summary,
        "",
        "CORE SKILLS",
        skillsExtracted.join(", "),
      ],
      [
        "WORK EXPERIENCE",
        `${candidate.role} — ${candidate.company}`,
        `${Math.max(1, candidate.experience - 2)}–${candidate.experience} yrs · ${candidate.location}`,
        "• Owned end-to-end delivery for the team's highest-priority workstream.",
        "• Partnered with product and design to ship customer-facing features.",
        "",
        "EDUCATION",
        candidate.education,
      ],
    ],
    skillsExtracted,
    experienceExtracted: [
      {
        company: candidate.company,
        title: candidate.role,
        durationLabel: `${Math.max(1, candidate.experience - 2)} yrs`,
        highlights: [
          "Owned end-to-end delivery for the team's highest-priority workstream.",
          "Partnered with product and design to ship customer-facing features.",
        ],
      },
      {
        company: "Prior employer (parsed)",
        title: `Associate ${candidate.role}`,
        durationLabel: "2 yrs",
        highlights: ["Contributed to core platform features under senior engineer guidance."],
      },
    ],
    educationExtracted: [
      {
        degree: candidate.education,
        institution: candidate.education.split(",").slice(1).join(",").trim() || "Not specified",
        year: 2026 - candidate.experience - 2,
      },
    ],
    projects: PROJECT_POOL.slice(0, 2 + (candidate.experience % 2)),
    certifications: CERTIFICATION_POOL.slice(0, 1 + (candidate.experience % 3)),
  };
}

// A candidate record carries real parsed-resume data (from
// GET /resumes/candidate/{candidateId}/parsed-json) when it has a `skills`
// array — only mapParsedResumeToCandidate sets this field.
export function hasRealResumeData(candidate) {
  return Array.isArray(candidate.skills);
}

// Resume tab view model built directly from parsed-json data — no synthesized
// fields. `file`/`previewPages` stay null/empty (no file metadata or raw text
// is returned by the backend yet) and `projects` stays empty (the resume
// parser doesn't extract a projects section) until those are added.
export function getResumeFromParsedData(candidate) {
  return {
    file: candidate.downloadUrl ? {
      name: candidate.originalFilename,
      sizeKb: Math.round(candidate.fileSizeBytes / 1024),
      pageCount: candidate.pageCount,
      url: candidate.downloadUrl,
      format: candidate.fileFormat,
    } : null,
    previewPages: [],
    skillsExtracted: candidate.skills,
    experienceExtracted: candidate.workExperience.map((w) => ({
      company: w.company,
      title: w.title,
      durationLabel: w.duration,
      highlights: w.highlights,
    })),
    educationExtracted: candidate.educationExtracted,
    projects: candidate.projects || [],
    certifications: candidate.certifications,
  };
}
