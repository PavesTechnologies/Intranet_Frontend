// Mock data for the Resume tab — a mock parsed-resume record. No backend
// integration; the "preview" is a plain-text mock rendered in a PDF-page frame.
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
        durationYears: Math.max(1, candidate.experience - 2),
        highlights: [
          "Owned end-to-end delivery for the team's highest-priority workstream.",
          "Partnered with product and design to ship customer-facing features.",
        ],
      },
      {
        company: "Prior employer (parsed)",
        title: `Associate ${candidate.role}`,
        durationYears: Math.max(1, 2),
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
