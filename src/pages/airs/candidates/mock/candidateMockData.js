// Self-contained mock data for the Candidates & Ranking module.
// Independent from the JD/Campaign/Resume Intake modules — no shared store.

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(902341);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const int = (min, max) => Math.floor(min + rng() * (max - min + 1));

const FIRST_NAMES = ["Aditi", "Rohan", "Meera", "Sanjay", "Priya", "Kabir", "Ishaan", "Neha", "Arjun", "Divya", "Karan", "Sneha", "Vikram", "Ananya", "Rahul", "Pooja", "Aman", "Riya", "Nikhil", "Tanya"];
const LAST_NAMES = ["Sharma", "Verma", "Iyer", "Gupta", "Nair", "Kapoor", "Mehta", "Rao", "Reddy", "Malhotra", "Joshi", "Desai", "Singh", "Menon"];
const CITIES = ["Bengaluru", "Pune", "Hyderabad", "Gurugram", "Mumbai", "Chennai", "Remote", "Austin, TX", "Berlin, DE", "Singapore"];
const COMPANIES = ["Nimbus Systems", "Vertex Analytics", "BluePeak Tech", "Orbital Labs", "Northstar Cloud", "Meridian Software", "Crestline Digital"];

export const ROLE_TEMPLATES = [
  { role: "Senior Frontend Engineer", dept: "Engineering", skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL", "Jest"] },
  { role: "Data Scientist II", dept: "Data & AI", skills: ["Python", "PyTorch", "SQL", "MLOps", "Spark", "Statistics"] },
  { role: "Product Manager", dept: "Product", skills: ["Roadmapping", "SQL", "A/B Testing", "Stakeholder Mgmt", "Figma", "Agile"] },
  { role: "DevOps Engineer", dept: "Platform", skills: ["Kubernetes", "Terraform", "AWS", "CI/CD", "Docker", "Prometheus"] },
  { role: "Enterprise Account Executive", dept: "Sales", skills: ["Salesforce", "Negotiation", "SaaS Sales", "Forecasting", "Outbound"] },
  { role: "UX Researcher", dept: "Design", skills: ["User Interviews", "Figma", "Usability Testing", "Survey Design"] },
];

export const CANDIDATE_STAGES = ["Screening", "Shortlisted", "Interview", "Selected", "Rejected"];

// Hierarchy match weight per match type — mirrors the deterministic scoring
// engine's own multipliers (EXACT 100% ... MISSING 0%). Computed here, once,
// at mock-data-generation time — the UI (HierarchyMatchResults) only ever
// reads these pre-computed fields, it never derives or recalculates them.
const MATCH_WEIGHTS = { EXACT: 1, CHILD: 0.7, GRANDCHILD: 0.5, SIBLING: 0.4, SEMANTIC: 0.2, MISSING: 0 };

// Field names below mirror the deterministic scoring engine's own
// score_breakdown contract (M07-E01/S05): jd_weight, candidate_scoring_weight,
// hierarchy_multiplier, match_type, matched_candidate_skill, skill_contribution.
function makeScoreBreakdownItems(skills, missingSet) {
  // First ~60% of a role's skill list are treated as mandatory, the rest preferred.
  const mandatoryCount = Math.max(1, Math.ceil(skills.length * 0.6));

  return skills.map((skillName, i) => {
    const mandatory = i < mandatoryCount;
    const jdWeight = mandatory ? int(15, 25) : int(5, 15);
    const matchType = missingSet.has(skillName)
      ? "MISSING"
      : pick(["EXACT", "EXACT", "CHILD", "CHILD", "GRANDCHILD", "SIBLING", "SEMANTIC"]);
    const hierarchyMultiplier = MATCH_WEIGHTS[matchType];
    // candidate_scoring_weight: 1.0 for an exact/alias match, 0.8 for a
    // partial-fuzzy/vector-normalized one, 0 when there's no match at all.
    const candidateScoringWeight = matchType === "MISSING" ? 0 : matchType === "EXACT" ? 1.0 : pick([1.0, 0.8]);
    const skillContribution = Math.round(jdWeight * hierarchyMultiplier * candidateScoringWeight * 100) / 100;

    return {
      jdSkillName: skillName,
      mandatory,
      matchType,
      matchedCandidateSkill: matchType === "MISSING" ? null : skillName,
      jdWeight,
      candidateScoringWeight,
      hierarchyMultiplier,
      skillContribution,
    };
  });
}

// M07-E01/S04-S05 — the deterministic engine's full score_breakdown output:
// the per-skill items list, the NO_VERIFIED_SKILLS edge-case flag, mandatory
// coverage, preferred-skill bonus, and the resulting score/status. All
// computed once here, at mock-generation time — the UI only ever reads
// these fields, it never derives or recalculates any of them.
function makeScoreBreakdown(skills, missing, deterministic, forceNoVerifiedSkills) {
  const missingSet = forceNoVerifiedSkills ? new Set(skills) : new Set(missing);
  const items = makeScoreBreakdownItems(skills, missingSet);
  const noVerifiedSkills = forceNoVerifiedSkills || items.every((r) => r.matchType === "MISSING");

  const mandatoryItems = items.filter((r) => r.mandatory);
  const preferredItems = items.filter((r) => !r.mandatory);

  // Missing mandatory skills fail deterministic screening — a real backend
  // rule, mirrored here rather than re-derived by the UI.
  const hasMissingMandatory = mandatoryItems.some((r) => r.matchType === "MISSING");
  const status = noVerifiedSkills || hasMissingMandatory ? "FAILED" : "PASSED";
  // A higher-precision variant of `deterministic` for the scorecard's
  // "X.XX / 100" summary (the existing integer `deterministic` field is kept
  // untouched elsewhere since ScoreRing displays already depend on its shape).
  const score = noVerifiedSkills ? 0 : Math.round((deterministic + rng() * 0.99) * 100) / 100;

  const mandatoryCoveragePct = mandatoryItems.length
    ? Math.round(
        ((mandatoryItems.length - mandatoryItems.filter((r) => r.matchType === "MISSING").length) /
          mandatoryItems.length) *
          1000
      ) / 10
    : 100;

  const preferredSkillBonus = Math.round(preferredItems.reduce((sum, r) => sum + r.skillContribution, 0) * 100) / 100;

  return { items, noVerifiedSkills, score, status, mandatoryCoveragePct, preferredSkillBonus };
}

const ADDITIONAL_SKILL_POOL = ["Docker Compose", "Redis", "GraphQL Federation", "Storybook", "Vite", "Notion API", "Zoom SDK", "Figma Plugins", "Postman", "Segment"];
const MATCH_TIERS = ["RELATED", "ADJACENT"];

// S05-T03 — candidate skills that don't correspond to any JD skill row at
// all (so they can't appear in the mandatory/preferred tables above).
// scoringWeight === 0 marks an unrecognised skill, rendered in its own
// sub-list rather than force-added to the ontology.
function makeAdditionalSkills() {
  const count = int(0, 3);
  return Array.from({ length: count }, () => {
    const isUnrecognized = rng() < 0.35;
    return {
      canonicalName: pick(ADDITIONAL_SKILL_POOL),
      matchTier: isUnrecognized ? "UNRECOGNIZED" : pick(MATCH_TIERS),
      scoringWeight: isUnrecognized ? 0 : pick([0.3, 0.5, 0.6]),
    };
  });
}

function makeCandidate(id) {
  const template = pick(ROLE_TEMPLATES);
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const exp = int(1, 14);
  const deterministic = int(40, 100);
  const ats = int(38, 98);
  const semantic = int(40, 99);
  const composite = Math.round(
  deterministic * 0.30 +
  semantic * 0.40 +
  ats * 0.30
);
  const missing = template.skills.filter(() => rng() < 0.25);
  const matched = template.skills.filter((s) => !missing.includes(s));

  // A small, deterministic sample of candidates (every 15th) exercises the
  // zero-verified-skills edge case reliably, rather than relying on rare
  // random chance across the 48-candidate mock pool.
  const forceNoVerifiedSkills = id % 15 === 0;
  const scoreBreakdown = makeScoreBreakdown(template.skills, missing, deterministic, forceNoVerifiedSkills);

  return {
    id: `CND-${1000 + id}`,
    name,
    initials: name.split(" ").map((n) => n[0]).join(""),
    email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@mail.com`,
    phone: `+91 ${int(70000, 99999)} ${int(10000, 99999)}`,
    role: template.role,
    dept: template.dept,
    company: pick(COMPANIES),
    location: pick(CITIES),
    experience: exp,
    education: pick(["B.Tech CS, IIT Bombay", "B.E. ECE, VIT", "M.S. CS, NUS", "MBA, ISB", "B.Sc Stats, Delhi Univ.", "M.Tech, IIT Madras"]),
    notice: pick(["Immediate", "15 days", "30 days", "60 days", "90 days"]),
    salary: `₹${int(12, 55)}L`,
    deterministic,
    ats,
    semantic,
    composite,
    scoreBreakdown,
    manualSkills: [],
    additionalSkills: makeAdditionalSkills(),
    matchedSkills: matched.length ? matched : template.skills.slice(0, 2),
    missingSkills: missing,
    stage: pick(CANDIDATE_STAGES),
    risk: int(2, 96),
    starred: rng() < 0.18,
    appliedOn: `2026-0${int(1, 6)}-${int(10, 28)}`,
    summary: `${exp}+ yrs building ${template.dept.toLowerCase()} solutions at scale. Strong track record at ${pick(COMPANIES)} with hands-on depth in ${matched.slice(0, 2).join(" & ") || template.skills[0]}. ${missing.length ? `Gaps in ${missing.join(", ")}.` : "Full coverage of required stack."}`,
    strengths: [`Deep ${template.skills[0]} expertise`, "Strong ownership signals", "Consistent career progression"],
    weaknesses: missing.length ? [`Limited exposure to ${missing[0]}`, "Short average tenure at last role"] : ["Slightly light on leadership scope"],
    comments: [
      { author: pick(["Meera Iyer", "Karan Kapoor", "Sarah Connor"]), text: pick([
        "Strong culture-add signal, recommend fast-tracking to interview.",
        "Missing skill gap acceptable given seniority — proceed.",
        "Referred by internal team member, prioritize screening.",
      ]) },
    ],
  };
}

export const MOCK_CANDIDATES = Array.from({ length: 48 }, (_, i) => makeCandidate(i));
