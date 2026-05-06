// src/pages/resource_management/projects/mockData.js

export const mockProjects = [
  {
    id: "PRJ-1001",
    name: "Alpha Banking Transformation",
    client: "Alpha Bank Corp",
    status: "Active",
    pm: "Sarah Jenkins",
    startDate: "2024-01-15",
    endDate: "2024-12-30",
    deliveryModel: "Hybrid",
    location: "New York, USA",
    risk: "High", // Story 6
    readiness: "Ready", // Story 5
    description: "Legacy system migration to cloud infrastructure with microservices architecture.",
    progress: 45,
    allocations: [ // Project Resources
      { id: "EMP01", name: "John Doe", role: "Senior Java Dev", allocation: 100, start: "2024-01-15", end: "2024-12-30", type: "Billable" },
      { id: "EMP02", name: "Jane Smith", role: "Solution Architect", allocation: 50, start: "2024-02-01", end: "2024-08-01", type: "Billable" },
      { id: "EMP03", name: "Mike Johnson", role: "QA Lead", allocation: 100, start: "2024-03-01", end: "2024-12-30", type: "Billable" },
    ]
  },
  {
    id: "PRJ-1002",
    name: "Retail E-Commerce Overhaul",
    client: "ShopifyPlus",
    status: "Pending",
    pm: "Mike Ross",
    startDate: "2024-06-01",
    endDate: "2025-01-01",
    deliveryModel: "Offshore",
    location: "Bangalore, IN",
    risk: "Low",
    readiness: "Not Ready", // Story 12 (Blocker)
    description: "Frontend revamp using Next.js and headless CMS integration.",
    progress: 0,
    allocations: [] // No resources yet
  },
  {
    id: "PRJ-1003",
    name: "Healthcare Data Analytics",
    client: "MediCare Systems",
    status: "Active",
    pm: "Priya Sharma",
    startDate: "2023-06-01",
    endDate: "2025-01-01",
    deliveryModel: "Onsite",
    location: "London, UK",
    risk: "Medium",
    readiness: "Upcoming",
    description: "AI-driven diagnostics tool compliance project.",
    progress: 75,
    allocations: [
      { id: "EMP04", name: "Emily White", role: "Data Scientist", allocation: 100, start: "2023-06-01", end: "2024-12-01", type: "Billable" },
      { id: "EMP05", name: "Raj Patel", role: "Data Engineer", allocation: 100, start: "2023-06-01", end: "2024-12-01", type: "Billable" },
    ]
  }
];

export const kpiStats = {
  totalProjects: 124,
  activeProjects: 86,
  highRisk: 12,
  avgUtilization: "88%",
};