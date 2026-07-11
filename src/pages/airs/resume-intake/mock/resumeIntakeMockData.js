// Self-contained mock data for the Resume Intake module.
// Independent from the JD/Campaign modules — no shared store, no shared mock data.

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(451207);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const int = (min, max) => Math.floor(min + rng() * (max - min + 1));

export const UPLOAD_STATUSES = ["Parsed", "Parsing", "Queued", "Duplicate flagged", "Failed"];

const SKILL_POOL = ["React", "TypeScript", "Java", "Spring Boot", "Python", "AWS", "Kubernetes", "SQL", "GraphQL", "Docker"];
const RECRUITER_NAMES = ["Sarah Connor", "John Doe", "Alex Mercer", "Diana Prince", "Bruce Wayne"];

function buildExtraction(fileName) {
  const skills = Array.from({ length: 4 }, () => pick(SKILL_POOL));
  return {
    candidateName: fileName.split(/[_.]/)[0].replace(/([a-z])([A-Z])/g, "$1 $2"),
    detectedSkills: [...new Set(skills)],
    experience: `${int(2, 10)} years`,
    confidence: int(82, 98),
  };
}

function buildFile({ id, name, sizeLabel, fileCount, status, progress, uploadedAt, duplicateOf }) {
  return {
    id,
    name,
    sizeLabel,
    fileCount,
    status,
    progress,
    uploadedAt,
    uploadedBy: pick(RECRUITER_NAMES),
    duplicateOf: duplicateOf || null,
    extraction: status === "Parsed" ? buildExtraction(name) : null,
  };
}

export const MOCK_UPLOAD_HISTORY = [
  buildFile({ id: "UPL-1001", name: "batch_frontend_eng.zip", sizeLabel: "48.2 MB", fileCount: 22, status: "Parsed", progress: 100, uploadedAt: "2026-07-05 14:12" }),
  buildFile({ id: "UPL-1002", name: "meera_iyer_resume.pdf", sizeLabel: "312 KB", fileCount: 1, status: "Parsing", progress: 64, uploadedAt: "2026-07-06 09:20" }),
  buildFile({ id: "UPL-1003", name: "batch_sales_q3.zip", sizeLabel: "31.6 MB", fileCount: 15, status: "Queued", progress: 0, uploadedAt: "2026-07-06 09:45" }),
  buildFile({ id: "UPL-1004", name: "duplicate_candidate.pdf", sizeLabel: "290 KB", fileCount: 1, status: "Duplicate flagged", progress: 100, uploadedAt: "2026-07-04 16:02", duplicateOf: "Rohan Verma (CND-1042)" }),
  buildFile({ id: "UPL-1005", name: "batch_devops_pool.zip", sizeLabel: "22.4 MB", fileCount: 11, status: "Parsed", progress: 100, uploadedAt: "2026-07-03 11:30" }),
  buildFile({ id: "UPL-1006", name: "corrupted_scan.pdf", sizeLabel: "1.1 MB", fileCount: 1, status: "Failed", progress: 0, uploadedAt: "2026-07-02 08:15" }),
  buildFile({ id: "UPL-1007", name: "priya_sharma_resume.docx", sizeLabel: "204 KB", fileCount: 1, status: "Parsed", progress: 100, uploadedAt: "2026-07-01 17:40" }),
  buildFile({ id: "UPL-1008", name: "batch_data_science.zip", sizeLabel: "39.8 MB", fileCount: 18, status: "Parsed", progress: 100, uploadedAt: "2026-06-30 13:05" }),
];

export const MOCK_UPLOAD_STATS = {
  filesInQueue: MOCK_UPLOAD_HISTORY.filter((f) => f.status === "Queued" || f.status === "Parsing").length,
  parsedToday: 146,
  duplicatesFlagged: MOCK_UPLOAD_HISTORY.filter((f) => f.status === "Duplicate flagged").length,
  failedUploads: MOCK_UPLOAD_HISTORY.filter((f) => f.status === "Failed").length,
};

const ZIP_BATCH_NAMES = ["batch_uploads", "resume_pool", "sourcing_drop", "candidate_zip"];

// Generates a plausible new upload entry when the user simulates a drag/drop or browse upload.
export function generateMockUpload(kind, sequence) {
  const isZip = kind === "zip";
  const id = `UPL-${1100 + sequence}`;
  const fileCount = isZip ? int(5, 30) : 1;
  const name = isZip
    ? `${pick(ZIP_BATCH_NAMES)}_${int(1, 99)}.zip`
    : `${pick(["arjun_mehta", "neha_kapoor", "vikram_rao", "isha_singh"])}_resume.pdf`;
  return buildFile({
    id,
    name,
    sizeLabel: isZip ? `${(fileCount * int(2, 4)).toFixed(1)} MB` : `${int(180, 420)} KB`,
    fileCount,
    status: "Queued",
    progress: 0,
    uploadedAt: "Just now",
  });
}
