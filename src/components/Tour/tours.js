/**
 * Guided-tour content for the Paves Intranet.
 *
 * One "welcome" tour for the whole intranet plus one tour per module. Every
 * tour and step is role-aware: `when(ctx)` hides what the signed-in user can't
 * use, and menu lists are built from the same sidebar configs + filterMenuByRole()
 * the Sidebar itself uses, so a tour never describes a page the user can't open.
 *
 * ctx = { user, firstName, hasRole, hasAnyPermission, financeEnabled }
 *
 * Targets are `data-tour="..."` attributes on the app shell (Sidebar, Header,
 * Layout) and the Dashboard. If a target isn't on screen for this user, the
 * engine silently skips that step — tours degrade gracefully as the UI changes.
 *
 * To add a tour: append an object to TOURS (id, title, group, icon, home,
 * match, when, steps). See resolveTour() in tourUtils.js for the step contract.
 */
import {
  LayoutDashboard,
  Handshake,
  Users,
  UserCog2,
  ScanSearch,
  FolderKanban,
  PlaneTakeoff,
  Clock,
  Receipt,
  Landmark,
  Sparkles,
} from "lucide-react";

import ApModuleIcon from "../icons/ApModuleIcon";
import ArModuleIcon from "../icons/ArModuleIcon";
import {
  EO_SUBMENU,
  XMS_SUBMENU,
  AP_SUBMENU,
  AR_MAKER_ROLES,
  AR_CHECKER_ROLES,
  FINANCE_ALL_ROLES,
} from "../../config/sidebarConfig";
import { filterMenuByRole } from "../../utils/sidebarPermissions";
import { AP_ALL_ROLES } from "../../pages/accounts-payable/constants/apRoles";
import { AP_MANAGEMENT_ANY } from "../../pages/accounts-payable/constants/paymentTerms";
import { AP_ROUTES } from "../../pages/accounts-payable/constants/routes";

export const TOUR_GROUPS = [
  { id: "start", label: "Getting started" },
  { id: "intranet", label: "Paves Intranet" },
  { id: "finance", label: "Finance Management" },
];

/* ────────────────────────────── role helpers ────────────────────────────── */

const is = (ctx, roles) => ctx.hasRole(roles);
const isAdmin = (ctx) => is(ctx, ["ADMIN"]);
const isRM = (ctx) => is(ctx, ["RESOURCE_MANAGER"]);
const isDM = (ctx) => is(ctx, ["DELIVERY_MANAGER"]);
const isManagerish = (ctx) => is(ctx, ["REPORTING_MANAGER", "PROJECT_MANAGER", "DELIVERY_MANAGER", "MANAGER"]);
const isHrOrAdmin = (ctx) => is(ctx, ["HR", "ADMIN", "SUPER_ADMIN"]);
const canSeeProjects = (ctx) => is(ctx, ["GENERAL", "PROJECT_MANAGER"]);
const canSeeAirs = (ctx) => is(ctx, ["HIRING_MANAGER", "HR", "HR_ADMIN", "RECRUITER"]);
const canSeeRm = (ctx) => isAdmin(ctx) || isRM(ctx) || isDM(ctx);
const canSeeFinance = (ctx) => ctx.financeEnabled && is(ctx, FINANCE_ALL_ROLES);
const canSeeXms = (ctx) => ctx.financeEnabled && filterMenuByRole(XMS_SUBMENU, ctx.hasRole).length > 0;
const canSeeAp = (ctx) => ctx.financeEnabled && (is(ctx, AP_ALL_ROLES) || ctx.hasAnyPermission(AP_MANAGEMENT_ANY));
const isArMaker = (ctx) => is(ctx, AR_MAKER_ROLES);
const isArChecker = (ctx) => is(ctx, AR_CHECKER_ROLES);
const canSeeAr = (ctx) => ctx.financeEnabled && (isArMaker(ctx) || isArChecker(ctx));

/** Turns a role-filtered sidebar config into "label — what it's for" rows. */
const describeMenu = (menu, descriptions) =>
  menu.map((item) => {
    const label = item.label.trim();
    const children = (item.children || []).map((c) => c.label.trim());
    return {
      label,
      desc: descriptions[label] || (children.length ? `Includes ${children.join(", ")}.` : ""),
    };
  });

/* Shared step builders — keep every module tour consistent. */
const navStep = ({ target, title, body, items, tip, when, requireItems = false }) => ({
  target,
  placement: "right",
  padding: 4,
  radius: 10,
  title,
  body,
  items,
  tip: tip ?? "Hover over this icon to open the menu. Expand the sidebar (☰ at the top-left) to see labels.",
  when,
  requireItems,
});

const pageStep = ({ title, body, items, tip, route, when }) => ({
  target: '[data-tour="main-content"]',
  placement: "inside",
  padding: 0,
  radius: 16,
  title,
  body,
  items,
  tip,
  when,
  ...(route !== undefined ? { route } : {}),
});

const outroStep = ({ title = "You're ready to go", body, tip, action }) => ({
  title,
  body,
  tip: tip ?? "Replay this tour anytime from the Guide button in the top bar.",
  action,
  variant: "outro",
});

/* ─────────────────────────────── 1. welcome ─────────────────────────────── */

const WELCOME = {
  id: "welcome",
  group: "start",
  icon: Sparkles,
  title: "Welcome to Paves Intranet",
  summary: "A guided walk through navigation, your dashboard, profile and help — the essentials in two minutes.",
  home: "/dashboard",
  match: ["/dashboard"],
  steps: [
    {
      variant: "hero",
      title: (ctx) => `Welcome to Paves Intranet${ctx.firstName ? `, ${ctx.firstName}` : ""}!`,
      body: "This is your single workspace for everything at Paves — leave, timesheets, projects, people and, for finance teams, the complete money flow. Let's take a quick look around.",
      items: [
        { label: "Find your way", desc: "How the sidebar and its module menus work." },
        { label: "Your day at a glance", desc: "What every card on your dashboard tells you." },
        { label: "Your account", desc: "Profile, password and switching applications." },
        { label: "Help on demand", desc: "Where to replay this and every module tour." },
      ],
      tip: "Use ← → on your keyboard to move between steps, Esc to exit.",
    },
    {
      target: '[data-tour="sidebar-nav"]',
      placement: "right",
      padding: 6,
      title: "Your navigation hub",
      body: "Every module you have access to lives here. What you see is tailored to your role — you'll only ever find pages you can actually use.",
      items: (ctx) => [
        { label: "Dashboard", desc: "Your personal home page." },
        canSeeAirs(ctx) && { label: "AI Screening", desc: "AI-assisted resume screening and hiring pipeline." },
        { label: "Employee Onboarding", desc: "People directory, onboarding and HR records." },
        isAdmin(ctx) && { label: "User Management", desc: "Users, roles, permissions and access." },
        canSeeRm(ctx) && { label: "Resource Management", desc: "Clients, demand, bench and utilisation." },
        canSeeProjects(ctx) && { label: "Projects", desc: "Boards, backlogs, testing and risks." },
        { label: "Leave Management", desc: "Apply for and track leave." },
        { label: "Timesheets", desc: "Log and submit your weekly hours." },
      ],
      tip: "Items with a › arrow open a flyout menu when you hover over them.",
    },
    {
      target: '[data-tour="header-toggle"]',
      placement: "bottom",
      padding: 6,
      title: "Expand or collapse the sidebar",
      body: "The sidebar starts compact to give your work more room. Click here to show full module names; click again to tuck it away.",
    },
    {
      target: '[data-tour="nav-dashboard"]',
      placement: "right",
      padding: 4,
      title: "Home base",
      body: "The Dashboard is where every session starts. Click it from anywhere to come back to your daily overview.",
    },
    {
      target: '[data-tour="header-app-switcher"]',
      placement: "bottom",
      when: canSeeFinance,
      title: "Switch applications",
      body: "Paves has two workspaces. Use this switcher to move between Paves Intranet (people & delivery) and Finance Management (expenses, payables, receivables). The sidebar changes to match.",
    },
    {
      target: '[data-tour="header-profile"]',
      placement: "bottom",
      title: "Your profile & account",
      body: "Your name and roles appear here. Open the menu to:",
      items: [
        { label: "View Profile", desc: "Your employee record, documents and details." },
        { label: "Change Password", desc: "Update your sign-in password anytime." },
        { label: "Logout", desc: "Always sign out on shared computers." },
      ],
    },
    {
      target: '[data-tour="header-tour"]',
      placement: "bottom",
      title: "Help is one click away",
      body: "The Guide opens the Tour Center — every tour available to you, which ones you've completed, and a recommended tour for whichever page you're on.",
      tip: "New to a module? Open the Guide while you're on it and start the recommended tour.",
    },
    {
      target: '[data-tour="dash-kpis"]',
      placement: "right",
      title: "Your month at a glance",
      body: "Quick numbers that matter to you: the projects you're active on and the hours you've logged this month. They update as you submit timesheets.",
    },
    {
      target: '[data-tour="dash-quick-actions"]',
      placement: "right",
      title: "Quick actions",
      body: "The three things people do most, without hunting through menus:",
      items: [
        { label: "Apply Leave", desc: "Opens the leave request form right here." },
        { label: "Enter Timesheets", desc: "Jumps to your weekly timesheet." },
        { label: "Manage Tasks", desc: "Opens My Work — every task assigned to you across projects." },
      ],
    },
    {
      target: '[data-tour="dash-on-leave"]',
      placement: "right",
      title: "Who's away today",
      body: "See colleagues on leave today before you schedule a meeting or wait on a reply.",
    },
    {
      target: '[data-tour="dash-leave-balance"]',
      placement: "right",
      title: "Leave balance",
      body: "Your Earned, Sick and Comp-Off balances — used versus remaining. Click Explore for the full history and to apply.",
    },
    {
      target: '[data-tour="dash-holidays"]',
      placement: "left",
      title: "Upcoming holidays",
      body: "The company holiday calendar for this year, so you can plan time off around long weekends.",
    },
    {
      target: '[data-tour="dash-celebrations"]',
      placement: "left",
      title: "Celebrations",
      body: "Birthdays and work anniversaries across Paves — a good reason to say hello.",
    },
    {
      variant: "outro",
      title: "You're all set!",
      body: "That's the essentials. Each module also has its own short tour — pick one below to keep going, or explore on your own.",
      suggestTours: true,
      tip: "Replay any tour from the Guide button in the top bar.",
    },
  ],
};

/* ─────────────────────────── 2. intranet modules ─────────────────────────── */

const LEAVE = {
  id: "leave",
  group: "intranet",
  icon: PlaneTakeoff,
  title: "Leave Management",
  summary: "Apply for leave, track balances and approvals, and plan around holidays.",
  home: "/leave-management",
  match: ["/leave-management", "/leave-details", "/employee-leave-balance", "/leave-policy", "/edit-holidays", "/approval-rules"],
  steps: [
    {
      variant: "hero",
      title: "Leave Management",
      body: "Everything about time off — from applying, to approval, to your balance updating automatically.",
      flow: ["Apply", "Manager reviews", "Approved / Rejected", "Balance updated"],
      tip: "Apply as early as you can — your manager is notified the moment you submit.",
    },
    navStep({
      target: '[data-tour="nav-leave"]',
      title: "Find it in the sidebar",
      body: "Leave Management opens straight to your own leave page.",
      tip: "Shortcut: the Apply Leave button on the Dashboard opens the same form.",
    }),
    pageStep({
      title: "Your leave workspace",
      body: "This page brings your leave together:",
      items: (ctx) => [
        { label: "Balances", desc: "Earned, Sick, Comp-Off and other leave types — total, used and remaining." },
        { label: "Apply for leave", desc: "Pick the type and dates; half-days are supported. Weekends and holidays aren't deducted." },
        { label: "Requests & status", desc: "Track each request as Pending, Approved, Rejected or Cancelled, and cancel if plans change." },
        isManagerish(ctx) && { label: "Team approvals", desc: "As a manager, your team's requests reach you for approval." },
        isHrOrAdmin(ctx) && { label: "HR tools", desc: "Leave policies, approval rules, holiday calendars and employee balances." },
      ],
    }),
    outroStep({
      body: "Leave requests go to your reporting manager and you'll see the status change here as soon as they act on it.",
    }),
  ],
};

const TIMESHEETS = {
  id: "timesheets",
  group: "intranet",
  icon: Clock,
  title: "Timesheets",
  summary: "Log your weekly hours by project and task, submit for approval and review history.",
  home: "/timesheets",
  match: ["/timesheets"],
  steps: [
    {
      variant: "hero",
      title: "Timesheets",
      body: "Timesheets record where your time goes each week. They drive project billing, utilisation reports and your Hours This Month on the dashboard.",
      flow: ["Log hours daily", "Submit the week", "Manager approves", "Feeds reports"],
      tip: "Fill hours in daily — it's faster and far more accurate than reconstructing a week on Friday.",
    },
    navStep({
      target: '[data-tour="nav-timesheets"]',
      title: "Find it in the sidebar",
      body: "Timesheets opens your weekly view.",
      tip: "Shortcut: Enter Timesheets on the Dashboard brings you here too.",
    }),
    pageStep({
      title: "Your timesheet",
      body: "Here's how this page works:",
      items: (ctx) => [
        { label: "Weekly entry", desc: "Pick a project and task, then enter hours per day for the week." },
        { label: "Submit", desc: "Submitting locks the week and sends it to your manager." },
        { label: "Status & history", desc: "See submitted, approved and rejected weeks; rejected entries come back with a reason to fix." },
        isManagerish(ctx) && { label: "Manager view", desc: "Approve or reject your team's entries and see monthly reports." },
      ],
    }),
    outroStep({ body: "Log a little every day and submit at week's end — that's the whole habit." }),
  ],
};

const PROJECTS = {
  id: "projects",
  group: "intranet",
  icon: FolderKanban,
  title: "Projects",
  summary: "Boards, backlogs, sprints, testing, risks and your personal work queue.",
  when: canSeeProjects,
  home: "/projects",
  match: ["/projects", "/my-work"],
  steps: [
    {
      variant: "hero",
      title: "Projects",
      body: "Plan, track and deliver work. Every project has its own backlog, board, summary, test management and risk register.",
      flow: ["Epic", "Story", "Task", "Done"],
      tip: "My Work (Dashboard → Manage Tasks) lists everything assigned to you across every project.",
    },
    navStep({
      target: '[data-tour="nav-projects"]',
      title: "Find it in the sidebar",
      body: "Projects opens the list of projects you belong to.",
    }),
    pageStep({
      title: "Inside a project",
      body: "Open any project to work in its tabs:",
      items: [
        { label: "Summary", desc: "Status, priority, workload and epic progress at a glance." },
        { label: "Backlog", desc: "Epics, stories and tasks — create, prioritise and plan sprints." },
        { label: "Board", desc: "Drag work across columns as it moves from To Do to Done." },
        { label: "Testing", desc: "Test cycles, runs and an issue tracker for defects." },
        { label: "Risks & status reports", desc: "Log risks and issues with mitigations; share status reports." },
      ],
    }),
    outroStep({ body: "Keep your items' status current — your project's summary, workload and reports all build on it." }),
  ],
};

const EO_DESCRIPTIONS = {
  "Insights & Analytics": "Executive summary and operational metrics for onboarding.",
  "Onboarding Management": "Offers, task configuration, data import and the onboarding workflow.",
  "Employee Directory": "Find anyone at Paves — contact details, team and role.",
  "Document Center": "Employee files and e-form templates.",
  "Workforce Reports": "Weekly joining and workforce reporting.",
  "Compliance & Verification": "Internal audit, background checks and the profile hub.",
  "Manage Skill Taxonomy": "The company skill catalogue, requests and certificates.",
};

const EMPLOYEE_ONBOARDING = {
  id: "employee-onboarding",
  group: "intranet",
  icon: Handshake,
  title: "Employee Onboarding",
  summary: "The people directory, onboarding workflow, documents and HR compliance.",
  home: (ctx) => (is(ctx, ["ADMIN", "SUPER_ADMIN", "HR", "REPORTING_MANAGER"]) ? "/employee-onboarding" : "/employee-onboarding/employee-directory"),
  match: ["/employee-onboarding"],
  steps: [
    {
      variant: "hero",
      title: "Employee Onboarding",
      body: "From offer letter to a fully set-up employee — and the directory everyone uses to find colleagues afterwards.",
      flow: (ctx) => (isHrOrAdmin(ctx) ? ["Offer", "Documents", "Verification", "Onboarded"] : null),
    },
    navStep({
      target: '[data-tour="nav-eo"]',
      title: "What's in this menu",
      body: "Hover the icon to open these sections — they're filtered to your role:",
      items: (ctx) => describeMenu(filterMenuByRole(EO_SUBMENU, ctx.hasRole), EO_DESCRIPTIONS),
      requireItems: true,
    }),
    pageStep({
      title: "This page",
      body: (ctx) =>
        is(ctx, ["ADMIN", "SUPER_ADMIN", "HR", "REPORTING_MANAGER"])
          ? "The workflow overview shows where every new joiner is in onboarding, so nothing stalls between offer and day one."
          : "The Employee Directory — search by name, team or role to find any colleague and their details.",
      tip: "Your own employee record is under your name (top-right) → View Profile.",
    }),
    outroStep({ body: "Keep your profile and documents up to date — HR and your manager rely on them." }),
  ],
};

const USER_MANAGEMENT = {
  id: "user-management",
  group: "intranet",
  icon: Users,
  title: "User Management",
  summary: "Accounts, roles, permissions, groups and access points — who can do what.",
  when: isAdmin,
  home: "/user-management/users",
  match: ["/user-management"],
  steps: [
    {
      variant: "hero",
      title: "User Management",
      body: "This is where access to the whole intranet is controlled. Roles bundle permissions, users get roles, and every menu and page checks them.",
      flow: ["Permission", "Role", "Group", "User"],
      tip: "Changes take effect the next time the user signs in — their role is part of their sign-in session.",
    },
    navStep({
      target: '[data-tour="nav-um"]',
      title: "What's in this menu",
      body: "Hover the icon to open:",
      items: [
        { label: "User Manage", desc: "Create users, reset access and assign roles." },
        { label: "Role Manage", desc: "Define roles and the permissions they carry." },
        { label: "Permission Manage", desc: "The individual capabilities the system checks." },
        { label: "Group Manage", desc: "Assign access to many users at once." },
        { label: "Access Point Manage", desc: "The application areas permissions apply to." },
      ],
    }),
    pageStep({
      title: "Users",
      body: "Search and manage every account. Open a user to change their roles — that single change decides which modules and pages they see.",
    }),
    outroStep({ body: "Grant the narrowest role that gets the job done; it's easier to add access than to audit it later." }),
  ],
};

const RESOURCE_MANAGEMENT = {
  id: "resource-management",
  group: "intranet",
  icon: UserCog2,
  title: "Resource Management",
  summary: "Clients, project staffing, demand, roll-offs, bench and utilisation.",
  when: canSeeRm,
  home: (ctx) => (isAdmin(ctx) || isRM(ctx) ? "/resource-management" : "/resource-management/demand"),
  match: ["/resource-management"],
  steps: [
    {
      variant: "hero",
      title: "Resource Management",
      body: "Match the right people to the right projects — and see who is available, who is rolling off and how well the team is utilised.",
      flow: ["Demand raised", "Resource matched", "Allocated", "Roll-off → Bench"],
    },
    navStep({
      target: '[data-tour="nav-rm"]',
      title: "What's in this menu",
      body: "Sections available to you:",
      items: (ctx) => {
        const all = [
          { label: "Client Management", desc: "Clients and their engagements." },
          { label: "Resource Project Management", desc: "Staffing on each project." },
          { label: "Workforce Availability", desc: "Who's free, partly or fully allocated." },
          { label: "Demand Management", desc: "Open staffing requests from delivery.", dm: true },
          { label: "Roll-Off Management", desc: "People finishing assignments, planned ahead.", dm: true },
          { label: "Bench Management", desc: "Unallocated people and their next move." },
          { label: "Utilization & Performance", desc: "Utilisation trends across the workforce." },
        ];
        if (isAdmin(ctx) && !isRM(ctx) && !isDM(ctx)) return [all[0]];
        if (isDM(ctx) && !isAdmin(ctx) && !isRM(ctx)) return all.filter((i) => i.dm);
        return all;
      },
      tip: (ctx) => (isAdmin(ctx) && !isRM(ctx) && !isDM(ctx) ? "As an Admin this opens Client Management directly." : undefined),
    }),
    pageStep({
      title: "This page",
      body: (ctx) =>
        isAdmin(ctx) || isRM(ctx)
          ? "Client Management — add clients and see their engagements. Projects and staffing hang off these records."
          : "Demand Management — raise and track staffing requests for your projects, then follow them through to allocation.",
    }),
    outroStep({ body: "Raise demand early and plan roll-offs ahead — that's what keeps the bench small." }),
  ],
};

const AI_SCREENING = {
  id: "ai-screening",
  group: "intranet",
  icon: ScanSearch,
  title: "AI Screening",
  summary: "AI-assisted hiring: job descriptions, campaigns, resume intake and the candidate pipeline.",
  when: canSeeAirs,
  home: (ctx) => (is(ctx, ["HR_ADMIN", "RECRUITER"]) ? "/ai-screening/dashboard" : is(ctx, ["HIRING_MANAGER"]) ? "/ai-screening/campaigns" : "/dashboard"),
  match: ["/ai-screening"],
  steps: [
    {
      variant: "hero",
      title: "AI Screening",
      body: "Screen candidates faster. Resumes are scored against the job description and skill ontology, and move through a shared pipeline to interview and decision.",
      flow: ["JD", "Campaign", "Resumes scored", "Pipeline", "Interview"],
      tip: "AI scores are a starting point — every decision stays with people.",
    },
    navStep({
      target: '[data-tour="nav-airs"]',
      title: "What's in this menu",
      body: "Sections available to you:",
      items: (ctx) => {
        const hrAdmin = is(ctx, ["HR_ADMIN"]);
        const recruiter = is(ctx, ["RECRUITER"]);
        const hm = is(ctx, ["HIRING_MANAGER"]);
        const row = (label, desc, show) => show && { label, desc };
        return [
          row("Dashboard", "Hiring funnel and campaign health.", hrAdmin || recruiter),
          row("JD Management", "Create and maintain job descriptions.", hrAdmin || (!recruiter && !hm)),
          row("Campaigns", "A hiring drive for a role — resumes, criteria and progress.", true),
          row("Resume Intake", "Upload resumes for AI scoring.", recruiter || (!hrAdmin && !hm)),
          row("Pipeline", "Candidates by stage, from screened to decision.", true),
          row("Talent Pool", "Past candidates worth reconsidering.", hrAdmin || recruiter || !hm),
          row("Skill Ontology", "The skills vocabulary scoring is based on.", hrAdmin || (!recruiter && !hm)),
          row("Interview Calendar", "Scheduled interviews across campaigns.", hrAdmin || recruiter || hm),
          row("HM Review", "Candidates waiting for your decision.", hm),
          row("Prompt Templates & Settings", "How the AI scores and communicates.", hrAdmin),
        ];
      },
      requireItems: true,
    }),
    pageStep({
      route: (ctx) => (is(ctx, ["HR_ADMIN", "RECRUITER"]) ? "/ai-screening/dashboard" : is(ctx, ["HIRING_MANAGER"]) ? "/ai-screening/campaigns" : null),
      title: "This page",
      body: (ctx) =>
        is(ctx, ["HR_ADMIN", "RECRUITER"])
          ? "The AI Screening dashboard — how many candidates are in each stage, and which campaigns need attention."
          : "Campaigns — each open role and its candidates. Open one to review the shortlist and pipeline.",
    }),
    outroStep({ body: "Keep candidates moving through the pipeline — a fast response is the best candidate experience." }),
  ],
};

/* ──────────────────────────── 3. finance modules ──────────────────────────── */

const FINANCE_OVERVIEW = {
  id: "finance",
  group: "finance",
  icon: Landmark,
  title: "Finance Management",
  summary: "The finance workspace: switching to it, its dashboard and how its modules fit together.",
  when: canSeeFinance,
  home: "/finance/dashboard",
  match: ["/finance"],
  steps: [
    {
      variant: "hero",
      title: "Finance Management",
      body: "A separate workspace for money flowing in and out of Paves. Its modules follow the money:",
      items: (ctx) => [
        canSeeXms(ctx) && { label: "Expense Management", desc: "Employee expenses and cash advances — claimed, approved, reimbursed." },
        canSeeAp(ctx) && { label: "Accounts Payable", desc: "Vendor invoices — received, approved, paid, with TDS and GST." },
        canSeeAr(ctx) && { label: "Account Receivable", desc: "Client billing — configured, invoiced and collected." },
      ],
    },
    {
      target: '[data-tour="header-app-switcher"]',
      placement: "bottom",
      title: "Switching workspaces",
      body: "You're in Finance Management now. Use this switcher to go back to Paves Intranet at any time — the sidebar changes with it.",
    },
    {
      target: '[data-tour="sidebar-nav"]',
      placement: "right",
      padding: 6,
      title: "Finance modules",
      body: "The finance sidebar shows only the modules your role works in. Each opens a flyout menu on hover.",
    },
    pageStep({
      title: "Finance dashboard",
      body: "Your landing page in Finance Management — the modules you can open and, for finance roles, organisation-wide figures and items that need action.",
    }),
    outroStep({ body: "Take the Expense, Payables or Receivables tour next for a closer look at the module you work in.", tip: "Open the Guide → Finance Management section." }),
  ],
};

const XMS_DESCRIPTIONS = {
  Dashboard: "Your expense overview — what's pending, approved and paid.",
  Notifications: "Updates on your claims and approvals.",
  Expenses: "Create and track expense claims with receipts.",
  "Request Advance": "Ask for cash before a trip or purchase.",
  "My Advances": "Advances you've received and their status.",
  Settlement: "Settle an advance against your actual expenses.",
  Approvals: "Claims and advances waiting for your decision.",
  Finance: "Verify approved reports, query issues and track AP payment.",
  "AP Payments": "Pay out verified reimbursements.",
  "Client Billing": "Hand off billable expenses for client invoicing.",
  Masters: "Categories, ledgers, cost centres, currencies and tax.",
  "Approval Rules": "Who approves what — flows, approvers and delegations.",
  "Policy & Compliance": "Spend policies, rules, thresholds and versions.",
  Reports: "Spend analysis for your team or the organisation.",
  Settings: "Module-wide configuration.",
};

const EXPENSE_MANAGEMENT = {
  id: "expense-management",
  group: "finance",
  icon: Receipt,
  title: "Expense Management",
  summary: "Claim expenses, request cash advances, approve and reimburse.",
  when: canSeeXms,
  home: "/expense-management/dashboard",
  match: ["/expense-management"],
  steps: [
    {
      variant: "hero",
      title: "Expense Management",
      body: "Spent money for work? Claim it here. Every claim is checked against company policy, approved, verified by Finance and reimbursed.",
      flow: ["Submit claim", "Approval", "Finance verifies", "Reimbursed"],
      tip: "Attach a clear receipt to every line — it's the most common reason a claim is queried.",
    },
    navStep({
      target: '[data-tour="nav-xms"]',
      title: "What's in this menu",
      body: "Sections available to you:",
      items: (ctx) => describeMenu(filterMenuByRole(XMS_SUBMENU, ctx.hasRole), XMS_DESCRIPTIONS),
      requireItems: true,
    }),
    {
      target: '[data-tour="header-notifications"]',
      placement: "bottom",
      title: "Expense notifications",
      body: "The bell shows unread updates — approvals, queries and payments — live as they happen.",
    },
    pageStep({
      title: "Expense dashboard",
      body: "Your starting point: claims and advances by status, and anything waiting on you.",
    }),
    outroStep({ body: "Submit claims promptly with receipts, and check Approvals regularly if others report to you." }),
  ],
};

const AP_DESCRIPTIONS = {
  Dashboard: "Your role's view of the AP queue and what needs action.",
  Notifications: "Invoices and payments that need your attention.",
  "How It Works": "The whole AP flow by role, with a glossary of TDS/GST terms.",
  "Invoices & Vendors": "Invoices, recurring bills, credit/debit notes, vendors and procurement.",
  "Payments & Tax": "Payment management, TDS tracking, GST input credit and receipts.",
  "Reports & Accounting": "AP reports and Tally / Zoho Books export.",
  Settings: "System and TDS configuration, automation and the AP team.",
};

const ACCOUNTS_PAYABLE = {
  id: "accounts-payable",
  group: "finance",
  icon: ApModuleIcon,
  title: "Accounts Payable",
  summary: "Vendor invoices from arrival to payment — approvals, TDS, GST and accounting.",
  when: canSeeAp,
  home: AP_ROUTES.DASHBOARD,
  match: ["/accounts-payable"],
  steps: [
    {
      variant: "hero",
      title: "Accounts Payable",
      body: "Every vendor invoice, from the moment it arrives to the moment it's paid and accounted for — with TDS and GST handled along the way.",
      flow: ["Invoice in", "Reviewed", "Approved", "TDS verified", "Paid"],
      tip: "Not sure what a term like TDS, 26Q or GSTR-2B means? The How It Works page has a glossary.",
    },
    navStep({
      target: '[data-tour="nav-ap"]',
      title: "What's in this menu",
      body: "Sections available to you — hover a section to see its pages:",
      items: (ctx) => describeMenu(filterMenuByRole(AP_SUBMENU, ctx.hasRole, ctx.hasAnyPermission), AP_DESCRIPTIONS),
      requireItems: true,
    }),
    pageStep({
      title: "AP dashboard",
      body: "Tailored to your AP role — intake, approval or finance — with your queues and the next actions to take.",
    }),
    outroStep({
      body: "For the step-by-step flow for your role, open How It Works in the AP menu.",
      action: { label: "Open How It Works", to: AP_ROUTES.GUIDE },
    }),
  ],
};

const ACCOUNT_RECEIVABLE = {
  id: "account-receivable",
  group: "finance",
  icon: ArModuleIcon,
  title: "Account Receivable",
  summary: "Client billing set-up, invoicing with maker–checker approval, and collections.",
  when: canSeeAr,
  home: (ctx) => (isArMaker(ctx) ? "/account-receivable/dashboard" : "/account-receivable/billing-approvals"),
  match: ["/account-receivable"],
  steps: [
    {
      variant: "hero",
      title: "Account Receivable",
      body: "How Paves bills its clients and collects payment. Every billing set-up and invoice uses maker–checker: one person prepares, another approves.",
      flow: ["Billing set-up", "Approval", "Data & tax", "Invoice", "Collected"],
      items: (ctx) => [
        isArMaker(ctx) && { label: "You are a Maker", desc: "You prepare billing configurations and invoices and submit them for approval." },
        isArChecker(ctx) && { label: "You are a Checker", desc: "You review, approve or reject what Makers submit." },
      ],
    },
    navStep({
      target: '[data-tour="nav-ar"]',
      title: "What's in this menu",
      body: "Sections available to you:",
      items: (ctx) => {
        const maker = isArMaker(ctx);
        const checker = isArChecker(ctx);
        const row = (label, desc, show) => show && { label, desc };
        return [
          row("Dashboard", "Billing and receivables at a glance.", maker),
          row("Project Billing Setup", "Configure how each project is billed.", maker),
          row("Billing Approvals", "Approve or reject billing configurations.", checker),
          row("Billing Data Acquisition", "Gather the hours and milestones to bill.", maker),
          row("Tax Calculation", "Apply the right GST to each invoice.", maker),
          row("Invoice Generation", "Create invoices from approved billing data.", maker),
          row("Invoice Approval", "Approve invoices before they go to clients.", checker),
          row("Receivables", "Outstanding amounts, payments, ledgers, notes and reminders.", true),
          row("Configuration", "Company profile, tax and exchange-rate masters.", maker),
        ];
      },
      requireItems: true,
    }),
    pageStep({
      title: "This page",
      body: (ctx) =>
        isArMaker(ctx)
          ? "The AR dashboard — what's been billed, what's outstanding and what's waiting in the workflow."
          : "Billing Approvals — configurations submitted by Makers, waiting for your review.",
    }),
    outroStep({ body: "Check Receivables regularly — reminders and collections keep cash flowing." }),
  ],
};

export const TOURS = [
  WELCOME,
  LEAVE,
  TIMESHEETS,
  PROJECTS,
  EMPLOYEE_ONBOARDING,
  RESOURCE_MANAGEMENT,
  AI_SCREENING,
  USER_MANAGEMENT,
  FINANCE_OVERVIEW,
  EXPENSE_MANAGEMENT,
  ACCOUNTS_PAYABLE,
  ACCOUNT_RECEIVABLE,
];

export const WELCOME_TOUR_ID = WELCOME.id;
