import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileStack, Clock3, CheckCircle2, Wallet, Plus, ArrowRight } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import StatCard from "@/components/Cards/StatCard";
import Button from "@/components/Button/Button";
import StatusBadge from "@/components/status/statusbadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { expenseReportService } from "@/pages/expense-management/api/expenseReportsApi";
import { useMyQueue } from "@/pages/expense-management/approval-engine/hooks/useApprovalWorkflow";

const breadcrumbs = [
  { label: "Expense Management", to: "/expense-management/dashboard" },
  { label: "Dashboard" },
];

const IN_REVIEW_STATUSES = ["PENDING_APPROVAL", "PENDING_FINANCE_VERIFICATION", "AWAITING_CORRECTION", "QUERY_RAISED"];

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const formatAmount = (value, currencyCode) =>
  `${(Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${
    currencyCode ? ` ${currencyCode}` : ""
  }`;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole(["General", "Manager"]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Presence-based, same as My Approvals - a zero count just means no assigned tasks right now.
  const { data: myQueue } = useMyQueue(0, 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const res = await expenseReportService.getAll();
        const payload = res.data?.data;
        const list = Array.isArray(payload) ? payload : payload?.reports || payload?.content || [];
        if (!cancelled) setReports(list);
      } catch (err) {
        console.error("Failed to load dashboard reports:", err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const draftCount = reports.filter((r) => r.reportStatus === "DRAFT").length;
  const inReviewCount = reports.filter((r) => IN_REVIEW_STATUSES.includes(r.reportStatus)).length;
  const approvedCount = reports.filter((r) => ["APPROVED", "REIMBURSED", "CLOSED"].includes(r.reportStatus)).length;
  const reimbursableTotal = reports
    .filter((r) => ["APPROVED", "REIMBURSED", "CLOSED"].includes(r.reportStatus))
    .reduce((sum, r) => sum + (Number(r.reimbursableAmount ?? r.totalAmount) || 0), 0);
  const reimbursableCurrency = reports.find((r) => ["APPROVED", "REIMBURSED", "CLOSED"].includes(r.reportStatus))?.currencyCode;

  const recentReports = [...reports]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  const pendingApprovalTasks = myQueue?.totalElements ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={breadcrumbs} />
        {canManage && (
          <Button variant="primary" size="small" onClick={() => navigate("/expense-management/expenses/create")}>
            <Plus size={14} />
            Create Expense Report
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Loading dashboard..." />
        </div>
      ) : loadError ? (
        <PageCard>
          <PageCardContent className="py-12 text-center text-sm text-gray-500">
            Failed to load your expense activity. Try refreshing the page.
          </PageCardContent>
        </PageCard>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Reports" value={reports.length} icon={FileStack} />
            <StatCard title="Draft" value={draftCount} icon={FileStack} textColor="text-slate-600" />
            <StatCard title="In Review" value={inReviewCount} icon={Clock3} textColor="text-amber-600" />
            <StatCard title="Approved" value={approvedCount} icon={CheckCircle2} textColor="text-emerald-600" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-900">Recent Reports</h2>
                  <button
                    type="button"
                    onClick={() => navigate("/expense-management/expenses/my")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A0082] hover:underline"
                  >
                    View all <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                {recentReports.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">
                    No expense reports yet — create your first one to get started.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {recentReports.map((r) => (
                      <li
                        key={r.reportId}
                        className="flex cursor-pointer items-center justify-between gap-3 py-3 hover:bg-gray-50 -mx-1 px-1 rounded-md"
                        onClick={() => navigate(`/expense-management/expenses/reports/${r.reportId}`)}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-800">{r.title || r.reportNumber}</p>
                          <p className="text-xs text-gray-400">
                            {r.reportNumber} · {formatDate(r.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm font-medium text-gray-700">{formatAmount(r.totalAmount, r.currencyCode)}</span>
                          <StatusBadge label={r.reportStatus || "DRAFT"} size="sm" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <StatCard
                title="Reimbursable (Approved)"
                value={formatAmount(reimbursableTotal, reimbursableCurrency)}
                icon={Wallet}
                textColor="text-emerald-700"
              />
              {pendingApprovalTasks > 0 && (
                <div
                  className="cursor-pointer rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm hover:bg-indigo-100"
                  onClick={() => navigate("/expense-management/approvals")}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Awaiting Your Approval</p>
                  <p className="mt-2 text-2xl font-bold text-indigo-800">{pendingApprovalTasks}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                    Go to My Approvals <ArrowRight className="h-3 w-3" />
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
