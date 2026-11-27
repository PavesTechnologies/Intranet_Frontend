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
  tip: tip ?? "Hover over the icon to open its menu. Click ☰ (top-left) to show the labels.",
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
  tip: tip ?? "Replay this tour anytime from Guide in the top bar.",
  action,
  variant: "outro",
});

/* ─────────────────────────────── 1. welcome ─────────────────────────────── */

const WELCOME = {
  id: "welcome",
  group: "start",
  icon: Sparkles,
  title: "Welcome to Paves Intranet",
  summary: "The essentials in two minutes: menus, your dashboard, your profile and help.",
  home: "/dashboard",
  match: ["/dashboard"],
  steps: [
    {
      variant: "hero",
      title: (ctx) => `Welcome to Paves Intranet${ctx.firstName ? `, ${ctx.firstName}` : ""}!`,
      body: "One place for your work at Paves: leave, timesheets, projects, people and, for finance teams, money. Here's a quick look around.",
      items: [
        { label: "Find your way", desc: "How the sidebar menus work." },
        { label: "Your day at a glance", desc: "What each dashboard card shows." },
        { label: "Your account", desc: "Profile, password and switching apps." },
        { label: "Help", desc: "Where to replay this and other tours." },
      ],
      tip: "Use ← → to move between steps. Press Esc to exit.",
    },
    {
      target: '[data-tour="sidebar-nav"]',
      placement: "right",
      padding: 6,
      title: "Your menu",
      body: "Every module you can use is here. The list matches your role, so you only see pages you can open.",
      items: (ctx) => [
        { label: "Dashboard", desc: "Your home page." },
        canSeeAirs(ctx) && { label: "AI Screening", desc: "Screen resumes and track candidates." },
        { label: "Employee Onboarding", desc: "Find colleagues, onboarding and HR records." },
        isAdmin(ctx) && { label: "User Management", desc: "Users, roles and access." },
        canSeeRm(ctx) && { label: "Resource Management", desc: "Clients, staffing, bench and utilisation." },
        canSeeProjects(ctx) && { label: "Projects", desc: "Backlogs, boards, testing and risks." },
        { label: "Leave Management", desc: "Apply for leave and track it." },
        { label: "Timesheets", desc: "Log and submit your hours each week." },
      ],
      tip: "Items with a › open a menu when you hover over them.",
    },
    {
      target: '[data-tour="header-toggle"]',
      placement: "bottom",
      padding: 6,
      title: "Show or hide labels",
      body: "The sidebar starts small to give you more room. Click here to show module names. Click again to hide them.",
    },
    {
      target: '[data-tour="nav-dashboard"]',
      placement: "right",
      padding: 4,
      title: "Back to your dashboard",
      body: "Click Dashboard from any page to return to your daily overview.",
    },
    {
      target: '[data-tour="header-app-switcher"]',
      placement: "bottom",
      when: canSeeFinance,
      title: "Switch apps",
      body: "Move between Paves Intranet (people and delivery) and Finance Management (expenses, payables and receivables). The sidebar changes to match.",
    },
    {
      target: '[data-tour="header-profile"]',
      placement: "bottom",
      title: "Your profile",
      body: "Your name and roles. Open the menu to:",
      items: [
        { label: "View Profile", desc: "See your details and documents." },
        { label: "Change Password", desc: "Update your password." },
        { label: "Logout", desc: "Sign out. Always do this on a shared computer." },
      ],
    },
    {
      target: '[data-tour="header-tour"]',
      placement: "bottom",
      title: "Help anytime",
      body: "Guide lists every tour you can take, shows which ones you've finished, and suggests one for the page you're on.",
      tip: "New to a module? Open Guide on that page and start the suggested tour.",
    },
    {
      target: '[data-tour="dash-kpis"]',
      placement: "right",
      title: "This month",
      body: "Your active projects and the hours you've logged this month. They update when you submit timesheets.",
    },
    {
      target: '[data-tour="dash-quick-actions"]',
      placement: "bottom",
      title: "Quick actions",
      body: "The three most common tasks, one click away:",
      items: [
        { label: "Apply Leave", desc: "Opens the leave form." },
        { label: "Enter Timesheets", desc: "Opens this week's timesheet." },
        { label: "Manage Tasks", desc: "Opens My Work: every task assigned to you." },
      ],
    },
    {
      target: '[data-tour="dash-priority-tasks"]',
      placement: "right",
      title: "Priority tasks",
      body: "Your open work that needs attention first: overdue, due today or this week, and critical or high priority items across your projects.",
    },
    {
      target: '[data-tour="dash-on-leave"]',
      placement: "right",
      title: "On leave today",
      body: "Check who's away before you book a meeting or wait for a reply.",
    },
    {
      target: '[data-tour="dash-leave-balance"]',
      placement: "right",
      title: "Leave balance",
      body: "Your Earned, Sick and Comp-Off balances — remaining out of total. Click Apply to request leave, or Explore for the full history.",
    },
    {
      target: '[data-tour="dash-holidays"]',
      placement: "left",
      title: "Upcoming holidays",
      body: "This year's company holidays, to help you plan time off.",
    },
    {
      target: '[data-tour="dash-celebrations"]',
      placement: "left",
      title: "Celebrations",
      body: "Birthdays and work anniversaries at Paves. A good reason to say hello.",
    },
    {
      variant: "outro",
      title: "You're all set!",
      body: "That's the basics. Each module has its own short tour. Pick one below, or explore on your own.",
      suggestTours: true,
      tip: "Replay any tour from Guide in the top bar.",
    },
  ],
};

/* ─────────────────────────── 2. intranet modules ─────────────────────────── */

const LEAVE = {
  id: "leave",
  group: "intranet",
  icon: PlaneTakeoff,
  title: "Leave Management",
  summary: "Apply for leave, track approvals and balances, and plan around holidays.",
  home: "/leave-management",
  match: ["/leave-management", "/leave-details", "/employee-leave-balance", "/leave-policy", "/edit-holidays", "/approval-rules"],
  steps: [
    {
      variant: "hero",
      title: "Leave Management",
      body: "Apply for time off, get it approved, and see your balance update on its own.",
      flow: ["Apply", "Manager reviews", "Approved / Rejected", "Balance updated"],
      tip: "Apply early. Your manager is notified as soon as you submit.",
    },
    navStep({
      target: '[data-tour="nav-leave"]',
      title: "Find it in the sidebar",
      body: "Opens your leave page.",
      tip: "Shortcut: Apply Leave on the Dashboard opens the same form.",
    }),
    pageStep({
      title: "Your leave page",
      body: "What you'll find here:",
      items: (ctx) => [
        { label: "Balances", desc: "Each leave type: total, used and remaining." },
        { label: "Apply for leave", desc: "Pick the type and dates. Half-days are allowed. Weekends and holidays aren't counted." },
        { label: "Requests", desc: "See each request's status. Cancel one if your plans change." },
        isManagerish(ctx) && { label: "Team approvals", desc: "Approve or reject your team's requests." },
        isHrOrAdmin(ctx) && { label: "HR tools", desc: "Leave policies, approval rules, holidays and employee balances." },
      ],
    }),
    outroStep({
      body: "Your requests go to your reporting manager. The status changes here as soon as they decide.",
    }),
  ],
};

const TIMESHEETS = {
  id: "timesheets",
  group: "intranet",
  icon: Clock,
  title: "Timesheets",
  summary: "Log hours by project and task, submit each week, and see past weeks.",
  home: "/timesheets",
  match: ["/timesheets"],
  steps: [
    {
      variant: "hero",
      title: "Timesheets",
      body: "Record where your time goes each week. Your hours feed project billing, utilisation reports and the hours on your dashboard.",
      flow: ["Log hours daily", "Submit the week", "Manager approves", "Feeds reports"],
      tip: "Fill in hours daily. It's quicker and more accurate than catching up on Friday.",
    },
    navStep({
      target: '[data-tour="nav-timesheets"]',
      title: "Find it in the sidebar",
      body: "Opens this week's timesheet.",
      tip: "Shortcut: Enter Timesheets on the Dashboard.",
    }),
    pageStep({
      title: "Your timesheet",
      body: "How it works:",
      items: (ctx) => [
        { label: "Enter hours", desc: "Pick a project and task, then enter hours for each day." },
        { label: "Submit", desc: "Locks the week and sends it to your manager." },
        { label: "History", desc: "See past weeks. Rejected weeks come back with a reason so you can fix them." },
        isManagerish(ctx) && { label: "Manager view", desc: "Approve or reject your team's hours and see monthly reports." },
      ],
    }),
    outroStep({ body: "Log a little each day and submit at the end of the week." }),
  ],
};

const PROJECTS = {
  id: "projects",
  group: "intranet",
  icon: FolderKanban,
  title: "Projects",
  summary: "Backlogs, boards, sprints, testing, risks and your own task list.",
  when: canSeeProjects,
  home: "/projects",
  match: ["/projects", "/my-work"],
  steps: [
    {
      variant: "hero",
      title: "Projects",
      body: "Plan, track and deliver work. Each project has its own summary, backlog, board, testing and risks.",
      flow: ["Epic", "Story", "Task", "Done"],
      tip: "My Work (Dashboard → Manage Tasks) lists all tasks assigned to you.",
    },
    navStep({
      target: '[data-tour="nav-projects"]',
      title: "Find it in the sidebar",
      body: "Opens the projects you're part of.",
    }),
    pageStep({
      title: "Inside a project",
      body: "Each project has these tabs:",
      items: [
        { label: "Summary", desc: "Status, priority, workload and progress." },
        { label: "Backlog", desc: "Create and prioritise work, and plan sprints." },
        { label: "Board", desc: "Drag work from To Do to Done." },
        { label: "Testing", desc: "Test cycles, runs and defects." },
        { label: "Risks & status reports", desc: "Log risks with their fixes, and share status reports." },
      ],
    }),
    outroStep({ body: "Keep your task status up to date. The summary, workload and reports depend on it." }),
  ],
};

const EO_DESCRIPTIONS = {
  "Insights & Analytics": "Onboarding numbers and trends.",
  "Onboarding Management": "Offers, tasks, data import and the onboarding steps.",
  "Employee Directory": "Find anyone at Paves, with their team, role and contact details.",
  "Document Center": "Employee files and form templates.",
  "Workforce Reports": "Weekly joiners and workforce reports.",
  "Compliance & Verification": "Audits, background checks and employee profiles.",
  "Manage Skill Taxonomy": "The company skill list, skill requests and certificates.",
};

const EMPLOYEE_ONBOARDING = {
  id: "employee-onboarding",
  group: "intranet",
  icon: Handshake,
  title: "Employee Onboarding",
  summary: "Find colleagues, onboard new joiners, and manage HR documents and checks.",
  home: (ctx) => (is(ctx, ["ADMIN", "SUPER_ADMIN", "HR", "REPORTING_MANAGER"]) ? "/employee-onboarding" : "/employee-onboarding/employee-directory"),
  match: ["/employee-onboarding"],
  steps: [
    {
      variant: "hero",
      title: "Employee Onboarding",
      body: "Takes a new joiner from offer letter to day one. Everyone also uses it to find colleagues.",
      flow: (ctx) => (isHrOrAdmin(ctx) ? ["Offer", "Documents", "Verification", "Onboarded"] : null),
    },
    navStep({
      target: '[data-tour="nav-eo"]',
      title: "What's in this menu",
      body: "Hover over the icon to open these sections. You only see the ones for your role:",
      items: (ctx) => describeMenu(filterMenuByRole(EO_SUBMENU, ctx.hasRole), EO_DESCRIPTIONS),
      requireItems: true,
    }),
    pageStep({
      title: "This page",
      body: (ctx) =>
        is(ctx, ["ADMIN", "SUPER_ADMIN", "HR", "REPORTING_MANAGER"])
          ? "See where each new joiner is in onboarding, so nobody gets stuck between offer and day one."
          : "The Employee Directory. Search by name, team or role to find a colleague.",
      tip: "Your own record: your name (top-right) → View Profile.",
    }),
    outroStep({ body: "Keep your profile and documents up to date. HR and your manager rely on them." }),
  ],
};

const USER_MANAGEMENT = {
  id: "user-management",
  group: "intranet",
  icon: Users,
  title: "User Management",
  summary: "Who can do what: accounts, roles, permissions and groups.",
  when: isAdmin,
  home: "/user-management/users",
  match: ["/user-management"],
  steps: [
    {
      variant: "hero",
      title: "User Management",
      body: "Control access to the whole intranet. A role is a set of permissions. Give users roles, and every menu and page checks them.",
      flow: ["Permission", "Role", "Group", "User"],
      tip: "Changes apply the next time the user signs in.",
    },
    navStep({
      target: '[data-tour="nav-um"]',
      title: "What's in this menu",
      body: "Hover over the icon to open:",
      items: [
        { label: "User Manage", desc: "Add users, reset access and give roles." },
        { label: "Role Manage", desc: "Create roles and choose their permissions." },
        { label: "Permission Manage", desc: "The single actions a role can allow." },
        { label: "Group Manage", desc: "Give access to many users at once." },
        { label: "Access Point Manage", desc: "The app areas that permissions cover." },
      ],
    }),
    pageStep({
      title: "Users",
      body: "Search and manage accounts. Open a user to change their roles. Roles decide which modules and pages they see.",
    }),
    outroStep({ body: "Give the smallest role that does the job. Adding access later is easier than removing it." }),
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
      body: "Put the right people on the right projects. See who's free, who's rolling off and how busy the team is.",
      flow: ["Demand raised", "Resource matched", "Allocated", "Roll-off → Bench"],
    },
    navStep({
      target: '[data-tour="nav-rm"]',
      title: "What's in this menu",
      body: "Your sections:",
      items: (ctx) => {
        const all = [
          { label: "Client Management", desc: "Clients and their projects." },
          { label: "Resource Project Management", desc: "Who works on each project." },
          { label: "Workforce Availability", desc: "Who's free, partly busy or fully busy." },
          { label: "Demand Management", desc: "Open requests for people.", dm: true },
          { label: "Roll-Off Management", desc: "People finishing a project, planned ahead.", dm: true },
          { label: "Bench Management", desc: "People without a project, and what's next for them." },
          { label: "Utilization & Performance", desc: "How busy the workforce is over time." },
        ];
        if (isAdmin(ctx) && !isRM(ctx) && !isDM(ctx)) return [all[0]];
        if (isDM(ctx) && !isAdmin(ctx) && !isRM(ctx)) return all.filter((i) => i.dm);
        return all;
      },
      tip: (ctx) => (isAdmin(ctx) && !isRM(ctx) && !isDM(ctx) ? "As an Admin, this opens Client Management." : undefined),
    }),
    pageStep({
      title: "This page",
      body: (ctx) =>
        isAdmin(ctx) || isRM(ctx)
          ? "Client Management. Add clients and see their projects. Projects and staffing are linked to these clients."
          : "Demand Management. Request people for your projects and follow each request until someone is assigned.",
    }),
    outroStep({ body: "Request people early and plan roll-offs ahead. That keeps the bench small." }),
  ],
};

const AI_SCREENING = {
  id: "ai-screening",
  group: "intranet",
  icon: ScanSearch,
  title: "AI Screening",
  summary: "Hiring with AI help: job descriptions, campaigns, resumes and candidates.",
  when: canSeeAirs,
  home: (ctx) => (is(ctx, ["HR_ADMIN", "RECRUITER"]) ? "/ai-screening/dashboard" : is(ctx, ["HIRING_MANAGER"]) ? "/ai-screening/campaigns" : "/dashboard"),
  match: ["/ai-screening"],
  steps: [
    {
      variant: "hero",
      title: "AI Screening",
      body: "Screen candidates faster. Each resume is scored against the job description and skills list, then moves through the pipeline to interview and decision.",
      flow: ["JD", "Campaign", "Resumes scored", "Pipeline", "Interview"],
      tip: "AI scores are a starting point. People make every decision.",
    },
    navStep({
      target: '[data-tour="nav-airs"]',
      title: "What's in this menu",
      body: "Your sections:",
      items: (ctx) => {
        const hrAdmin = is(ctx, ["HR_ADMIN"]);
        const recruiter = is(ctx, ["RECRUITER"]);
        const hm = is(ctx, ["HIRING_MANAGER"]);
        const row = (label, desc, show) => show && { label, desc };
        return [
          row("Dashboard", "Candidates by stage and how each campaign is doing.", hrAdmin || recruiter),
          row("JD Management", "Write and update job descriptions.", hrAdmin || (!recruiter && !hm)),
          row("Campaigns", "One hiring drive per role: resumes, criteria and progress.", true),
          row("Resume Intake", "Upload resumes to be scored.", recruiter || (!hrAdmin && !hm)),
          row("Pipeline", "Candidates by stage, from screening to decision.", true),
          row("Talent Pool", "Past candidates worth another look.", hrAdmin || recruiter || !hm),
          row("Skill Ontology", "The skills list used for scoring.", hrAdmin || (!recruiter && !hm)),
          row("Interview Calendar", "All scheduled interviews.", hrAdmin || recruiter || hm),
          row("HM Review", "Candidates waiting for your decision.", hm),
          row("Prompt Templates & Settings", "How the AI scores and writes messages.", hrAdmin),
        ];
      },
      requireItems: true,
    }),
    pageStep({
      route: (ctx) => (is(ctx, ["HR_ADMIN", "RECRUITER"]) ? "/ai-screening/dashboard" : is(ctx, ["HIRING_MANAGER"]) ? "/ai-screening/campaigns" : null),
      title: "This page",
      body: (ctx) =>
        is(ctx, ["HR_ADMIN", "RECRUITER"])
          ? "The AI Screening dashboard. See how many candidates are at each stage and which campaigns need attention."
          : "Campaigns. Each open role and its candidates. Open one to review its shortlist.",
    }),
    outroStep({ body: "Keep candidates moving. A quick reply is the best experience you can give them." }),
  ],
};

/* ──────────────────────────── 3. finance modules ──────────────────────────── */

const FINANCE_OVERVIEW = {
  id: "finance",
  group: "finance",
  icon: Landmark,
  title: "Finance Management",
  summary: "How to get to Finance Management, its dashboard, and how its modules fit together.",
  when: canSeeFinance,
  home: "/finance/dashboard",
  match: ["/finance"],
  steps: [
    {
      variant: "hero",
      title: "Finance Management",
      body: "A separate workspace for money coming into and going out of Paves:",
      items: (ctx) => [
        canSeeXms(ctx) && { label: "Expense Management", desc: "Employee expenses and cash advances, from claim to reimbursement." },
        canSeeAp(ctx) && { label: "Accounts Payable", desc: "Vendor invoices, from receipt to payment, with TDS and GST." },
        canSeeAr(ctx) && { label: "Account Receivable", desc: "Client billing, from set-up to invoice to payment." },
      ],
    },
    {
      target: '[data-tour="header-app-switcher"]',
      placement: "bottom",
      title: "Switch apps",
      body: "You're in Finance Management. Use this to go back to Paves Intranet. The sidebar changes to match.",
    },
    {
      target: '[data-tour="sidebar-nav"]',
      placement: "right",
      padding: 6,
      title: "Finance modules",
      body: "You only see the modules your role uses. Hover over one to open its menu.",
    },
    pageStep({
      title: "Finance dashboard",
      body: "Your Finance Management home page: the modules you can open and, for finance roles, company figures and items to act on.",
    }),
    outroStep({ body: "Next, take the tour for the module you work in: Expenses, Payables or Receivables.", tip: "Open Guide → Finance Management." }),
  ],
};

const XMS_DESCRIPTIONS = {
  Dashboard: "Your claims and advances: what's waiting, approved and paid.",
  Expenses: "Claim expenses with receipts and track them.",
  "Request Advance": "Ask for money before a trip or purchase.",
  "My Advances": "Your advances: paid, used and still with you.",
  Settlement: "Close an advance against what you actually spent.",
  Approvals: "Claims and advances waiting for your decision.",
  Finance: "Check approved claims, raise queries and track payment.",
  "ITC Register": "GST you can claim back, ready for the GST return.",
  "AP Payments": "Pay employees for verified claims.",
  "Client Billing": "Send client-billable expenses for invoicing.",
  Masters: "Categories, ledgers, cost centres, currencies and tax codes.",
  "Approval Rules": "Who approves what, and who stands in when they're away.",
  "Policy & Compliance": "Spending rules and limits.",
  Reports: "Spending reports for your team or the company.",
  Settings: "Settings for the whole module.",
};

const EXPENSE_MANAGEMENT = {
  id: "expense-management",
  group: "finance",
  icon: Receipt,
  title: "Expense Management",
  summary: "Claim expenses, request cash advances, approve and get reimbursed.",
  when: canSeeXms,
  home: "/expense-management/dashboard",
  match: ["/expense-management"],
  steps: [
    {
      variant: "hero",
      title: "Expense Management",
      body: "Spent your own money on work? Claim it here. Each claim is checked against policy, approved by your manager, checked by Finance, then paid.",
      flow: ["Submit claim", "Approval", "Finance verifies", "Reimbursed"],
      tip: "Add a clear receipt to every line. Missing receipts are the top reason claims are sent back.",
    },
    navStep({
      target: '[data-tour="nav-xms"]',
      title: "What's in this menu",
      body: "Your sections:",
      items: (ctx) => describeMenu(filterMenuByRole(XMS_SUBMENU, ctx.hasRole), XMS_DESCRIPTIONS),
      requireItems: true,
    }),
    {
      target: '[data-tour="header-notifications"]',
      placement: "bottom",
      title: "Notifications",
      body: "The bell shows new updates on approvals, queries and payments as they happen. Open it to see them all.",
    },
    pageStep({
      title: "Expense dashboard",
      body: "Your claims and advances by status, and anything waiting for you.",
    }),
    outroStep({ body: "Submit claims soon after you spend, with receipts. If people report to you, check Approvals often." }),
  ],
};

const AP_DESCRIPTIONS = {
  Dashboard: "Your AP work and what needs action.",
  "How It Works": "The AP steps for each role, and what TDS and GST terms mean.",
  "Invoices & Vendors": "Invoices, recurring bills, credit and debit notes, vendors and purchasing.",
  "Payments & Tax": "Payments, TDS, GST input credit and receipts.",
  "Reports & Accounting": "AP reports and export to Tally or Zoho Books.",
  Settings: "TDS and system settings, automation and the AP team.",
};

const ACCOUNTS_PAYABLE = {
  id: "accounts-payable",
  group: "finance",
  icon: ApModuleIcon,
  title: "Accounts Payable",
  summary: "Vendor invoices from receipt to payment, with approvals, TDS, GST and accounting.",
  when: canSeeAp,
  home: AP_ROUTES.DASHBOARD,
  match: ["/accounts-payable"],
  steps: [
    {
      variant: "hero",
      title: "Accounts Payable",
      body: "Handle every vendor invoice from receipt to payment, with TDS and GST taken care of on the way.",
      flow: ["Invoice in", "Reviewed", "Approved", "TDS verified", "Paid"],
      tip: "Not sure what TDS, 26Q or GSTR-2B mean? How It Works explains them.",
    },
    navStep({
      target: '[data-tour="nav-ap"]',
      title: "What's in this menu",
      body: "Your sections. Hover over one to see its pages:",
      items: (ctx) => describeMenu(filterMenuByRole(AP_SUBMENU, ctx.hasRole, ctx.hasAnyPermission), AP_DESCRIPTIONS),
      requireItems: true,
    }),
    pageStep({
      title: "AP dashboard",
      body: "Shows your AP work (intake, approval or finance) and what to do next.",
    }),
    outroStep({
      body: "For the steps your role follows, open How It Works in the AP menu.",
      action: { label: "Open How It Works", to: AP_ROUTES.GUIDE },
    }),
  ],
};

const ACCOUNT_RECEIVABLE = {
  id: "account-receivable",
  group: "finance",
  icon: ArModuleIcon,
  title: "Account Receivable",
  summary: "Set up client billing, create and approve invoices, and collect payment.",
  when: canSeeAr,
  home: (ctx) => (isArMaker(ctx) ? "/account-receivable/dashboard" : "/account-receivable/billing-approvals"),
  match: ["/account-receivable"],
  steps: [
    {
      variant: "hero",
      title: "Account Receivable",
      body: "How Paves bills clients and collects payment. One person prepares each billing set-up and invoice, and another approves it.",
      flow: ["Billing set-up", "Approval", "Data & tax", "Invoice", "Collected"],
      items: (ctx) => [
        isArMaker(ctx) && { label: "You are a Maker", desc: "You prepare billing set-ups and invoices and send them for approval." },
        isArChecker(ctx) && { label: "You are a Checker", desc: "You approve or reject what Makers send." },
      ],
    },
    navStep({
      target: '[data-tour="nav-ar"]',
      title: "What's in this menu",
      body: "Your sections:",
      items: (ctx) => {
        const maker = isArMaker(ctx);
        const checker = isArChecker(ctx);
        const row = (label, desc, show) => show && { label, desc };
        return [
          row("Dashboard", "Billing and payments due, at a glance.", maker),
          row("Project Billing Setup", "Set how each project is billed.", maker),
          row("Billing Approvals", "Approve or reject billing set-ups.", checker),
          row("Billing Data Acquisition", "Collect the hours and milestones to bill.", maker),
          row("Tax Calculation", "Add the right GST to each invoice.", maker),
          row("Invoice Generation", "Create invoices from approved billing data.", maker),
          row("Invoice Approval", "Approve invoices before they go to clients.", checker),
          row("Receivables", "Amounts due, payments received, ledgers and reminders.", true),
          row("Configuration", "Company details, tax and exchange rates.", maker),
        ];
      },
      requireItems: true,
    }),
    pageStep({
      title: "This page",
      body: (ctx) =>
        isArMaker(ctx)
          ? "The AR dashboard. See what's billed, what's still due and what's waiting for approval."
          : "Billing Approvals. Billing set-ups from Makers, waiting for your review.",
    }),
    outroStep({ body: "Check Receivables often. Timely reminders get clients to pay on time." }),
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
