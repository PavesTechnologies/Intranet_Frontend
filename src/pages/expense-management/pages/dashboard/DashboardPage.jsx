import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PageHeader from "@/components/ui/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardService } from "@/pages/expense-management/api/expenseReportsApi";
import EmployeeMoneyFlow from "@/pages/expense-management/components/dashboard/EmployeeMoneyFlow";
import RoleDashboard from "@/pages/expense-management/components/dashboard/RoleDashboard";

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
    // The employee's two ledgers. Each row is one line of the ledger; "kind" sets how it reads:
    // memo = for information, total = a running total, minus = taken away, result = the closing line, sub = part of the line above.
    ledgers: {
      advance: {
        title: "Cash advance ledger",
        caption: "Where every rupee you received has gone",
        rows: [
          { key: "caRequested", label: "Requested", kind: "memo", note: "What you asked for" },
          { key: "caApproved", label: "Approved", kind: "memo", note: "What your manager and Finance approved" },
          { key: "caDisbursed", label: "Received", kind: "total", note: "Paid out to you" },
          { key: "caSettled", label: "Settled", kind: "minus", note: "Verified expenses and refunds against your advances" },
          { key: "caOutstanding", label: "Outstanding", kind: "result", note: "Still to account for" },
        ],
        check: { label: "Received = Settled + Outstanding", total: "caDisbursed", parts: ["caSettled", "caOutstanding"] },
      },
      reimbursement: {
        title: "Reimbursement ledger",
        caption: "From what you claimed to what AP pays you",
        rows: [
          { key: "erClaimed", label: "Claimed", kind: "total", note: "Everything you submitted" },
          { key: "erNotApproved", label: "Not approved yet", kind: "minus", note: "Pending, returned or rejected" },
          { key: "erApproved", label: "Approved", kind: "total", note: "Approved for reimbursement" },
          { key: "erAdvanceOffset", label: "Covered by advance", kind: "minus", note: "Verified expenses settled against your advance" },
          { key: "erPayable", label: "Payable to you", kind: "result", note: "What AP still has to pay you, or has paid" },
          { key: "erToSendAp", label: "Not yet with AP", kind: "sub", note: "Approved, waiting to be sent to AP" },
          { key: "erPendingAp", label: "Waiting for AP", kind: "sub", note: "Sent to AP, not paid yet" },
          { key: "erPaid", label: "Paid to you", kind: "sub", note: "Already paid" },
        ],
        check: { label: "Payable = Not yet with AP + Waiting for AP + Paid", total: "erPayable", parts: ["erToSendAp", "erPendingAp", "erPaid"] },
      },
    },
    // Quick actions on the employee dashboard. Each one reuses an existing route; `roles` mirrors that route's guard in App.jsx.
    quickActions: [
      { key: "submit", label: "Submit expense", hint: "Create an expense report", icon: "ReceiptText", to: "/expense-management/expenses/create", roles: ["GENERAL", "MANAGER"], primary: true },
      { key: "advance", label: "Request advance", hint: "Request travel or business funds", icon: "Banknote", to: "/expense-management/cash-advance/request", roles: ["GENERAL"] },
      { key: "reports", label: "My expense reports", hint: "Track submitted reports", icon: "FileText", to: "/expense-management/expenses/my", roles: ["GENERAL", "MANAGER"] },
      { key: "advances", label: "My advances", hint: "Balances and settlements", icon: "Wallet", to: "/expense-management/cash-advance/my", roles: ["GENERAL"] },
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
      { key: "team", label: "Team expenses", hint: "Expense reports from your team", icon: "FileText", to: "/expense-management/expenses/all", roles: ["MANAGER"] },
    ],
    actions: [],
  },
  {
    view: "finance",
    label: "Finance",
    roles: ["FINANCE_EXECUTIVE", "FINANCE"],
    subtitle: "What is waiting to be verified, and what has been verified.",
    steps: [
      { key: "toVerify", label: "To verify", help: "Reports waiting for Finance verification.", tone: "amber" },
      { key: "queueValue", label: "Value to verify", help: "Total claimed in the verification queue.", tone: "blue" },
      { key: "queries", label: "Open queries", help: "Reports sent back to employees for answers.", tone: "rose" },
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
      { key: "toPay", label: "Waiting to pay", help: "Reports approved and waiting for payment.", tone: "indigo" },
      { key: "toPayValue", label: "Amount to pay", help: "Still unpaid. Paid amounts are not counted.", tone: "blue" },
      { key: "paidMonth", label: "Paid this month", help: "Payments confirmed this month.", tone: "emerald" },
      { key: "failed", label: "Failed payments", help: "Payments that need follow-up.", tone: "rose" },
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
      { key: "spendMonth", label: "Spend this month", help: "Expenses submitted this month.", tone: "indigo" },
      { key: "submitted", label: "Reports submitted", help: "Reports submitted this month.", tone: "blue" },
      { key: "claimants", label: "Active claimants", help: "Employees who claimed this month.", tone: "gray" },
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

const useDashboard = (view) =>
  useQuery({
    queryKey: ["xmsDashboard", view],
    queryFn: () => dashboardService.get(view).then((res) => res.data?.data),
    enabled: !!view,
    staleTime: 60_000,
  });

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const available = useMemo(() => VIEWS.filter((v) => hasRole(v.roles)), [hasRole]);
  const defaultView = useMemo(() => {
    const priority = ["ap", "finance", "manager", "admin", "employee"];
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

  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard(active.view);
  const currency = data?.baseCurrencyCode || "INR";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "Dashboard" }]} />

      <PageHeader
        title="Dashboard"
        subtitle={active.subtitle}
        actions={
          <>
            <Button variant="outline" size="small" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={14} className={`mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {active.actions.map((a) => (
              <Button key={a.label} variant={a.variant} size="small" onClick={() => navigate(a.to)}>
                {a.icon && <a.icon size={14} className="mr-1" />} {a.label}
              </Button>
            ))}
          </>
        }
      />

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

      {isLoading ? (
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
        <DashboardBody data={data} config={active} currency={currency} />
      ) : null}
    </div>
  );
}

function DashboardBody({ data, config, currency }) {
  if (config.ledgers) {
    return <EmployeeMoneyFlow data={data} config={config} currency={currency} />;
  }
  return <RoleDashboard data={data} config={config} currency={currency} />;
}
