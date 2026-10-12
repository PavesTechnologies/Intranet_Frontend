import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Download, FileStack, Hourglass, Landmark, ListChecks, Users, Wallet } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import StatCard from "@/components/Cards/StatCard";
import GenericTable from "@/components/Table/table";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination/pagination";
import { useClientPagination } from "@/pages/expense-management/components/common/pagination";
import { formatMoney, formatDate } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { useTeamExpenseSummary } from "@/pages/expense-management/api/useTeamExpenses";

const breadcrumbs = [
  { label: "Expense Management", to: "/expense-management/dashboard" },
  { label: "Expenses", to: "/expense-management/expenses/my" },
  { label: "Expense Reports" },
];

const headers = ["Employee", "Reports", "In Progress", "Approved", "Reimbursed", "Claimed", "Rejected", "Last Submitted", "Actions"];
const columns = ["employee", "reports", "inProgress", "approved", "reimbursed", "claimed", "rejected", "lastSubmitted", "actions"];

const isInactive = (status) => Boolean(status) && status.toLowerCase() !== "active";

const csvCell = (value) => {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Neutralise spreadsheet formula injection in free-text fields.
  if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const amountOrZero = (v) => (Number(v) || 0).toFixed(2);

function downloadMembersCsv(members, currencyCode) {
  const cur = currencyCode ? ` (${currencyCode})` : "";
  const header = [
    "Employee ID",
    "Name",
    "Email",
    "Employment Status",
    "Reports",
    "In Progress Count",
    `In Progress Amount${cur}`,
    `Approved Amount${cur}`,
    `Reimbursed Amount${cur}`,
    `Claimed Amount${cur}`,
    "Rejected Count",
    "Last Submitted",
  ];
  const lines = members.map((m) => [
    m.employeeId,
    m.name,
    m.email,
    m.employmentStatus,
    m.reportCount ?? 0,
    m.inProgressCount ?? 0,
    amountOrZero(m.inProgressAmount),
    amountOrZero(m.approvedAmount),
    amountOrZero(m.reimbursedAmount),
    amountOrZero(m.claimedAmount),
    m.rejectedCount ?? 0,
    m.lastSubmittedAt ? formatDate(m.lastSubmittedAt) : "",
  ]);
  const csv = [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new window.Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `team-expense-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function ExpenseReportsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: summary, isLoading, isError, error, refetch } = useTeamExpenseSummary();
  const currency = summary?.baseCurrencyCode;
  const members = useMemo(() => summary?.members || [], [summary]);

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.name, m.email, m.employeeId].some((v) => (v || "").toString().toLowerCase().includes(q))
    );
  }, [members, searchTerm]);

  const { pageItems, paginationProps } = useClientPagination(filteredMembers);

  const handleSearch = useCallback((value) => setSearchTerm(value || ""), []);

  const viewReports = (employeeId) =>
    navigate(`/expense-management/expenses/all?employeeId=${encodeURIComponent(employeeId)}`);

  const money = (v) => formatMoney(v ?? 0, currency);

  const kpis = [
    { title: "Team Members", value: summary?.memberCount ?? 0, icon: Users },
    { title: "Reports", value: summary?.reportCount ?? 0, icon: FileStack, subtitle: "Submitted, excluding drafts" },
    { title: "Claimed", value: money(summary?.claimedAmount), icon: Wallet, subtitle: "Excludes rejected & cancelled" },
    { title: "In Progress", value: money(summary?.inProgressAmount), icon: Hourglass, textColor: "text-amber-600", subtitle: "With approvers, Finance or employee" },
    { title: "Approved", value: money(summary?.approvedAmount), icon: CheckCircle2, textColor: "text-indigo-600", subtitle: "Awaiting payment" },
    { title: "Reimbursed", value: money(summary?.reimbursedAmount), icon: Landmark, textColor: "text-emerald-600", subtitle: "Paid out" },
  ];

  const tableRows = pageItems.map((m) => ({
    employee: (
      <div className="flex flex-col items-start text-left min-w-[10rem]">
        <span className="inline-flex items-center gap-1.5">
          <span className="font-medium text-xs text-gray-900">{m.name || m.employeeId}</span>
          {isInactive(m.employmentStatus) && (
            <span className="rounded bg-gray-100 border border-gray-200 px-1 text-[10px] font-semibold text-gray-500">
              {m.employmentStatus}
            </span>
          )}
        </span>
        <span className="text-[10px] text-gray-400">{[m.email, m.employeeId].filter(Boolean).join(" · ")}</span>
      </div>
    ),
    reports: <span className="text-xs font-semibold">{m.reportCount ?? 0}</span>,
    inProgress: (
      <div className="flex flex-col items-center">
        <span className="text-xs font-semibold">{m.inProgressCount ?? 0}</span>
        <span className="font-mono text-[10px] text-amber-600 whitespace-nowrap">{money(m.inProgressAmount)}</span>
      </div>
    ),
    approved: <span className="font-mono text-xs text-indigo-700 whitespace-nowrap">{money(m.approvedAmount)}</span>,
    reimbursed: <span className="font-mono text-xs text-emerald-700 whitespace-nowrap">{money(m.reimbursedAmount)}</span>,
    claimed: <span className="font-mono font-semibold text-xs text-gray-900 whitespace-nowrap">{money(m.claimedAmount)}</span>,
    rejected: (
      <span className={`text-xs font-semibold ${m.rejectedCount > 0 ? "text-rose-600" : "text-gray-400"}`}>{m.rejectedCount ?? 0}</span>
    ),
    lastSubmitted: <span className="text-xs whitespace-nowrap">{formatDate(m.lastSubmittedAt)}</span>,
    actions: (
      <Button
        type="button"
        variant="outline"
        size="small"
        className="!py-1 !px-2 !text-[11px] whitespace-nowrap"
        onClick={(e) => {
          e.stopPropagation();
          viewReports(m.employeeId);
        }}
      >
        <ListChecks size={12} />
        View reports
      </Button>
    ),
    onRowClick: () => viewReports(m.employeeId),
  }));

  const errorMessage = error?.response?.data?.message || "Something went wrong while fetching data. Please try again.";

  return (
    <div className="space-y-3">
      <Breadcrumb items={breadcrumbs} />

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[#0a174e]">Expense Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">Consolidated expense reports for your team.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="small"
          className="w-full whitespace-nowrap sm:w-auto !py-1.5 !text-xs"
          onClick={() => downloadMembersCsv(filteredMembers, currency)}
          disabled={isLoading || isError || filteredMembers.length === 0}
        >
          <Download size={14} />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm py-16">
          <LoadingSpinner text="Loading Team Summary..." />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">Failed to load Team Summary</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">{errorMessage}</p>
              <Button variant="outline" size="small" className="mt-4" onClick={() => refetch()}>
                Retry
              </Button>
            </PageCardContent>
          </PageCard>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {kpis.map((k) => (
              <StatCard key={k.title} {...k} />
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            {members.length === 0 ? (
              <PageCard>
                <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
                  <Users className="h-10 w-10 text-gray-300 mb-3" />
                  <h2 className="text-sm font-semibold text-gray-700">No Team Members</h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">You have no direct reports in the employee directory.</p>
                </PageCardContent>
              </PageCard>
            ) : (
              <>
                <div className="mb-3 max-w-md">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                  <SearchInput
                    value={searchTerm}
                    onSearch={handleSearch}
                    placeholder="Search by name, email or employee ID..."
                    className="!py-1.5 !px-3 !text-xs"
                  />
                </div>
                {filteredMembers.length === 0 ? (
                  <PageCard>
                    <PageCardContent className="flex flex-col items-center justify-center text-center py-12">
                      <Users className="h-10 w-10 text-gray-300 mb-3" />
                      <h2 className="text-sm font-semibold text-gray-700">No Matching Team Members</h2>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm">No team members match "{searchTerm}".</p>
                    </PageCardContent>
                  </PageCard>
                ) : (
                  <>
                    <div className="w-full overflow-x-auto rounded-lg [&_tbody_tr]:cursor-pointer [&_td]:!py-1.5 [&_td]:!px-2.5 [&_td]:!text-xs [&_th]:!py-1.5 [&_th]:!px-2.5 [&_th]:!text-xs [&_table]:!text-xs">
                      <GenericTable headers={headers} rows={tableRows} columns={columns} />
                    </div>
                    <div className="mt-4 flex justify-center">
                      <Pagination {...paginationProps} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
