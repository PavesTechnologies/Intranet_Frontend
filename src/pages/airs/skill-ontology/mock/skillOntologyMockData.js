// Self-contained mock data for the Skill Ontology module.
// No backend exists yet — skillOntologyService.js operates against this
// in-memory, localStorage-backed dataset instead of making real HTTP calls.
// Swap the service internals back to axios once real endpoints exist; every
// other file in this module is untouched by that swap since it only calls
// the exported service functions by name.

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(551901);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const int = (min, max) => Math.floor(min + rng() * (max - min + 1));

const SOURCES = ["seed", "admin", "auto_extracted"];
const EMBEDDING_STATES = ["GENERATED", "PENDING", "OUTDATED"];
const ACTORS = ["Sarah Connor", "John Doe", "Alex Mercer", "Diana Prince", "AIRS Parser Engine"];

const randomDate = (daysAgoMax) => {
  const d = new Date();
  d.setDate(d.getDate() - int(0, daysAgoMax));
  return d.toISOString();
};

let seq = 1;
const nextId = () => `SKL-${String(seq++).padStart(4, "0")}`;

// [canonicalName, category, aliases[], children: [[name, aliases]]]
const TREE_SEED = [
  ["Frontend Development", "Framework", ["FE Dev"], [
    ["React", ["ReactJS", "React.js"], [["Next.js", ["NextJS"]], ["Redux", ["Redux.js"]]]],
    ["Vue.js", ["Vue", "VueJS"]],
    ["Angular", ["AngularJS"]],
    ["TypeScript", ["TS"]],
    ["Tailwind CSS", ["Tailwind"]],
  ]],
  ["Backend Development", "Framework", ["BE Dev"], [
    ["Node.js", ["NodeJS", "Node"]],
    ["Java", []],
    ["Spring Boot", ["SpringBoot"]],
    ["Python", ["Python3"]],
    ["FastAPI", ["Fast API"]],
  ]],
  ["Cloud & Infrastructure", "Cloud & DevOps", ["Cloud Infra"], [
    ["AWS", ["Amazon Web Services"], [["EC2", []], ["S3", []], ["Lambda", ["AWS Lambda"]]]],
    ["Azure", ["Microsoft Azure"]],
    ["Kubernetes", ["K8s"]],
    ["Docker", []],
    ["Terraform", []],
  ]],
  ["Data & Machine Learning", "Data & AI", ["Data & ML"], [
    ["PyTorch", []],
    ["TensorFlow", ["TF"]],
    ["SQL", ["Structured Query Language"]],
    ["Apache Spark", ["Spark"]],
    ["MLOps", ["ML Ops"]],
  ]],
  ["Product & Design", "Design", [], [
    ["Figma", []],
    ["User Research", ["UX Research"]],
    ["Roadmapping", ["Product Roadmapping"]],
    ["A/B Testing", ["Split Testing"]],
  ]],
  ["Sales & Business", "Domain Knowledge", [], [
    ["Salesforce", ["SFDC"]],
    ["Negotiation", []],
    ["Forecasting", ["Sales Forecasting"]],
  ]],
];

function buildSkill(name, category, aliases, parentId) {
  const id = nextId();
  const created = randomDate(180);
  return {
    id,
    canonicalName: name,
    category,
    aliases,
    parentSkillId: parentId || null,
    confidence: rng() < 0.72 ? "VERIFIED" : "UNVERIFIED",
    status: rng() < 0.08 ? "INACTIVE" : "ACTIVE",
    source: pick(SOURCES),
    embeddingStatus: pick(EMBEDDING_STATES),
    occurrenceCount: int(3, 340),
    jdCount: int(0, 48),
    candidateCount: int(0, 210),
    campaignCount: int(0, 6),
    lastSeen: randomDate(30),
    createdAt: created,
    comments: [],
  };
}

function seedTree() {
  const skills = [];

  const walk = (nodes, category, parentId) => {
    nodes.forEach(([name, aliases, children]) => {
      const skill = buildSkill(name, category, aliases, parentId);
      skills.push(skill);
      if (children) walk(children, category, skill.id);
    });
  };

  TREE_SEED.forEach(([rootName, category, rootAliases, children]) => {
    const root = buildSkill(rootName, category, rootAliases, null);
    skills.push(root);
    if (children) walk(children, category, root.id);
  });

  return skills;
}

const STORAGE_KEY = "airs_skill_ontology_mock_v1";

export function loadMockSkills() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to reseed
  }
  const seeded = seedTree();
  persistMockSkills(seeded);
  return seeded;
}

export function persistMockSkills(skills) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  } catch {
    // Ignore storage quota errors.
  }
}

export function buildActivityForSkill(skill) {
  const events = [
    { timestamp: skill.createdAt, eventType: "CREATED", actorName: pick(ACTORS), description: `Skill "${skill.canonicalName}" created via ${skill.source}.` },
  ];
  if (skill.embeddingStatus === "GENERATED") {
    events.push({ timestamp: randomDate(20), eventType: "EMBEDDING", actorName: "AIRS Parser Engine", description: "Embedding vector generated." });
  }
  if (skill.aliases.length > 0) {
    events.push({ timestamp: randomDate(15), eventType: "ALIAS_ADDED", actorName: pick(ACTORS), description: `Alias "${skill.aliases[0]}" added.` });
  }
  events.push({ timestamp: skill.lastSeen, eventType: "SEEN", actorName: "AIRS Parser Engine", description: "Matched against an incoming resume/JD." });
  return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ── Unknown-skill "people" mock data ────────────────────────────────────
// Unknown skills have no real "who mentioned this" endpoint yet, so the
// person-icon detail view (UnknownSkillDetailPage.jsx) renders entirely
// mock content. Each generator is seeded off the skill's own id/rawSkill
// (not the shared module-level `rng`) so the same unknown skill renders the
// same mock people/occurrences/activity on every visit and refresh, without
// disturbing the verified-skills tree's rng sequence above.
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}

const CANDIDATE_NAMES = [
  "Ananya Rao", "Karthik Iyer", "Priya Sharma", "Rahul Verma", "Sneha Nair",
  "Vikram Singh", "Divya Menon", "Arjun Reddy", "Meera Pillai", "Rohan Gupta",
];
const CANDIDATE_TITLES = [
  "Senior Software Engineer", "Data Analyst", "Full Stack Developer", "DevOps Engineer",
  "Product Manager", "QA Engineer", "UI/UX Designer", "Backend Developer", "ML Engineer", "Business Analyst",
];
const JD_TITLES = [
  "Senior Backend Engineer - Platform", "Data Engineer - Analytics", "Frontend Developer - Consumer App",
  "DevOps Engineer - Infrastructure", "Machine Learning Engineer", "Full Stack Developer - Fintech",
];
const DEPARTMENTS = ["Engineering", "Data & Analytics", "Product", "Infrastructure", "Design"];

export function buildPeopleForUnknownSkill(skill) {
  const rand = mulberry32(hashSeed(`people-${skill.id || skill.rawSkill}`));
  const pickL = (arr) => arr[Math.floor(rand() * arr.length)];
  const intL = (min, max) => Math.floor(min + rand() * (max - min + 1));
  const dateL = (daysAgoMax) => {
    const d = new Date();
    d.setDate(d.getDate() - intL(0, daysAgoMax));
    return d.toISOString();
  };
  const count = Math.min(8, Math.max(1, intL(1, Math.max(1, Math.round((skill.frequency || 1) * 0.6)))));
  return Array.from({ length: count }, (_, i) => ({
    id: `CAND-${skill.id || "x"}-${i}`,
    name: pickL(CANDIDATE_NAMES),
    title: pickL(CANDIDATE_TITLES),
    appliedRole: pickL(JD_TITLES),
    matchScore: intL(62, 97),
    lastActive: dateL(45),
  }));
}

export function buildOccurrencesForUnknownSkill(skill) {
  const rand = mulberry32(hashSeed(`occurrences-${skill.id || skill.rawSkill}`));
  const pickL = (arr) => arr[Math.floor(rand() * arr.length)];
  const intL = (min, max) => Math.floor(min + rand() * (max - min + 1));
  const dateL = (daysAgoMax) => {
    const d = new Date();
    d.setDate(d.getDate() - intL(0, daysAgoMax));
    return d.toISOString();
  };
  const count = Math.min(6, Math.max(1, intL(1, Math.max(1, Math.round((skill.frequency || 1) * 0.4)))));
  return Array.from({ length: count }, (_, i) => ({
    id: `JD-${skill.id || "x"}-${i}`,
    title: pickL(JD_TITLES),
    department: pickL(DEPARTMENTS),
    postedDate: dateL(90),
    snippet: `"...hands-on experience with ${skill.rawSkill} in a production environment..."`,
  }));
}

export function buildActivityForUnknownSkill(skill) {
  const rand = mulberry32(hashSeed(`activity-${skill.id || skill.rawSkill}`));
  const pickL = (arr) => arr[Math.floor(rand() * arr.length)];
  const intL = (min, max) => Math.floor(min + rand() * (max - min + 1));
  const dateL = (daysAgoMax) => {
    const d = new Date();
    d.setDate(d.getDate() - intL(0, daysAgoMax));
    return d.toISOString();
  };
  const events = [
    {
      timestamp: skill.firstSeen || dateL(60),
      description: `First detected as an unrecognized skill mention ("${skill.rawSkill}").`,
      actorName: "AIRS Parser Engine",
    },
    {
      timestamp: dateL(30),
      description: `Occurrence count reached ${skill.frequency ?? intL(2, 40)} across parsed resumes and job descriptions.`,
      actorName: "AIRS Parser Engine",
    },
    {
      timestamp: dateL(10),
      description: "Flagged for review — no matching canonical skill found above the confidence threshold.",
      actorName: pickL(ACTORS),
    },
    {
      timestamp: skill.lastSeen || dateL(3),
      description: "Matched against an incoming resume/JD.",
      actorName: "AIRS Parser Engine",
    },
  ];
  return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
