// Self-contained mock data for the Analytics module — no shared store with other AIRS modules.

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(618203);
const int = (min, max) => Math.floor(min + rng() * (max - min + 1));

export const ANALYTICS_KPIS = {
  avgTimeToHire: "29 days",
  avgTimeToHireDelta: "-8%",
  aiAccuracy: "91.4%",
  aiAccuracyDelta: "+2.1%",
  offerAcceptanceRate: "78%",
  offerAcceptanceDelta: "-3%",
  costPerHire: "₹42K",
  costPerHireDelta: "-5%",
};

export const TIME_TO_HIRE_TREND = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month) => ({
  month,
  days: int(24, 42),
}));

export const ATS_SCORE_DISTRIBUTION = [
  { bucket: "0-40", count: 4 },
  { bucket: "41-60", count: 14 },
  { bucket: "61-80", count: 27 },
  { bucket: "81-100", count: 19 },
];

export const TOP_SKILLS = ["React", "Python", "Kubernetes", "SQL", "Figma", "AWS"].map((skill) => ({
  skill,
  count: int(18, 52),
}));

export const RECRUITER_PRODUCTIVITY = [
  { id: "REC-1", name: "Sarah Connor", campaigns: 4, avgTTH: 27, placements: 18 },
  { id: "REC-2", name: "John Doe", campaigns: 3, avgTTH: 31, placements: 14 },
  { id: "REC-3", name: "Alex Mercer", campaigns: 5, avgTTH: 24, placements: 22 },
  { id: "REC-4", name: "Diana Prince", campaigns: 2, avgTTH: 35, placements: 9 },
  { id: "REC-5", name: "Bruce Wayne", campaigns: 4, avgTTH: 29, placements: 16 },
];
