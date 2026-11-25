import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsFetching, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardService } from "@/pages/expense-management/api/expenseReportsApi";
import { useApprovalWebSocket } from "@/pages/expense-management/approval-engine/websocket/ApprovalWebSocketProvider";
import SupplementaryWaitingCard from "@/pages/expense-management/pages/dashboard/SupplementaryWaitingCard";
import EmployeeMoneyFlow from "@/pages/expense-management/components/dashboard/EmployeeMoneyFlow";
import RoleDashboard from "@/pages/expense-management/components/dashboard/RoleDashboard";
import ApprovalsPanel from "@/pages/expense-management/components/dashboard/ApprovalsPanel";
import FinanceDashboard from "@/pages/expense-management/components/dashboard/FinanceDashboard";
import ApDashboard from "@/pages/expense-management/components/dashboard/ApDashboard";
import AdminDashboard from "@/pages/expense-management/components/dashboard/AdminDashboard";
import TeamDashboard from "@/pages/expense-management/components/dashboard/TeamDashboard";
import SegmentedControl from "@/components/ui/SegmentedControl";

// Managers can switch "My money" between their own figures and their whole team's.
const SCOPES = [
  { key: "mine", label: "My dashboard" },
  { key: "team", label: "My team" },
];
const scopeStorageKey = (user) =>
  `xms.dashboard.scope.${user?.employeeId || user?.email || user?.id || "anonymous"}`;

// Each role sees one simple money flow: four steps, left to right, showing where the money is now.
// Each step names the figure, says what it means in one line, and points to the records behind it.
const VIEWS = [
  {
    view: "employee",
    label: "My money",
    roles: ["GENERAL", "MANAGER", "REPORTING_MANAGER", "FINANCE", "FINANCE_EXECUTIVE", "AP_EXECUTIVE", "ADMIN", "SUPER_ADMIN"],
    subtitle: "What you have claimed, what is still owed, and what has been paid to you.",
    steps: [
      { key: "advanceBalance", label: "Advance still owed", help: "Advance you still have to account for.", tone: "amber" },
      { key: "claimed", label: "Total claimed", help: "All expense reports you have submitted.", tone: "indigo" },
      { key: "payment", label: "Waiting for payment", help: "Approved. AP is paying this to you.", tone: "blue" },
      { key: "paid", label: "Paid to you", help: "Reimbursement already received.", tone: "emerald" },
    ],
    // The employee's ledgers: one per money flow (direct expenses, cash advance), then the total of both.
    // The lines themselves are laid out in EmployeeLedgers; each ledger's checks say which figures must add up.
    ledgers: {
      direct: {
        title: "Direct expense ledger",
        caption: "Bills you paid yourself, paid back to your bank",
        checks: [{ label: "To your bank = Not yet with AP + Waiting for AP + Paid", total: "drPayable", parts: ["drToSendAp", "drPendingAp", "drPaid"] }],
      },
      advance: {
        title: "Cash advance ledger",
        caption: "The advance you received, and the bills settled against it",
        checks: [
          {
            label: "Approved = Requested − Awaiting approval + Carried in − Reduced + Increased",
            total: "caApproved",
            parts: ["caRequested", "caCarriedIn", "caIncreasedOnApproval"],
            minus: ["caAwaitingApproval", "caReducedOnApproval"],
          },
          {
            label: "Received = Used on bills + Returned + Carried forward + Still to settle",
            total: "caDisbursed",
            parts: ["caUsedOnBills", "caReturned", "caCarriedForward", "caOutstanding"],
          },
        ],
      },
      total: {
        title: "Total",
        caption: "Direct expenses and cash advance together",
        checks: [
          { label: "Total approved = Direct + Against advance", total: "erApproved", parts: ["drApproved", "avApproved"] },
          { label: "Paid to your bank = Direct + Extra above advance", total: "erPaid", parts: ["drPaid", "avPaid"] },
        ],
      },
    },
    // Quick actions on the employee dashboard. Each one reuses an existing route; `roles` mirrors that route's guard in App.jsx.
    quickActions: [
      { key: "submit", label: "Submit expense", hint: "Create an expense report", icon: "ReceiptText", to: "/expense-management/expenses/create", roles: ["GENERAL", "MANAGER"], primary: true },
      { key: "advance", label: "Request advance", hint: "Request travel or business funds", icon: "Banknote", to: "/expense-management/cash-advance/request", roles: ["GENERAL"] },
      { key: "reports", label: "My expense reports", hint: "Track submitted reports", icon: "FileText", to: "/expense-management/expenses/my", roles: ["GENERAL", "MANAGER"] },
      { key: "supplementary", label: "Supplementary claims", hint: "Claim expenses missed on a settled report", icon: "FileText", to: "/expense-management/expenses/supplementary", roles: ["GENERAL", "MANAGER"] },
      { key: "advances", label: "My advances", hint: "Balances and settlements", icon: "Wallet", to: "/expense-management/cash-advance/my", roles: ["GENERAL"] },
      // Approvers only: the same route and roles as the manager panel's "Open approvals".
      { key: "approvals", label: "Approvals", hint: "Requests and reports waiting for your decision", icon: "ClipboardCheck", to: "/expense-management/approvals", roles: ["MANAGER", "REPORTING_MANAGER"] },
    ],
    attentionTitle: "Needs your action",
    attentionEmpty: "Nothing needs you right now.",
    activityTitle: "Recent activity",
    link: (it) => `/expense-management/expenses/reports/${it.reportId}`,
    showEmployee: false,
    actions: [],
  },
  {
    view: "manager",
    label: "Approvals",
    roles: ["MANAGER", "REPORTING_MANAGER"],
    // Not a tab: shown as a collapsible panel inside "My money", so a manager's own money stays the main dashboard.
    embedded: true,
    subtitle: "What your team has sent you, and what you have decided.",
    steps: [
      { key: "pending", label: "Waiting for you", help: "Requests and reports for your decision.", tone: "amber" },
      { key: "pendingValue", label: "Value waiting", help: "Total amount waiting for your decision.", tone: "blue" },
      { key: "approved30", label: "Approved, 30 days", help: "Items you approved in the last 30 days.", tone: "emerald" },
      { key: "sentBack30", label: "Sent back, 30 days", help: "Items you returned for correction.", tone: "rose" },
    ],
    attentionTitle: "Waiting for your decision",
    attentionEmpty: "No approvals waiting.",
    activityTitle: "Your recent decisions",
    link: () => "/expense-management/approvals",
    showEmployee: true,
    attentionSubtitle: "Requests and reports waiting for your decision",
    activitySubtitle: "What you approved or sent back recently",
    quickActions: [
      { key: "approvals", label: "Open approvals", hint: "Requests and reports waiting for you", icon: "ClipboardCheck", to: "/expense-management/approvals", roles: ["MANAGER", "REPORTING_MANAGER"], primary: true },
      { key: "ca-approvals", label: "Cash advance approvals", hint: "Advance requests for your decision", icon: "Banknote", to: "/expense-management/cash-advance/approvals", roles: ["MANAGER"] },
      { key: "team", label: "Team expenses", hint: "Expense reports from your team", icon: "FileText", to: "/expense-management/expenses/all", roles: ["MANAGER", "REPORTING_MANAGER"] },
    ],
    actions: [],
  },
  {
    view: "finance",
    label: "Finance",
    roles: ["FINANCE_EXECUTIVE", "FINANCE"],
    subtitle: "Your verification queue, your approvals, and how reports are moving to payment.",
    // Rendered by FinanceDashboard; the approvals routed to a Finance user are embedded there as a tab.
    steps: [
      // "To verify" and its value are the banner's headline, so they are not repeated as figures here.
      { key: "queries", label: "Open queries", help: "Reports sent back to employees for answers.", tone: "rose" },
      { key: "exceptions", label: "Policy exceptions", help: "Policy issues on reports in the queue.", tone: "orange" },
      { key: "verified", label: "Verified this month", help: "Reports Finance has verified this month.", tone: "emerald" },
    ],
    attentionTitle: "Longest in the queue",
    attentionEmpty: "The queue is empty.",
    activityTitle: "Latest verifications",
    link: () => "/expense-management/finance",
    showEmployee: true,
    attentionSubtitle: "Oldest reports first, so the longest waits are seen first",
    activitySubtitle: "Reports you verified most recently",
    quickActions: [
      { key: "finance", label: "Finance verification", hint: "Reports waiting to be verified", icon: "ClipboardCheck", to: "/expense-management/finance", roles: ["FINANCE_EXECUTIVE"], primary: true },
      { key: "settlement", label: "Cash advance settlement", hint: "Settle advances and review balances", icon: "Banknote", to: "/expense-management/cash-advance/settlement", roles: ["FINANCE", "FINANCE_EXECUTIVE"] },
      { key: "reports", label: "Expense reports", hint: "All reports, with their status", icon: "FileText", to: "/expense-management/reports", roles: ["FINANCE", "FINANCE_EXECUTIVE"] },
    ],
    actions: [],
  },
  {
    view: "ap",
    label: "AP Payments",
    roles: ["AP_EXECUTIVE"],
    subtitle: "What is still to be paid to employees, and what has been paid.",
    steps: [
      // What is waiting to be paid (count and amount) is the banner's headline, so it is not repeated as a figure.
      { key: "paidMonth", label: "Paid this month", help: "Payments confirmed this month.", tone: "emerald" },
      { key: "avgDays", label: "Avg time to pay", help: "From approval to payment, last 90 days.", tone: "violet" },
      { key: "failed", label: "Failed payments", help: "Payment handoffs that need follow-up.", tone: "rose" },
    ],
    attentionTitle: "Waiting longest for payment",
    attentionEmpty: "Nothing waiting to be paid.",
    activityTitle: "Recent payments",
    link: () => "/expense-management/ap-payments/queue",
    showEmployee: true,
    attentionSubtitle: "Approved reports, oldest first",
    activitySubtitle: "Payments confirmed recently",
    quickActions: [
      { key: "queue", label: "Payment queue", hint: "Reports approved and waiting for payment", icon: "Wallet", to: "/expense-management/ap-payments/queue", roles: ["AP_EXECUTIVE"], primary: true },
      { key: "supplementaryPayments", label: "Supplementary payments", hint: "Record payments for approved supplementary claims", icon: "Wallet", to: "/expense-management/ap/supplementary-payments", roles: ["AP_EXECUTIVE"] },
      { key: "notifications", label: "Notifications", hint: "Updates on payments and returns", icon: "Bell", to: "/expense-management/activity/notifications", roles: ["AP_EXECUTIVE"] },
    ],
    actions: [],
  },
  {
    view: "admin",
    label: "Organization",
    roles: ["ADMIN", "SUPER_ADMIN"],
    subtitle: "Spend and activity across the organization.",
    steps: [
      // Spend, reports submitted and claimants this month are the banner's headline.
      { key: "cycle", label: "Avg approval time", help: "From submission to approval, last 90 days.", tone: "indigo" },
      { key: "violations", label: "Open policy issues", help: "Policy issues on open reports.", tone: "amber" },
    ],
    activityTitle: "Latest submissions",
    link: (it) => `/expense-management/expenses/reports/${it.reportId}`,
    showEmployee: true,
    activitySubtitle: "Reports submitted most recently across the organization",
    showBudgets: true,
    showBreakdown: true,
    quickActions: [
      { key: "reports", label: "Expense reports", hint: "All reports across the organization", icon: "FileText", to: "/expense-management/reports", roles: ["ADMIN", "SUPER_ADMIN"], primary: true },
      { key: "masters", label: "Masters", hint: "Categories, cost centres, tax and currency", icon: "Settings", to: "/expense-management/masters/expense-categories", roles: ["ADMIN", "SUPER_ADMIN"] },
      { key: "policy", label: "Policy rules", hint: "Rules that check each expense", icon: "Shield", to: "/expense-management/policy-engine/rules", roles: ["ADMIN", "SUPER_ADMIN"] },
      { key: "audit", label: "Audit logs", hint: "Who changed what, and when", icon: "Clock3", to: "/expense-management/activity/audit-logs", roles: ["ADMIN", "SUPER_ADMIN"] },
    ],
    actions: [],
  },
];

// The role-specific view remembered per user, so a shared browser does not reopen another person's tab.
const viewStorageKey = (user) =>
  `xms.dashboard.view.${user?.employeeId || user?.email || user?.id || "anonymous"}`;

const useDashboard = (view, enabled = true) =>
  useQuery({
    queryKey: ["xmsDashboard", view],
    queryFn: () => dashboardService.get(view).then((res) => res.data?.data),
    enabled: !!view && enabled,
    staleTime: 60_000,
  });

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const available = useMemo(() => VIEWS.filter((v) => !v.embedded && hasRole(v.roles)), [hasRole]);
  const approvalsConfig = VIEWS.find((v) => v.view === "manager");
  const canApprove = hasRole(approvalsConfig.roles);
  const defaultView = useMemo(() => {
    const priority = ["ap", "finance", "admin", "employee"];
    return priority.find((p) => available.some((v) => v.view === p)) || "employee";
  }, [available]);
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(viewStorageKey(user)) || null;
    } catch {
      return null;
    }
  });
  const active = available.find((v) => v.view === view) || available.find((v) => v.view === defaultView) || VIEWS[0];
  useEffect(() => {
    try {
      localStorage.setItem(viewStorageKey(user), active.view);
    } catch {
      /* private mode: the choice is simply not remembered */
    }
  }, [active.view]);

  const [scope, setScope] = useState(() => {
    try {
      return localStorage.getItem(scopeStorageKey(user)) === "team" ? "team" : "mine";
    } catch {
      return "mine";
    }
  });
  const showTeam = canApprove && active.view === "employee" && scope === "team";
  const changeScope = (next) => {
    setScope(next);
    try {
      localStorage.setItem(scopeStorageKey(user), next);
    } catch {
      /* private mode: the choice is simply not remembered */
    }
  };

  const { data, isLoading, isError, error, refetch } = useDashboard(active.view, !showTeam);
  const showApprovals = canApprove && active.view === "employee" && !showTeam;
  const approvals = useDashboard("manager", showApprovals);
  const isFetching = useIsFetching({ queryKey: ["xmsDashboard"] }) > 0;
  const refreshAll = () => queryClient.invalidateQueries({ queryKey: ["xmsDashboard"] });

  // Live: when one of the user's reports changes status (or their approval queue or a notification arrives), reload the
  // figures instead of waiting for the one-minute cache. No connection (tests, signed out) simply means no live reload.
  const ws = useApprovalWebSocket();
  useEffect(() => {
    if (!ws?.subscribe) return undefined;
    const reload = () => queryClient.invalidateQueries({ queryKey: ["xmsDashboard"] });
    const offs = ["report-update", "queue-update", "notification"].map((event) => ws.subscribe(event, reload));
    return () => offs.forEach((off) => off?.());
  }, [ws, queryClient]);
  const currency = data?.baseCurrencyCode || "INR";

  return (
    <div className="space-y-2 p-3 sm:p-4">
      <Breadcrumb items={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "Dashboard" }]} />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-[#0a174e]">Expense Management</h1>
          <p className="truncate text-sm text-slate-500">
            {showTeam ? "What your team has claimed, who spent how much, and where it stands." : active.subtitle}
          </p>
        </div>
        <Button variant="outline" size="small" onClick={refreshAll} disabled={isFetching}>
          <RefreshCw size={14} className={`mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {available.length > 1 && (
        <Tabs value={active.view} onValueChange={setView}>
          <TabsList className="h-auto flex-wrap">
            {available.map((v) => (
              <TabsTrigger key={v.view} value={v.view}>
                {v.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {canApprove && active.view === "employee" && (
        <div data-dashboard-scope>
          <SegmentedControl label="Dashboard scope" options={SCOPES} value={scope} onChange={changeScope} />
        </div>
      )}

      {showTeam ? (
        <TeamDashboard currency={data?.baseCurrencyCode} />
      ) : isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-24">
          <LoadingSpinner text="Loading dashboard..." />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-12 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700">Couldn't load this dashboard.</p>
          <p className="max-w-md text-xs text-rose-500">{error?.response?.data?.message || error?.message}</p>
          <Button size="small" variant="outline" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : data ? (
        <>
          {active.view === "finance" && <SupplementaryWaitingCard />}
          <DashboardBody
            data={data}
            config={active}
            currency={currency}
            approvals={showApprovals ? <ApprovalsPanel config={approvalsConfig} query={approvals} currency={currency} /> : null}
          />
        </>
      ) : null}
    </div>
  );
}

function DashboardBody({ data, config, currency, approvals }) {
  if (config.ledgers) {
    return <EmployeeMoneyFlow data={data} config={config} currency={currency} approvals={approvals} />;
  }
  if (config.view === "finance") {
    return <FinanceDashboard data={data} config={config} currency={currency} />;
  }
  if (config.view === "ap") {
    return <ApDashboard data={data} config={config} currency={currency} />;
  }
  if (config.view === "admin") {
    return <AdminDashboard data={data} config={config} currency={currency} />;
  }
  if (config.view === "ap") {
    return <ApDashboard data={data} config={config} currency={currency} />;
  }
  return <RoleDashboard data={data} config={config} currency={currency} />;
}
