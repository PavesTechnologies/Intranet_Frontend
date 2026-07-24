// Mock data for the resume intake -> parsing -> review flow.
// Shapes mirror the real backend contract exactly (resume record, processing status,
// parsed_json, candidate_skills) so wiring real endpoints later is a drop-in replacement
// for the functions below, not a redesign.

export const PARSE_STAGE_ORDER = [
  "TEXT_EXTRACTION",
  "TEXT_CLEANING",
  "AI_EXTRACTION",
  "JSON_VALIDATION",
  "SKILL_NORMALIZATION",
  "EMBEDDING_GENERATION",
  "PERSISTENCE",
];

export const MOCK_CAMPAIGNS = [
  { id: "CMP-2041", name: "Senior Backend Engineer — Platform Team" },
  { id: "CMP-2042", name: "Frontend Engineer — Growth" },
  { id: "CMP-2039", name: "DevOps / SRE — Infrastructure" },
  { id: "CMP-2036", name: "Data Scientist — Analytics" },
];

function buildStages(overrides = {}) {
  return PARSE_STAGE_ORDER.map((stage) => ({
    stage,
    status: "PENDING",
    duration_ms: null,
    error_message: null,
    ...(overrides[stage] || {}),
  }));
}

// ---------------------------------------------------------------------------
// Resume records (list). One per mock candidate, each exercising a different
// parse_status so every visual state in the review screen is reachable.
// ---------------------------------------------------------------------------
export const MOCK_RESUMES = [
  {
    resume_id: "b3f1c2a0-1e4d-4a6b-9c3f-8a2d5e7f10a1",
    candidate_id: "c1a1b2c3-1111-4a1a-9a1a-1a1a1a1a1a1a",
    candidate_name: "Ananya Rao",
    candidate_email_masked: "a***@gmail.com",
    file_format: "PDF",
    version_number: 1,
    parse_status: "PARSED",
    parse_confidence_score: 0.93,
    parser_version: "resume-parser-v3.2.1",
    parse_duration_ms: 8420,
    created_at: "2026-07-18T10:12:04Z",
  },
  {
    resume_id: "d94a7e3b-2f5c-4b8d-8e1a-3c6b9d0e21b2",
    candidate_id: "c2b2c3d4-2222-4b2b-9b2b-2b2b2b2b2b2b",
    candidate_name: "Vikram Desai",
    candidate_email_masked: "v***@outlook.com",
    file_format: "DOCX",
    version_number: 2,
    parse_status: "PARSED",
    parse_confidence_score: 0.42,
    parser_version: "resume-parser-v3.2.1",
    parse_duration_ms: 6110,
    created_at: "2026-07-17T15:44:31Z",
  },
  {
    resume_id: "f27b6c1d-3a6e-4c9f-8f2b-4d7c0e1f32c3",
    candidate_id: "c3c3d4e5-3333-4c3c-9c3c-3c3c3c3c3c3c",
    candidate_name: "Sanjay Mehta",
    candidate_email_masked: "s***@yahoo.com",
    file_format: "PDF",
    version_number: 1,
    parse_status: "FAILED",
    parse_confidence_score: null,
    parser_version: "resume-parser-v3.2.1",
    parse_duration_ms: 2340,
    created_at: "2026-07-19T08:03:12Z",
  },
  {
    resume_id: "a18e5d0c-4b7f-4d0a-9a3c-5e8d1f2a43d4",
    candidate_id: "c4d4e5f6-4444-4d4d-9d4d-4d4d4d4d4d4d",
    candidate_name: "Priya Nair",
    candidate_email_masked: "p***@company.com",
    file_format: "PDF",
    version_number: 1,
    parse_status: "PARSING",
    parse_confidence_score: null,
    parser_version: "resume-parser-v3.2.1",
    parse_duration_ms: null,
    created_at: "2026-07-20T09:31:55Z",
  },
];

// ---------------------------------------------------------------------------
// Processing status, keyed by task_id (== resume_id here for simplicity of
// the mock; the real API returns an independent task_id).
// ---------------------------------------------------------------------------
export const MOCK_PROCESSING_STATUS = {
  "b3f1c2a0-1e4d-4a6b-9c3f-8a2d5e7f10a1": {
    task_id: "task-b3f1c2a0",
    overall_status: "SUCCESS",
    current_stage: null,
    stages: buildStages({
      TEXT_EXTRACTION: { status: "SUCCESS", duration_ms: 640 },
      TEXT_CLEANING: { status: "SUCCESS", duration_ms: 210 },
      AI_EXTRACTION: { status: "SUCCESS", duration_ms: 4820 },
      JSON_VALIDATION: { status: "SUCCESS", duration_ms: 180 },
      SKILL_NORMALIZATION: { status: "SUCCESS", duration_ms: 1340 },
      EMBEDDING_GENERATION: { status: "SUCCESS", duration_ms: 980 },
      PERSISTENCE: { status: "SUCCESS", duration_ms: 250 },
    }),
    error_message: null,
  },
  "d94a7e3b-2f5c-4b8d-8e1a-3c6b9d0e21b2": {
    task_id: "task-d94a7e3b",
    overall_status: "SUCCESS",
    current_stage: null,
    stages: buildStages({
      TEXT_EXTRACTION: { status: "SUCCESS", duration_ms: 710 },
      TEXT_CLEANING: { status: "SUCCESS", duration_ms: 260 },
      AI_EXTRACTION: { status: "SUCCESS", duration_ms: 5210 },
      JSON_VALIDATION: { status: "SUCCESS", duration_ms: 190 },
      SKILL_NORMALIZATION: { status: "SUCCESS", duration_ms: 1120 },
      EMBEDDING_GENERATION: { status: "SUCCESS", duration_ms: 890 },
      PERSISTENCE: { status: "SUCCESS", duration_ms: 240 },
    }),
    error_message: null,
  },
  "f27b6c1d-3a6e-4c9f-8f2b-4d7c0e1f32c3": {
    task_id: "task-f27b6c1d",
    overall_status: "FAILURE",
    current_stage: "AI_EXTRACTION",
    stages: buildStages({
      TEXT_EXTRACTION: { status: "SUCCESS", duration_ms: 590 },
      TEXT_CLEANING: { status: "SUCCESS", duration_ms: 200 },
      AI_EXTRACTION: {
        status: "FAILED",
        duration_ms: 1550,
        error_message:
          "LLM extraction returned malformed JSON after 3 retries: unterminated string starting at position 812. Source text density suggests a scanned/image-based PDF with low OCR confidence.",
      },
    }),
    error_message:
      "LLM extraction returned malformed JSON after 3 retries: unterminated string starting at position 812.",
  },
  "a18e5d0c-4b7f-4d0a-9a3c-5e8d1f2a43d4": {
    task_id: "task-a18e5d0c",
    overall_status: "RUNNING",
    current_stage: "SKILL_NORMALIZATION",
    stages: buildStages({
      TEXT_EXTRACTION: { status: "SUCCESS", duration_ms: 655 },
      TEXT_CLEANING: { status: "SUCCESS", duration_ms: 225 },
      AI_EXTRACTION: { status: "SUCCESS", duration_ms: 4390 },
      JSON_VALIDATION: { status: "SUCCESS", duration_ms: 175 },
      SKILL_NORMALIZATION: { status: "RUNNING", duration_ms: null },
    }),
    error_message: null,
  },
};

// ---------------------------------------------------------------------------
// parsed_json, keyed by resume_id. Null where the resume has no successful
// extraction yet (FAILED / still PARSING).
// ---------------------------------------------------------------------------
export const MOCK_PARSED_JSON = {
  "b3f1c2a0-1e4d-4a6b-9c3f-8a2d5e7f10a1": {
    skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "React", "Redis", "Kubernetes", "Kafka", "Terraform"],
    work_experience: [
      {
        title: "Senior Backend Engineer",
        company: "Acme Corp",
        start_date: "Jan 2021",
        end_date: null,
        is_current: true,
        is_internship: false,
        is_volunteer: false,
        description:
          "Led migration to microservices architecture, reducing deployment time by 60%. Owns the payments and ledger services handling 2M+ transactions/day.",
      },
      {
        title: "Backend Engineer",
        company: "Nimbus Systems",
        start_date: "Jul 2018",
        end_date: "Dec 2020",
        is_current: false,
        is_internship: false,
        is_volunteer: false,
        description: "Built REST APIs for the internal billing platform and improved query performance across the reporting pipeline.",
      },
      {
        title: "Software Engineering Intern",
        company: "Startup Inc",
        start_date: "Jun 2017",
        end_date: "Aug 2017",
        is_current: false,
        is_internship: true,
        is_volunteer: false,
        description: "Built internal tooling for support ticket triage and automated deployment scripts.",
      },
      {
        title: "Volunteer Tech Mentor",
        company: "Code for Good",
        start_date: "Jan 2019",
        end_date: null,
        is_current: true,
        is_internship: false,
        is_volunteer: true,
        description: "Mentors early-career developers from underrepresented backgrounds on backend fundamentals.",
      },
    ],
    education: [
      { degree: "Bachelor of Science", institution: "State University", field: "Computer Science", graduation_year: 2017 },
    ],
    certifications: ["AWS Certified Solutions Architect", "Certified Kubernetes Administrator"],
    total_experience_years: 8.5,
    summary:
      "Backend engineer with 8+ years building scalable distributed systems, specializing in high-throughput payments infrastructure and cloud-native architecture.",
  },
  "d94a7e3b-2f5c-4b8d-8e1a-3c6b9d0e21b2": {
    skills: ["Excel", "Communication", "SQL"],
    work_experience: [
      {
        title: "Operations Analyst",
        company: "Regional Logistics Pvt Ltd",
        start_date: "Mar 2022",
        end_date: null,
        is_current: true,
        is_internship: false,
        is_volunteer: false,
        description: "Coordinates shipment scheduling across three regional hubs and maintains vendor reporting sheets.",
      },
    ],
    education: [
      { degree: "Bachelor of Commerce", institution: "City College", field: null, graduation_year: 2021 },
    ],
    certifications: [],
    total_experience_years: null,
    summary: null,
  },
  "f27b6c1d-3a6e-4c9f-8f2b-4d7c0e1f32c3": null,
  "a18e5d0c-4b7f-4d0a-9a3c-5e8d1f2a43d4": null,
};

// ---------------------------------------------------------------------------
// candidate_skills (normalized), keyed by resume_id.
// ---------------------------------------------------------------------------
export const MOCK_CANDIDATE_SKILLS = {
  "b3f1c2a0-1e4d-4a6b-9c3f-8a2d5e7f10a1": [
    { canonical_skill_id: "sk-py", canonical_name: "Python", raw_extracted_text: "Python", match_tier: "case_insensitive", confidence: 0.99, scoring_weight: 1.0, status: "AUTO_VERIFIED" },
    { canonical_skill_id: "sk-fastapi", canonical_name: "FastAPI", raw_extracted_text: "FastAPI", match_tier: "alias", confidence: 0.97, scoring_weight: 0.9, status: "AUTO_VERIFIED" },
    { canonical_skill_id: "sk-postgres", canonical_name: "PostgreSQL", raw_extracted_text: "PostgreSQL", match_tier: "case_insensitive", confidence: 0.98, scoring_weight: 0.9, status: "AUTO_VERIFIED" },
    { canonical_skill_id: "sk-docker", canonical_name: "Docker", raw_extracted_text: "Docker", match_tier: "case_insensitive", confidence: 0.98, scoring_weight: 0.85, status: "AUTO_VERIFIED" },
    { canonical_skill_id: "sk-aws", canonical_name: "AWS", raw_extracted_text: "AWS", match_tier: "alias", confidence: 0.96, scoring_weight: 0.9, status: "AUTO_VERIFIED" },
    { canonical_skill_id: "sk-react", canonical_name: "React", raw_extracted_text: "React", match_tier: "case_insensitive", confidence: 0.95, scoring_weight: 0.6, status: "AUTO_VERIFIED" },
    { canonical_skill_id: "sk-redis", canonical_name: "Redis", raw_extracted_text: "Redis", match_tier: "case_insensitive", confidence: 0.97, scoring_weight: 0.7, status: "AUTO_VERIFIED" },
    { canonical_skill_id: "sk-k8s", canonical_name: "Kubernetes", raw_extracted_text: "Kubernetes", match_tier: "alias", confidence: 0.94, scoring_weight: 0.85, status: "AUTO_VERIFIED" },
    { canonical_skill_id: "sk-kafka", canonical_name: "Kafka", raw_extracted_text: "Kafk", match_tier: "fuzzy", confidence: 0.68, scoring_weight: 0.75, status: "PENDING_REVIEW" },
    { canonical_skill_id: null, canonical_name: null, raw_extracted_text: "Terraform CDK internal wrapper", match_tier: "unknown", confidence: 0.21, scoring_weight: 0, status: "PENDING_REVIEW" },
  ],
  "d94a7e3b-2f5c-4b8d-8e1a-3c6b9d0e21b2": [
    { canonical_skill_id: "sk-excel", canonical_name: "Microsoft Excel", raw_extracted_text: "Excel", match_tier: "vector", confidence: 0.71, scoring_weight: 0.4, status: "PENDING_REVIEW" },
    { canonical_skill_id: null, canonical_name: null, raw_extracted_text: "Communication", match_tier: "unknown", confidence: 0.15, scoring_weight: 0, status: "PENDING_REVIEW" },
    { canonical_skill_id: "sk-sql", canonical_name: "SQL", raw_extracted_text: "SQL", match_tier: "case_insensitive", confidence: 0.92, scoring_weight: 0.5, status: "AUTO_VERIFIED" },
  ],
  "f27b6c1d-3a6e-4c9f-8f2b-4d7c0e1f32c3": [],
  "a18e5d0c-4b7f-4d0a-9a3c-5e8d1f2a43d4": [],
};

let sequence = 4;

// Builds a brand-new resume record + matching processing status for a
// freshly submitted upload, in the same shape a real "create intake" +
// polling endpoint would return.
export function createMockIntake({ candidateName, candidateEmail }) {
  sequence += 1;
  const resumeId = `mock-resume-${sequence}-${Math.floor(Math.random() * 1e6).toString(16)}`;
  const taskId = `mock-task-${sequence}`;
  const maskedEmail = maskEmail(candidateEmail);

  const resume = {
    resume_id: resumeId,
    candidate_id: `mock-candidate-${sequence}`,
    candidate_name: candidateName,
    candidate_email_masked: maskedEmail,
    file_format: "PDF",
    version_number: 1,
    parse_status: "PENDING",
    parse_confidence_score: null,
    parser_version: "resume-parser-v3.2.1",
    parse_duration_ms: null,
    created_at: new Date().toISOString(),
  };

  const status = {
    task_id: taskId,
    overall_status: "QUEUED",
    current_stage: null,
    stages: buildStages(),
    error_message: null,
  };

  registerMockIntake(resume, status);
  return { resume, status };
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return "u***@example.com";
  const [local, domain] = email.split("@");
  return `${local.charAt(0)}***@${domain}`;
}

// --- Lookups -----------------------------------------------------------
// A real integration replaces these four with GET calls against the resume
// and candidate-skills endpoints; callers already treat the results as
// async-shaped data (see useResumeReview), so the swap is a body-only change.

export function getResumeById(resumeId) {
  return MOCK_RESUMES.find((r) => r.resume_id === resumeId) || null;
}

export function getProcessingStatusByResumeId(resumeId) {
  return MOCK_PROCESSING_STATUS[resumeId] || null;
}

export function getParsedJsonByResumeId(resumeId) {
  return MOCK_PARSED_JSON[resumeId] ?? null;
}

export function getCandidateSkillsByResumeId(resumeId) {
  return MOCK_CANDIDATE_SKILLS[resumeId] ?? [];
}

// Registers a freshly created intake (from createMockIntake) into the same
// lookup tables the demo history reads from, so it becomes reachable by id.
export function registerMockIntake(resume, status) {
  MOCK_RESUMES.unshift(resume);
  MOCK_PROCESSING_STATUS[resume.resume_id] = status;
  MOCK_PARSED_JSON[resume.resume_id] = null;
  MOCK_CANDIDATE_SKILLS[resume.resume_id] = [];
}

const SUCCESS_SKILL_POOL = [
  { canonical_skill_id: "sk-py", canonical_name: "Python", match_tier: "case_insensitive", confidence: 0.98, scoring_weight: 1.0 },
  { canonical_skill_id: "sk-java", canonical_name: "Java", match_tier: "case_insensitive", confidence: 0.97, scoring_weight: 0.95 },
  { canonical_skill_id: "sk-sql", canonical_name: "SQL", match_tier: "alias", confidence: 0.95, scoring_weight: 0.6 },
  { canonical_skill_id: "sk-react", canonical_name: "React", match_tier: "case_insensitive", confidence: 0.96, scoring_weight: 0.6 },
  { canonical_skill_id: "sk-aws", canonical_name: "AWS", match_tier: "alias", confidence: 0.94, scoring_weight: 0.9 },
  { canonical_skill_id: "sk-docker", canonical_name: "Docker", match_tier: "case_insensitive", confidence: 0.97, scoring_weight: 0.85 },
];

// Finalizes a mock intake once the simulated pipeline reaches a terminal
// state, writing back into the same tables the review screen reads from.
export function finalizeMockIntake(resumeId, outcome) {
  const resume = getResumeById(resumeId);
  if (!resume) return;

  if (outcome === "FAILURE") {
    resume.parse_status = "FAILED";
    resume.parse_confidence_score = null;
    resume.parse_duration_ms = 2100 + Math.floor(Math.random() * 900);
    return;
  }

  const confidence = 0.86 + Math.random() * 0.12;
  resume.parse_status = "PARSED";
  resume.parse_confidence_score = Math.round(confidence * 100) / 100;
  resume.parse_duration_ms = 7200 + Math.floor(Math.random() * 2400);

  const chosenSkills = SUCCESS_SKILL_POOL.slice(0, 5);
  MOCK_PARSED_JSON[resumeId] = {
    skills: chosenSkills.map((s) => s.canonical_name),
    work_experience: [
      {
        title: "Software Engineer",
        company: "Newly Submitted Co.",
        start_date: "Jun 2021",
        end_date: null,
        is_current: true,
        is_internship: false,
        is_volunteer: false,
        description: "Extracted automatically from the uploaded resume during this session.",
      },
    ],
    education: [{ degree: "Bachelor of Technology", institution: "Institute of Technology", field: "Computer Science", graduation_year: 2021 }],
    certifications: [],
    total_experience_years: 4,
    summary: "Extracted automatically from the uploaded resume during this session.",
  };
  MOCK_CANDIDATE_SKILLS[resumeId] = chosenSkills.map((s) => ({
    ...s,
    raw_extracted_text: s.canonical_name,
    status: "AUTO_VERIFIED",
  }));
}
