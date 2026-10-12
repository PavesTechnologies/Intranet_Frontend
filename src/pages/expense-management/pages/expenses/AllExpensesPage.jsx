import React, { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, AlertTriangle, Eye, Layers, Users, X } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import StatusBadge from "@/components/status/statusbadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormSelect from "@/components/forms/FormSelect";
import Pagination from "@/components/Pagination/pagination";
import { DEFAULT_PAGE_SIZE } from "@/pages/expense-management/components/common/pagination";
import { formatMoney, formatDate } from "@/pages/expense-management/approval-engine/constants/approvalLabels";
import { useTeamExpenseReports, useTeamMembers } from "@/pages/expense-management/api/useTeamExpenses";

const breadcrumbs = [
  { label: "Expense Management", to: "/expense-management/dashboard" },
  { label: "Expenses", to: "/expense-management/expenses/my" },
  { label: "All Expenses" },
];

// Same labels as MyExpensesPage's status filter, minus Draft (team views never include drafts).
const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Pending Finance Verification", value: "PENDING_FINANCE_VERIFICATION" },
  { label: "Awaiting Correction", value: "AWAITING_CORRECTION" },
  { label: "Query Raised", value: "QUERY_RAISED" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Policy Rejected", value: "POLICY_REJECTED" },
  { label: "Reimbursed", value: "REIMBURSED" },
  { label: "Closed", value: "CLOSED" },
];

const statusLabel = (status) => STATUS_OPTIONS.find((o) => o.value === status)?.label || status || "—";

const SORT_OPTIONS = [
  { label: "Newest submitted", value: "submittedAt:desc" },
  { label: "Oldest submitted", value: "submittedAt:asc" },
  { label: "Amount: high to low", value: "totalAmount:desc" },
  { label: "Amount: low to high", value: "totalAmount:asc" },
];
const DEFAULT_SORT = SORT_OPTIONS[0].value;

const headers = ["Report No.", "Title", "Employee", "Cost Center", "Submitted", "Amount", "Status", "Actions"];
const columns = ["reportNumber", "title", "employee", "costCenter", "submitted", "amount", "status", "actions"];

export default function AllExpensesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const employeeFilter = searchParams.get("employeeId") || "";

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [sortBy, sortDirection] = sort.split(":");

  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const memberList = useMemo(() => members || [], [members]);
  const noDirectReports = !membersLoading && Array.isArray(members) && members.length === 0;

  const {
    data: pageData,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useTeamExpenseReports({
    page: currentPage,
    limit: DEFAULT_PAGE_SIZE,
    sortBy,
    sortDirection,
    status: statusFilter,
    search: searchTerm,
    employeeId: employeeFilter,
  });

  const reports = pageData?.content || [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

  const memberNameById = useMemo(() => new Map(memberList.map((m) => [m.employeeId, m.name])), [memberList]);

  const employeeOptions = useMemo(() => {
    const opts = [{ label: "All Employees", value: "" }, ...memberList.map((m) => ({ label: m.name || m.employeeId, value: m.employeeId }))];
    if (employeeFilter && !memberNameById.has(employeeFilter)) opts.push({ label: employeeFilter, value: employeeFilter });
    return opts;
  }, [memberList, memberNameById, employeeFilter]);

  const hasFilters = Boolean(searchTerm || statusFilter || employeeFilter);

  const handleSearch = useCallback((value) => {
    setSearchTerm(value || "");
    setCurrentPage(1);
  }, []);

  const setEmployeeFilter = (employeeId) => {
    setSearchParams(
      (prev) => {
        if (employeeId) prev.set("employeeId", employeeId);
        else prev.delete("employeeId");
        return prev;
      },
      { replace: true }
    );
    setCurrentPage(1);
  };

  const handleEmployeeChange = (e) => setEmployeeFilter(e.target.value);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setEmployeeFilter("");
  };

  const openReport = (reportId) => navigate(`/expense-management/expenses/reports/${reportId}`);

  const tableRows = reports.map((r) => ({
    reportNumber: <span className="font-mono text-[11px] font-semibold text-gray-700">{r.reportNumber || "—"}</span>,
    title: (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-medium text-xs text-gray-900">{r.title || "Untitled Report"}</span>
        {r.policyWarningCount > 0 && (
          <span
            className="inline-flex items-center gap-0.5 text-amber-600"
            title={`${r.policyWarningCount} policy warning${r.policyWarningCount === 1 ? "" : "s"}${
              r.policyUnjustifiedCount > 0 ? `, ${r.policyUnjustifiedCount} without justification` : ""
            }`}
          >
            <AlertTriangle size={12} />
            <span className="text-[10px] font-semibold">{r.policyWarningCount}</span>
          </span>
        )}
      </span>
    ),
    employee: <span className="text-xs">{memberNameById.get(r.employeeId) || r.employeeId || "—"}</span>,
    costCenter: <span className="text-xs">{r.costCenterName || "—"}</span>,
    submitted: <span className="text-xs whitespace-nowrap">{formatDate(r.submittedAt)}</span>,
    amount: (
      <span className="font-mono font-semibold text-xs text-gray-900 whitespace-nowrap">
        {formatMoney(r.totalAmount, r.baseCurrencyCode || r.currencyCode)}
      </span>
    ),
    status: <StatusBadge label={statusLabel(r.reportStatus)} size="sm" />,
    actions: (
      <Button
        type="button"
        variant="link"
        size="icon"
        title="View Report"
        className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition rounded-md"
        onClick={(e) => {
          e.stopPropagation();
          openReport(r.reportId);
        }}
      >
        <Eye size={14} />
      </Button>
    ),
    onRowClick: () => openReport(r.reportId),
  }));

  const errorMessage = error?.response?.data?.message || "Something went wrong while fetching data. Please try again.";

  return (
    <div className="space-y-3">
      <Breadcrumb items={breadcrumbs} />

      <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4">
        <h1 className="text-lg font-bold text-[#0a174e]">All Expenses</h1>
        <p className="text-xs text-gray-500">View expense submissions across the team.</p>
      </div>

      {noDirectReports ? (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <Users className="h-10 w-10 text-gray-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">No Team Members</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">You have no direct reports in the employee directory.</p>
            </PageCardContent>
          </PageCard>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                <SearchInput
                  value={searchTerm}
                  onSearch={handleSearch}
                  placeholder="Search by title or report number..."
                  className="!py-1.5 !px-3 !text-xs"
                />
              </div>
              <FormSelect
                label="Employee"
                name="employeeFilter"
                value={employeeFilter}
                onChange={handleEmployeeChange}
                options={employeeOptions}
                maxVisibleOptions={8}
                className="[&>label]:text-xs [&>label]:mb-1"
                buttonClassName="!py-1.5 !px-3 !text-xs"
              />
              <FormSelect
                label="Status"
                name="statusFilter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={STATUS_OPTIONS}
                className="[&>label]:text-xs [&>label]:mb-1"
                buttonClassName="!py-1.5 !px-3 !text-xs"
              />
              <FormSelect
                label="Sort by"
                name="sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setCurrentPage(1);
                }}
                options={SORT_OPTIONS}
                className="[&>label]:text-xs [&>label]:mb-1"
                buttonClassName="!py-1.5 !px-3 !text-xs"
              />
            </div>
            {hasFilters && (
              <div className="mt-2 flex justify-end">
                <Button type="button" variant="outline" size="small" className="!py-1 !text-xs" onClick={clearFilters}>
                  <X size={12} />
                  Clear filters
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            {isLoading ? (
              <div className="py-16">
                <LoadingSpinner text="Loading Team Expenses..." />
              </div>
            ) : isError ? (
              <PageCard>
                <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
                  <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
                  <h2 className="text-sm font-semibold text-gray-700">Failed to load Team Expenses</h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">{errorMessage}</p>
                  <Button variant="outline" size="small" className="mt-4" onClick={() => refetch()}>
                    Retry
                  </Button>
                </PageCardContent>
              </PageCard>
            ) : reports.length === 0 ? (
              <PageCard>
                <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
                  <Layers className="h-10 w-10 text-gray-300 mb-3" />
                  <h2 className="text-sm font-semibold text-gray-700">No Expense Reports Found</h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    {hasFilters
                      ? "No team expense reports match the selected search and filters."
                      : "Your team hasn't submitted any expense reports yet."}
                  </p>
                </PageCardContent>
              </PageCard>
            ) : (
              <>
                <p className="mb-2 text-[11px] text-gray-500">
                  {totalElements} report{totalElements === 1 ? "" : "s"}
                </p>
                <div
                  className={`w-full overflow-x-auto rounded-lg transition-opacity [&_tbody_tr]:cursor-pointer [&_td]:!py-1.5 [&_td]:!px-2.5 [&_td]:!text-xs [&_th]:!py-1.5 [&_th]:!px-2.5 [&_th]:!text-xs [&_table]:!text-xs [&_.rounded-full]:!text-[10px] [&_.rounded-full]:!px-1.5 [&_.rounded-full]:!py-0 ${
                    isFetching ? "opacity-60" : ""
                  }`}
                >
                  <GenericTable headers={headers} rows={tableRows} columns={columns} />
                </div>
                <div className="mt-4 flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
