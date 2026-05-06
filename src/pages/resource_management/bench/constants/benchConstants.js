export const BENCH_STORAGE_KEY = "bench-management-state";

export const CATEGORY_OPTIONS = [
  "Ready",
  "Training",
  "Shadow",
  "Not Available",
];

export const POOL_OPTIONS = ["CoE", "Training", "R&D"];

export const BENCH_TABS = [
  { id: "bench", label: "Bench" },
  { id: "pool", label: "Internal Pool" },
];

export const FILTER_DEFAULTS = {
  category: "",
  availability: "",
  location: "",
  experience: "",
  aging: "",
  cost: "",
};

export const EXCLUDE_SHADOW_FROM_BENCH = true;

export const DEMAND_PROFILES = [
  {
    id: "dem-1",
    name: "Care Portal Revamp",
    project: "All Care",
    requiredSkills: ["React", "TypeScript", "REST APIs"],
  },
  {
    id: "dem-2",
    name: "Claims Automation",
    project: "Claim Central",
    requiredSkills: ["Java", "Spring Boot", "Kafka"],
  },
  {
    id: "dem-3",
    name: "Data Quality Pipeline",
    project: "Insight Grid",
    requiredSkills: ["Python", "Airflow", "SQL"],
  },
  {
    id: "dem-4",
    name: "Platform Reliability",
    project: "Infra Mesh",
    requiredSkills: ["DevOps", "AWS", "Terraform"],
  },
  {
    id: "dem-5",
    name: "Mobile API Enablement",
    project: "Pulse App",
    requiredSkills: ["Node.js", "GraphQL", "React"],
  },
];
