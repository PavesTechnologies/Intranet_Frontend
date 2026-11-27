import React, { useMemo, useState } from "react";
import Select from "react-select";
import { AlertCircle, AlertTriangle, Building2, CheckCircle2, Inbox, Pencil, Trash2, UserPlus } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PageHeader from "@/components/ui/PageHeader";
import FilterCard from "@/components/ui/FilterCard";
import StatCard from "@/components/Cards/StatCard";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import Modal from "@/components/Modal/modal";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import Pagination from "@/components/Pagination/pagination";
import { showStatusToast } from "@/components/toastfy/toast";
import { useClientPagination } from "@/pages/expense-management/components/common/pagination";
import {
  useApproverCandidates,
  useDeleteDepartmentApprover,
  useDepartmentOverview,
  useSaveDepartmentApprover,
} from "../hooks/useDepartmentApprovers";

const FILTERS = [
  { value: "all", label: "All departments" },
  { value: "assigned", label: "Approver assigned" },
  { value: "missing", label: "No approver" },
  { value: "attention", label: "Needs attention" },
];

const inputCls =
  "h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "42px",
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 1px #6366f1" : "none",
    "&:hover": { borderColor: state.isFocused ? "#6366f1" : "#9ca3af" },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({ ...base, opacity: state.isDisabled ? 0.55 : 1, cursor: state.isDisabled ? "not-allowed" : "default" }),
};

// A row needs attention when its mapping no longer works: the department is gone from Employee
// Onboarding, or the approver is no longer an active employee, or the mapping is switched off.
const needsAttention = (row) =>
  row.departmentApproverId && (!row.departmentInOnboarding || row.approverActive === false || row.status !== "ACTIVE");

function ApproverCell({ row }) {
  if (!row.departmentApproverId) {
    return <span className="text-xs italic text-gray-400">No approver assigned</span>;
  }
  return (
    <div className="min-w-0">
      <p className="font-medium text-gray-900">{row.approverName || row.approverEmployeeId}</p>
      <p className="truncate text-xs text-gray-500">
        {[row.approverEmail, row.approverName ? `ID ${row.approverEmployeeId}` : null].filter(Boolean).join(" · ")}
      </p>
      {row.approverActive === false && (
        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-rose-600">
          <AlertCircle className="h-3 w-3" /> No longer an active employee
        </p>
      )}
    </div>
  );
}

function StatusPill({ row }) {
  if (!row.departmentApproverId) {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Not set</span>;
  }
  return row.status === "ACTIVE" ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Active</span>
  ) : (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Inactive</span>
  );
}

/**
 * Admin config backing ApproverSourceType.DEPARTMENT_OWNER resolution: who approves at a "Department
 * Head" level for each department. Departments come from Employee Onboarding and approvers from
 * UMS (matched to employee records server-side), so the Admin picks names, never raw IDs.
 */
export default function DepartmentApproversPage() {
  const { data: rows, isLoading, isError, error, refetch } = useDepartmentOverview();
  const saveApprover = useSaveDepartmentApprover();
  const deleteApprover = useDeleteDepartmentApprover();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null); // { row, approverEmployeeId, status }
  const [toRemove, setToRemove] = useState(null);

  const { data: candidates, isLoading: candidatesLoading, isError: candidatesError, refetch: refetchCandidates } =
    useApproverCandidates({ enabled: !!editing });

  const all = rows || [];
  const assigned = all.filter((r) => r.departmentApproverId).length;
  const attention = all.filter(needsAttention).length;
  const missing = all.filter((r) => !r.departmentApproverId).length;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((r) => {
      if (filter === "assigned" && !r.departmentApproverId) return false;
      if (filter === "missing" && r.departmentApproverId) return false;
      if (filter === "attention" && !needsAttention(r)) return false;
      if (!term) return true;
      return [r.departmentName, r.departmentDescription, r.approverName, r.approverEmail, r.approverEmployeeId]
        .some((v) => v && String(v).toLowerCase().includes(term));
    });
  }, [all, q, filter]);
  const { pageItems, paginationProps } = useClientPagination(filtered);

  const candidateOptions = useMemo(
    () =>
      (candidates || []).map((c) => ({
        value: c.employeeId || `ums:${c.umsUserUuid}`,
        employeeId: c.employeeId,
        label: c.name || c.email || c.employeeId,
        candidate: c,
        isDisabled: !c.selectable,
      })),
    [candidates]
  );
  // Keep the current approver selectable in the picker even if UMS doesn't list them any more.
  const selectedOption = editing?.approverEmployeeId
    ? candidateOptions.find((o) => o.employeeId === editing.approverEmployeeId) || {
        value: editing.approverEmployeeId,
        employeeId: editing.approverEmployeeId,
        label: editing.row.approverName || editing.approverEmployeeId,
        candidate: { employeeId: editing.approverEmployeeId, email: editing.row.approverEmail, selectable: true },
      }
    : null;

  const openEditor = (row) =>
    setEditing({ row, approverEmployeeId: row.approverEmployeeId || "", status: row.status || "ACTIVE" });

  const handleSave = () => {
    if (!editing?.approverEmployeeId) {
      showStatusToast("Pick an approver.", "error");
      return;
    }
    const { row } = editing;
    saveApprover.mutate(
      {
        id: row.departmentApproverId,
        payload: { departmentUuid: row.departmentUuid, approverEmployeeId: editing.approverEmployeeId, status: editing.status },
      },
      {
        onSuccess: () => {
          showStatusToast(`Approver ${row.departmentApproverId ? "updated" : "assigned"} for ${row.departmentName || "the department"}`, "success");
          setEditing(null);
        },
        onError: (err) => showStatusToast(err.response?.data?.message || "Couldn't save the approver", "error"),
      }
    );
  };

  const handleRemove = () => {
    deleteApprover.mutate(toRemove.departmentApproverId, {
      onSuccess: () => {
        showStatusToast("Approver removed", "success");
        setToRemove(null);
      },
      onError: (err) => {
        showStatusToast(err.response?.data?.message || "Couldn't remove the approver", "error");
        setToRemove(null);
      },
    });
  };

  const formatOption = (option, { context }) => {
    const c = option.candidate || {};
    if (context === "value") {
      return (
        <span>
          {option.label}
          {c.employeeId && <span className="ml-1.5 text-xs text-gray-400">ID {c.employeeId}</span>}
        </span>
      );
    }
    return (
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{option.label}</p>
        <p className="truncate text-xs text-gray-500">
          {[c.email, c.employeeId ? `ID ${c.employeeId}` : null].filter(Boolean).join(" · ")}
        </p>
        {!c.selectable && c.unavailableReason && <p className="text-xs text-rose-600">{c.unavailableReason}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Approval Rules" },
          { label: "Department Approvers" },
        ]}
      />

      <PageHeader
        title="Department Approvers"
        subtitle="Choose who approves expenses for each department. Approval flows with a Department Head level route to this person."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title="Departments" value={isLoading ? "—" : all.length} subtitle="From Employee Onboarding" icon={Building2} textColor="text-indigo-700" />
        <StatCard title="Approver assigned" value={isLoading ? "—" : assigned} subtitle="Ready to route approvals" icon={CheckCircle2} textColor="text-emerald-700" />
        <StatCard
          title="Needs action"
          value={isLoading ? "—" : missing + attention}
          subtitle={`${missing} without approver${attention ? ` · ${attention} need attention` : ""}`}
          icon={AlertCircle}
          textColor="text-amber-700"
        />
      </div>

      <FilterCard title="Filters" description="Find a department or approver.">
        <div className="w-full sm:max-w-xs">
          <SearchInput value={q} onSearch={(v) => setQ(v || "")} placeholder="Department or approver..." />
        </div>
        <select aria-label="Show" value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls}>
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </FilterCard>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading departments…" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <AlertTriangle className="h-6 w-6 text-rose-500" />
            <p className="text-sm font-semibold text-rose-700">{error?.response?.data?.message || "Couldn't load departments."}</p>
            <Button size="small" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <Inbox className="h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">
              {all.length === 0 ? "Employee Onboarding returned no departments." : "No departments match these filters."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <table className="hidden w-full text-sm md:table">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Approver</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageItems.map((row) => (
                  <tr key={row.departmentUuid} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row.departmentName || "Unknown department"}</p>
                      {row.departmentDescription && <p className="line-clamp-1 text-xs text-gray-500">{row.departmentDescription}</p>}
                      {!row.departmentInOnboarding && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-rose-600">
                          <AlertCircle className="h-3 w-3" /> No longer in Employee Onboarding
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ApproverCell row={row} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill row={row} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {row.departmentInOnboarding && (
                          <Button size="small" variant={row.departmentApproverId ? "outline" : "primary"} onClick={() => openEditor(row)}>
                            {row.departmentApproverId ? <Pencil className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                            {row.departmentApproverId ? "Change" : "Assign"}
                          </Button>
                        )}
                        {row.departmentApproverId && (
                          <Button size="small" variant="danger" aria-label="Remove approver" onClick={() => setToRemove(row)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile */}
            <div className="divide-y divide-gray-100 md:hidden">
              {pageItems.map((row) => (
                <div key={row.departmentUuid} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{row.departmentName || "Unknown department"}</p>
                      {!row.departmentInOnboarding && <p className="text-xs font-medium text-rose-600">No longer in Employee Onboarding</p>}
                    </div>
                    <StatusPill row={row} />
                  </div>
                  <ApproverCell row={row} />
                  <div className="flex gap-2">
                    {row.departmentInOnboarding && (
                      <Button size="small" variant={row.departmentApproverId ? "outline" : "primary"} onClick={() => openEditor(row)}>
                        {row.departmentApproverId ? "Change" : "Assign approver"}
                      </Button>
                    )}
                    {row.departmentApproverId && (
                      <Button size="small" variant="danger" onClick={() => setToRemove(row)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center border-t border-gray-100 px-4 py-3">
              <Pagination {...paginationProps} />
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.row?.departmentApproverId ? "Change department approver" : "Assign department approver"}
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saveApprover.isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saveApprover.isPending} loadingText="Saving..." disabled={!editing?.approverEmployeeId}>
              Save
            </Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Department</p>
              <p className="text-sm font-semibold text-gray-900">{editing.row.departmentName}</p>
              {editing.row.departmentDescription && <p className="text-xs text-gray-500">{editing.row.departmentDescription}</p>}
            </div>

            <div>
              <label htmlFor="department-approver-select" className="mb-1 block text-sm font-medium text-gray-700">
                Approver <span className="text-rose-500">*</span>
              </label>
              {candidatesError ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  Couldn't load employees from UMS.
                  <Button size="small" variant="outline" onClick={() => refetchCandidates()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <Select
                  inputId="department-approver-select"
                  options={candidateOptions}
                  value={selectedOption}
                  onChange={(option) => setEditing((prev) => ({ ...prev, approverEmployeeId: option?.employeeId || "" }))}
                  isLoading={candidatesLoading}
                  isOptionDisabled={(option) => option.isDisabled}
                  formatOptionLabel={formatOption}
                  filterOption={(option, input) => {
                    const term = input.trim().toLowerCase();
                    if (!term) return true;
                    const c = option.data.candidate || {};
                    return [option.label, c.email, c.employeeId].some((v) => v && String(v).toLowerCase().includes(term));
                  }}
                  placeholder="Search employees by name, email or ID…"
                  noOptionsMessage={() => (candidatesLoading ? "Loading employees…" : "No matching employees")}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                  styles={selectStyles}
                />
              )}
              <p className="mt-1 text-xs text-gray-500">Employees from UMS. People without an active employee record can't be chosen.</p>
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Status</span>
              <div className="inline-flex rounded-lg border border-gray-300 p-0.5" role="radiogroup" aria-label="Status">
                {["ACTIVE", "INACTIVE"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={editing.status === s}
                    onClick={() => setEditing((prev) => ({ ...prev, status: s }))}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                      editing.status === s ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {s === "ACTIVE" ? "Active" : "Inactive"}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">An inactive mapping is kept but not used to route approvals.</p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={!!toRemove}
        title="Remove department approver"
        message={`Remove ${toRemove?.approverName || toRemove?.approverEmployeeId || "the approver"} as approver for ${
          toRemove?.departmentName || "this department"
        }? Department Head approval levels for this department will have no one to route to until a new approver is assigned.`}
        confirmText="Remove"
        onConfirm={handleRemove}
        onCancel={() => setToRemove(null)}
        isLoading={deleteApprover.isPending}
        variant="danger"
      />
    </div>
  );
}
