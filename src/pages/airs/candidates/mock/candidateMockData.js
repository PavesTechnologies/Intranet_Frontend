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
