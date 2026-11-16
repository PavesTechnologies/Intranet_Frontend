// src/pages/Projects/manager/milestones/mockMilestoneData.js
// Aligned with PMS backend entities (Project.java, Epic.java, Status.java)

export const PMS_PROJECT_STAGES = [
  "INITIATION",
  "PLANNING",
  "DESIGN",
  "DEVELOPMENT",
  "TESTING",
  "DEPLOYMENT",
  "MAINTENANCE",
  "COMPLETED",
];

export const DEFAULT_PROJECT_INFO = {
  id: 101,
  name: "Enterprise Digital Core Transformation",
  projectKey: "EDC",
  clientName: "TechCorp Global Solutions",
  clientId: "c47ac10b-58cc-4372-a567-0e02b2c3d479",
  ownerId: 1001,
  ownerName: "Rohit Lingarker (PM)",
  status: "ACTIVE", // ProjectStatus: ACTIVE, ARCHIVED, PLANNING, COMPLETED
  currentStage: "DEVELOPMENT", // ProjectStage: INITIATION, PLANNING, DESIGN, DEVELOPMENT, TESTING, DEPLOYMENT, MAINTENANCE, COMPLETED
  deliveryModel: "HYBRID", // DeliveryModel: ONSITE, OFFSHORE, HYBRID
  primaryLocation: "Bangalore, India",
  priorityLevel: "HIGH", // PriorityLevel: LOW, MEDIUM, HIGH, CRITICAL
  riskLevel: "LOW", // RiskLevel: LOW, MEDIUM, HIGH, CRITICAL
  projectBudget: 1000000,
  projectBudgetCurrency: "INR",
  startDate: "2026-01-05T09:00:00",
  endDate: "2026-06-30T18:00:00",
};

export const MOCK_PROJECT_EPICS = [
  {
    id: 1,
    name: "EP-01: Project Governance & Foundation Architecture",
    priority: "HIGH",
    progressPercentage: 100,
    statusName: "COMPLETED",
    stage: "INITIATION",
    description: "Architecture blueprints, cloud staging environment, and initial governance setup",
  },
  {
    id: 2,
    name: "EP-02: UX/UI Design System & Interactive Prototypes",
    priority: "HIGH",
    progressPercentage: 100,
    statusName: "COMPLETED",
    stage: "DESIGN",
    description: "Design system tokens, interactive prototypes, and usability testing",
  },
  {
    id: 3,
    name: "EP-03: Core Engineering, Microservices & API Integration",
    priority: "CRITICAL",
    progressPercentage: 85,
    statusName: "IN_PROGRESS",
    stage: "DEVELOPMENT",
    description: "Spring Boot microservices, REST APIs, and database migrations",
  },
  {
    id: 4,
    name: "EP-04: Quality Assurance, Security Audit & UAT",
    priority: "HIGH",
    progressPercentage: 30,
    statusName: "IN_PROGRESS",
    stage: "TESTING",
    description: "End-to-end testing, security penetration tests, and client UAT",
  },
  {
    id: 5,
    name: "EP-05: Operational Cutover & Production Go-Live",
    priority: "CRITICAL",
    progressPercentage: 0,
    statusName: "OPEN",
    stage: "DEPLOYMENT",
    description: "Production release, cutover checklist, and post-go-live warranty support",
  },
];

export const INITIAL_MILESTONES = [
  {
    id: "ms-101",
    code: "MS-INIT-01",
    sequence: 1,
    name: "Project Initiation & Architecture Sign-off",
    description: "Finalization of project charter, stakeholder alignment, high-level technical architecture, and CI/CD environment setup.",
    epicId: 1,
    epicName: "EP-01: Project Governance & Foundation Architecture",
    epicProgressPercentage: 100,
    pmsStage: "INITIATION",
    deliverables: "Signed Project Charter, System Architecture Blueprint, Security Compliance Checklist, Staging CI/CD Pipeline.",
    plannedStartDate: "2026-01-05",
    plannedCompletionDate: "2026-01-25",
    actualCompletionDate: "2026-01-24",
    allocationType: "PERCENTAGE", // "PERCENTAGE" | "FIXED_AMOUNT"
    billingPercentage: 10,
    billingAmount: 100000,
    currency: "INR",
    deliveryStatus: "COMPLETED", // "PLANNED" | "IN_PROGRESS" | "COMPLETED"
    approvalStatus: "CLIENT_ACCEPTED", // "NOT_SUBMITTED" | "AWAITING_PM_APPROVAL" | "PM_APPROVED" | "REJECTED" | "AWAITING_CLIENT_ACCEPTANCE" | "CLIENT_ACCEPTED"
    billingReadiness: "INVOICED", // "NOT_ELIGIBLE" | "AWAITING_APPROVAL" | "ELIGIBLE" | "INVOICED"
    clientAcceptanceRequired: true,
    invoiceNumber: "INV-2026-0018",
    invoicedDate: "2026-02-01",
    rejectionReason: null,
    createdAt: "2026-01-05T09:30:00Z",
    updatedAt: "2026-02-01T14:20:00Z",
    history: [
      { date: "2026-01-05 09:30", action: "Milestone Created", actor: "PM Admin", notes: "Initial schedule and 10% billing allocation defined" },
      { date: "2026-01-08 10:00", action: "Work Started", actor: "Tech Lead", notes: "Infrastructure provisioning and charter drafting begun" },
      { date: "2026-01-24 16:45", action: "Marked Completed", actor: "Tech Lead", notes: "All kickoff deliverables uploaded to repository (Epic 100% complete)" },
      { date: "2026-01-25 11:30", action: "PM Approved", actor: "Rohit L. (Project Manager)", notes: "Verified architecture blueprint against charter requirements" },
      { date: "2026-01-28 14:00", action: "Client Accepted", actor: "S. Mehta (Client Sign-off)", notes: "Formal acceptance received per executive review" },
      { date: "2026-01-29 09:00", action: "Marked Ready for AR Billing", actor: "PMS-AR Bridge", notes: "Milestone sign-off verified; snapshot eligible" },
      { date: "2026-02-01 14:20", action: "Invoiced in AR", actor: "AR Billing Engine", notes: "Associated with Invoice #INV-2026-0018 (₹1,00,000)" },
    ],
  },
  {
    id: "ms-102",
    code: "MS-DSGN-02",
    sequence: 2,
    name: "Design Completion & Prototype Approval",
    description: "Complete UI/UX design specifications, high-fidelity interactive wireframes, and design system component library.",
    epicId: 2,
    epicName: "EP-02: UX/UI Design System & Interactive Prototypes",
    epicProgressPercentage: 100,
    pmsStage: "DESIGN",
    deliverables: "Interactive Figma Prototype, UX Flow Diagrams, Design System Component Guidelines, Usability Testing Report.",
    plannedStartDate: "2026-01-26",
    plannedCompletionDate: "2026-02-28",
    actualCompletionDate: "2026-02-26",
    allocationType: "PERCENTAGE",
    billingPercentage: 20,
    billingAmount: 200000,
    currency: "INR",
    deliveryStatus: "COMPLETED",
    approvalStatus: "CLIENT_ACCEPTED",
    billingReadiness: "ELIGIBLE",
    clientAcceptanceRequired: true,
    invoiceNumber: null,
    invoicedDate: null,
    rejectionReason: null,
    createdAt: "2026-01-05T09:30:00Z",
    updatedAt: "2026-03-01T11:10:00Z",
    history: [
      { date: "2026-01-05 09:30", action: "Milestone Created", actor: "PM Admin", notes: "Planned with 20% billing allocation" },
      { date: "2026-01-26 10:00", action: "Work Started", actor: "Design Lead", notes: "Design workshops and wireframing commenced" },
      { date: "2026-02-26 18:30", action: "Marked Completed", actor: "Design Lead", notes: "Design system tokens and prototype published (Epic 100% complete)" },
      { date: "2026-02-27 11:30", action: "PM Approved", actor: "Rohit L. (Project Manager)", notes: "Approved design review" },
      { date: "2026-03-01 10:00", action: "Client Accepted", actor: "S. Mehta (Client Sign-off)", notes: "Formal client approval received per MSA" },
      { date: "2026-03-01 11:10", action: "Marked Ready for AR Billing", actor: "PMS-AR Bridge", notes: "Eligible for AR Snapshot and Invoice generation (₹2,00,000)" },
    ],
  },
  {
    id: "ms-103",
    code: "MS-DEV-03",
    sequence: 3,
    name: "Development Completion & API Integration",
    description: "Full implementation of core business logic, API integrations, data access layer, and automated test suites.",
    epicId: 3,
    epicName: "EP-03: Core Engineering, Microservices & API Integration",
    epicProgressPercentage: 85,
    pmsStage: "DEVELOPMENT",
    deliverables: "Swagger API Documentation, Automated Unit & Integration Tests (>85% coverage), Code Quality Audit, Staging Deployment.",
    plannedStartDate: "2026-03-01",
    plannedCompletionDate: "2026-05-15",
    actualCompletionDate: "2026-05-14",
    allocationType: "PERCENTAGE",
    billingPercentage: 40,
    billingAmount: 400000,
    currency: "INR",
    deliveryStatus: "COMPLETED",
    approvalStatus: "AWAITING_PM_APPROVAL",
    billingReadiness: "AWAITING_APPROVAL",
    clientAcceptanceRequired: true,
    invoiceNumber: null,
    invoicedDate: null,
    rejectionReason: null,
    createdAt: "2026-01-05T09:30:00Z",
    updatedAt: "2026-05-14T17:00:00Z",
    history: [
      { date: "2026-01-05 09:30", action: "Milestone Created", actor: "PM Admin", notes: "Planned with 40% billing allocation" },
      { date: "2026-03-01 09:30", action: "Work Started", actor: "Engineering Lead", notes: "Sprint development initiated across 3 scrum teams" },
      { date: "2026-05-14 17:00", action: "Marked Completed", actor: "Engineering Lead", notes: "Core services and API integration completed (Epic 85% progress). Submitted for PM review." },
    ],
  },
  {
    id: "ms-104",
    code: "MS-UAT-04",
    sequence: 4,
    name: "Testing, UAT Sign-off and Go-Live",
    description: "User acceptance testing with client stakeholders, defect remediation, performance benchmarking, and production release cutover.",
    epicId: 4,
    epicName: "EP-04: Quality Assurance, Security Audit & UAT",
    epicProgressPercentage: 30,
    pmsStage: "TESTING",
    deliverables: "UAT Sign-off Certificate, Performance Benchmark Report, Production Cutover Checklist, Operational Handover Pack.",
    plannedStartDate: "2026-05-16",
    plannedCompletionDate: "2026-06-30",
    actualCompletionDate: null,
    allocationType: "PERCENTAGE",
    billingPercentage: 30,
    billingAmount: 300000,
    currency: "INR",
    deliveryStatus: "IN_PROGRESS",
    approvalStatus: "NOT_SUBMITTED",
    billingReadiness: "NOT_ELIGIBLE",
    clientAcceptanceRequired: true,
    invoiceNumber: null,
    invoicedDate: null,
    rejectionReason: null,
    createdAt: "2026-01-05T09:30:00Z",
    updatedAt: "2026-05-16T10:00:00Z",
    history: [
      { date: "2026-01-05 09:30", action: "Milestone Created", actor: "PM Admin", notes: "Planned with 30% billing allocation" },
      { date: "2026-05-16 10:00", action: "Work Started", actor: "QA Lead", notes: "UAT test cycles and defect tracking begun (Epic 30% progress)" },
    ],
  },
];

export const formatINR = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

export const computeMilestoneKPIs = (milestones = [], totalBudget = 1000000) => {
  const total = milestones.length;
  const inProgress = milestones.filter((m) => m.deliveryStatus === "IN_PROGRESS").length;
  const awaitingApproval = milestones.filter(
    (m) => m.approvalStatus === "AWAITING_PM_APPROVAL" || m.approvalStatus === "AWAITING_CLIENT_ACCEPTANCE"
  ).length;
  const billable = milestones.filter((m) => m.billingReadiness === "ELIGIBLE").length;
  const invoiced = milestones.filter((m) => m.billingReadiness === "INVOICED").length;

  const totalAllocatedValue = milestones.reduce((sum, m) => sum + (Number(m.billingAmount) || 0), 0);
  const totalAllocatedPercentage = milestones.reduce((sum, m) => sum + (Number(m.billingPercentage) || 0), 0);

  return {
    total,
    inProgress,
    awaitingApproval,
    billable,
    invoiced,
    totalAllocatedValue,
    totalAllocatedPercentage,
    isBudgetFullyAllocated: Math.abs(totalAllocatedValue - totalBudget) < 1,
    isPercentageFullyAllocated: Math.abs(totalAllocatedPercentage - 100) < 0.1,
  };
};

export const DEFAULT_PROJECT_BUDGET = 1000000;

export const loadStoredMilestones = (projectId = 101) => {
  try {
    const saved = localStorage.getItem(`pms_milestones_preview_${projectId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore json parse error
  }
  return INITIAL_MILESTONES;
};

export const saveStoredMilestones = (projectId = 101, milestones = []) => {
  try {
    localStorage.setItem(`pms_milestones_preview_${projectId}`, JSON.stringify(milestones));
  } catch (e) {
    // ignore
  }
};
