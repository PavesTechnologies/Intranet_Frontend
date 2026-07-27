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
