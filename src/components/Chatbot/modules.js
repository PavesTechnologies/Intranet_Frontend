/**
 * Module awareness for the assistant.
 *
 * The current route decides which module the user is in. Each module brings
 * its own greeting, suggestion chips and FAQ answers; general questions
 * (leave balance, holidays, …) still work everywhere via intents.js.
 *
 * `id` matches the guided-tour ids in components/Tour/tours.js so the
 * assistant can offer the right module tour. Prefixes mirror the tours' `match`.
 * FAQ answers are drawn from those tours so they describe how the app really works.
 */
import { normalize } from "./intents";

const faq = (keywords, text, links = []) => ({ keywords, text, links });

export const MODULES = [
  {
    id: "welcome",
    name: "Dashboard",
    prefixes: ["/dashboard"],
    intro: "Ask me about your leave, hours, holidays or celebrations, or anything else around the intranet.",
    suggestions: ["What's my leave balance?", "Who's on leave today?", "Upcoming holidays", "Upcoming birthdays"],
    faqs: [],
  },
  {
    id: "leave",
    name: "Leave Management",
    prefixes: ["/leave-management", "/leave-details", "/employee-leave-balance", "/leave-policy", "/edit-holidays", "/approval-rules", "/behalf-leave"],
    intro: "You're in Leave Management. I can check your balance, explain how applying works, or tell you who's away.",
    suggestions: ["What's my leave balance?", "How do I apply for leave?", "Can I take a half day?", "How do I cancel a request?"],
    faqs: [
      faq(["half day", "half-day", "halfday"], "Yes, half-days are supported. When applying, pick the leave type and dates and choose a half-day session."),
      faq(["cancel", "withdraw"], "Open your request under Requests & status and cancel it if your plans change. You'll see its status change to Cancelled."),
      faq(["weekend", "holiday deduct", "deducted", "counted"], "Weekends and company holidays inside your leave dates aren't deducted from your balance."),
      faq(["status", "approved", "pending", "rejected", "who approves", "approval"], "Leave requests go to your reporting manager. Each request shows as Pending, Approved, Rejected or Cancelled, and updates as soon as your manager acts."),
      faq(["comp off", "compensatory", "comp-off"], "Comp-Off is tracked alongside Earned and Sick leave in your balances, showing total, used and remaining."),
    ],
  },
  {
    id: "timesheets",
    name: "Timesheets",
    prefixes: ["/timesheets"],
    intro: "You're in Timesheets. I can tell you your hours this month or explain how weekly entry and submission work.",
    suggestions: ["How many hours this month?", "How do I fill my timesheet?", "What happens when I submit?", "Why was my timesheet rejected?"],
    faqs: [
      faq(["fill", "enter", "how do i log", "add hours", "how to log"], "Pick a project and task, then enter your hours per day for the week. Logging a little every day and submitting at week's end works best."),
      faq(["submit", "lock"], "Submitting locks the week and sends it to your manager for approval."),
      faq(["reject", "rejected", "fix"], "Rejected entries come back with a reason from your manager. Correct them and submit the week again."),
      faq(["history", "past week", "previous"], "Status & history shows your submitted, approved and rejected weeks.", [{ label: "Open Timesheet History", to: "/timesheets/history" }]),
    ],
  },
  {
    id: "projects",
    name: "Projects",
    prefixes: ["/projects", "/my-work"],
    intro: "You're in Projects. Ask me about boards, backlogs, sprints, testing or your work queue.",
    suggestions: ["How many projects am I on?", "Where are my tasks?", "How do sprints work?", "Where do I log a risk?"],
    faqs: [
      faq(["backlog", "story", "stories", "epic"], "Each project's Backlog holds its epics, stories and tasks. Create and prioritise them there, and plan sprints."),
      faq(["sprint"], "Plan sprints from the project's Backlog, then track the work on its Board."),
      faq(["board", "kanban", "move", "drag"], "On the project Board, drag work across the columns as it moves from To Do to Done."),
      faq(["test", "defect", "bug"], "The Testing tab has test cycles, runs and an issue tracker for defects."),
      faq(["risk", "issue", "status report", "mitigation"], "Use the Risks & status reports tab to log risks and issues with mitigations and to share status reports."),
      faq(["summary", "progress", "workload"], "The project Summary shows status, priority, workload and epic progress at a glance."),
    ],
  },
  {
    id: "employee-onboarding",
    name: "Employee Onboarding",
    prefixes: ["/employee-onboarding"],
    intro: "You're in Employee Onboarding. I can point you to the directory, the onboarding workflow or documents.",
    suggestions: ["Find a colleague", "Where are my documents?", "How does onboarding work?"],
    faqs: [
      faq(["directory", "find", "colleague", "contact", "phone", "email of"], "The Employee Directory lets you find anyone at Paves, with their contact details, team and role.", [{ label: "Open Employee Directory", to: "/employee-onboarding/employee-directory" }]),
      faq(["document", "file", "e-form", "form"], "The Document Center has employee files and e-form templates.", [{ label: "Open Documents", to: "/employee-onboarding/employeedocuments" }]),
      faq(["onboarding work", "offer", "workflow", "new hire", "process"], "Onboarding Management covers offers, task configuration, data import and the onboarding workflow, from offer letter to a fully set-up employee."),
    ],
  },
  {
    id: "user-management",
    name: "User Management",
    prefixes: ["/user-management"],
    intro: "You're in User Management. Ask me how roles, permissions and access work.",
    suggestions: ["How do roles work?", "How do I change someone's access?", "What is an access point?"],
    faqs: [
      faq(["access point"], "Access points are the parts of the app that permissions control.", [{ label: "Open Access Points", to: "/user-management/access-points" }]),
      faq(["role", "permission"], "Roles bundle permissions, users get roles, and every menu and page checks them.", [{ label: "Open Role Manage", to: "/user-management/roles" }]),
      faq(["access", "change", "give", "grant", "user"], "Open a user under User Manage and change their roles. That single change decides which modules and pages they see.", [{ label: "Open User Manage", to: "/user-management/users" }]),
      faq(["group"], "Groups let you manage several users together.", [{ label: "Open Group Manage", to: "/user-management/groups" }]),
    ],
  },
  {
    id: "resource-management",
    name: "Resource Management",
    prefixes: ["/resource-management"],
    intro: "You're in Resource Management. Ask me about staffing, demand, roll-offs, bench or utilisation.",
    suggestions: ["Who is on the bench?", "Where is demand management?", "How do roll-offs work?", "Show utilisation"],
    faqs: [
      faq(["bench"], "Bench Management shows people who are available for new work.", [{ label: "Open Bench Management", to: "/resource-management/bench" }]),
      faq(["demand"], "Demand Management tracks open staffing requests from projects.", [{ label: "Open Demand Management", to: "/resource-management/demand" }]),
      faq(["roll off", "roll-off", "roleoff", "rolling off"], "Roll-Off Management tracks people rolling off their projects.", [{ label: "Open Roll-Off Management", to: "/resource-management/roleoff" }]),
      faq(["utilisation", "utilization", "performance"], "Utilization & Performance shows how well the team is utilised.", [{ label: "Open Utilization", to: "/resource-management/bench/utilization-performance" }]),
      faq(["availability", "available"], "Workforce Availability shows who is free and when.", [{ label: "Open Workforce Availability", to: "/resource-management/workforce-availability" }]),
      faq(["client"], "Client Management holds the clients that projects are staffed for.", [{ label: "Open Client Management", to: "/resource-management" }]),
    ],
  },
  {
    id: "ai-screening",
    name: "AI Screening",
    prefixes: ["/ai-screening"],
    intro: "You're in AI Screening. Ask me about job descriptions, campaigns, resume intake or the pipeline.",
    suggestions: ["How is a resume scored?", "Where do I add a JD?", "Where is the pipeline?"],
    faqs: [
      faq(["score", "scored", "rank"], "Resumes are scored against the job description and the skill ontology, then move through a shared pipeline to interview and decision."),
      faq(["jd", "job description"], "Create and manage job descriptions in JD Management.", [{ label: "Open JD Management", to: "/ai-screening/jds" }]),
      faq(["campaign"], "Campaigns group hiring for a role.", [{ label: "Open Campaigns", to: "/ai-screening/campaigns" }]),
      faq(["resume", "upload", "intake"], "Add resumes through Resume Intake.", [{ label: "Open Resume Intake", to: "/ai-screening/resume-intake" }]),
      faq(["pipeline", "candidate"], "The Pipeline shows every candidate's stage.", [{ label: "Open Pipeline", to: "/ai-screening/pipeline" }]),
      faq(["interview", "calendar"], "Scheduled interviews are on the Interview Calendar.", [{ label: "Open Interview Calendar", to: "/ai-screening/interview-calendar" }]),
    ],
  },
  {
    id: "expense-management",
    name: "Expense Management",
    prefixes: ["/expense-management"],
    // When CHATBOT_AI_URL is set, questions here go to the AI first: it can read the user's own
    // claims, advances and approvals live (XMS /xms/chat). The FAQs below become the offline fallback.
    aiFirst: true,
    intro: "You're in Expense Management. Ask me how to claim an expense, request a cash advance or track a claim.",
    suggestions: ["How do I claim an expense?", "How do I request a cash advance?", "Where are my claims?", "What happens after I submit?"],
    faqs: [
      faq(["claim", "submit expense", "new expense", "create expense", "reimburse"], "Create a claim, add your line items and receipts, and submit. Every claim is checked against company policy, approved, verified by Finance and then reimbursed.", [{ label: "Create an expense", to: "/expense-management/expenses/create" }]),
      faq(["advance", "cash advance"], "Request a cash advance, then settle it later against your expenses.", [{ label: "Request an advance", to: "/expense-management/cash-advance/request" }, { label: "My advances", to: "/expense-management/cash-advance/my" }]),
      faq(["my claims", "my expenses", "track", "status"], "Your claims and their status are under My Expenses.", [{ label: "Open My Expenses", to: "/expense-management/expenses/my" }]),
      faq(["after", "approval", "approve", "process", "flow"], "After you submit: policy check, then manager approval, then Finance verification, then reimbursement. The bell shows each update as it happens."),
      faq(["policy", "limit"], "Each claim is checked against company expense policy when you submit it."),
    ],
  },
  {
    id: "accounts-payable",
    name: "Accounts Payable",
    prefixes: ["/accounts-payable"],
    intro: "You're in Accounts Payable. Ask me about vendor invoices, approvals, TDS, GST or vendors.",
    suggestions: ["How do I upload an invoice?", "Where are vendors?", "How does the AP flow work?"],
    faqs: [
      faq(["upload", "invoice"], "Upload vendor invoices from the invoices section; bulk upload and OCR review are also available.", [{ label: "Upload an invoice", to: "/accounts-payable/invoices/upload" }]),
      faq(["vendor"], "Vendors are listed under Vendors, where you can also onboard new ones.", [{ label: "Open Vendors", to: "/accounts-payable/vendors" }]),
      faq(["flow", "how does", "process", "tds", "gst"], "AP covers every vendor invoice from arrival to payment and accounting, with TDS and GST handled along the way. Open How It Works in the AP menu for the steps for your role."),
    ],
  },
  {
    id: "account-receivable",
    name: "Account Receivable",
    prefixes: ["/account-receivable"],
    intro: "You're in Account Receivable. Ask me about billing set-up, invoicing or collections.",
    suggestions: ["How does maker-checker work?", "Where are receivables?", "How do I send a reminder?"],
    faqs: [
      faq(["maker", "checker", "approve"], "Every billing set-up and invoice uses maker-checker: one person prepares it and another approves it."),
      faq(["receivable", "outstanding", "payment"], "Receivables has outstanding amounts, payments, ledgers, notes and reminders.", [{ label: "Open Receivables", to: "/account-receivable/receivables" }]),
      faq(["reminder", "collection"], "Send payment reminders from Reminders & Collections.", [{ label: "Open Collections", to: "/account-receivable/collections" }]),
      faq(["invoice"], "Create invoices from approved billing data in Invoice Generation; checkers approve them in Invoice Approval.", [{ label: "Open Invoice Generation", to: "/account-receivable/invoice-generation" }]),
      faq(["tax", "gst"], "Apply the right GST to each invoice in Tax Calculation.", [{ label: "Open Tax Calculation", to: "/account-receivable/tax-calculation" }]),
    ],
  },
  {
    id: "finance",
    name: "Finance Management",
    prefixes: ["/finance"],
    intro: "You're in Finance Management. Ask me how the finance modules fit together.",
    suggestions: ["What's in Finance Management?", "How do I switch back to the intranet?"],
    faqs: [
      faq(["switch", "back", "intranet"], "Use the application switcher in the header to go back to Paves Intranet. The sidebar changes with it."),
      faq(["what", "modules", "finance"], "Finance Management is a separate workspace for money flowing in and out of Paves. The sidebar shows only the finance modules your role works in."),
    ],
  },
];

export function getModule(pathname = "") {
  return MODULES.find((m) => m.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) || null;
}

/** First FAQ in the module whose keyword appears in the question. */
export function matchModuleFaq(module, text) {
  if (!module) return null;
  const t = normalize(text);
  return module.faqs.find((f) => f.keywords.some((k) => t.includes(normalize(k)))) || null;
}
