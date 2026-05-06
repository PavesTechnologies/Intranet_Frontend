import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Calendar, Check, Search, Trash2, UserCheck, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Pagination from "../../../../components/Pagination/pagination";

const STATUS_CONFIG = {
  REQUESTED: "bg-amber-50 text-amber-700 border-amber-100",
  APPROVED: "bg-indigo-50 text-indigo-700 border-indigo-100",
  FULFILLED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-100",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatPercent = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed}%` : "N/A";
};

const ModificationStatusBadge = ({ status }) => {
  const normalizedStatus = String(status || "UNKNOWN").toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em]",
        STATUS_CONFIG[normalizedStatus] || "bg-slate-50 text-slate-500 border-slate-100"
      )}
    >
      {normalizedStatus}
    </span>
  );
};

const ActionIconButton = ({
  label,
  icon: Icon,
  onClick,
  disabled,
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={cn(
      "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
  >
    <Icon className="h-4 w-4" />
  </button>
);

const ModificationTable = ({
  items,
  loading,
  error,
  canCreate,
  canApprove,
  canCancel,
  onCreate,
  onApprove,
  onReject,
  onCancel,
  processingAction,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setPage(1);
  }, [searchTerm, items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return items;

    return items.filter((item) =>
      [item.resourceName, item.projectName, item.requestedBy, item.approvedBy, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Synchronizing modifications...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
        <p className="text-xs font-bold">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-black tracking-tight text-slate-900">
            Allocation Modifications ({items.length})
          </h3>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            Review requested allocation changes for the current demand.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search modifications..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-bold shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {canCreate && (
            <Button
              type="button"
              onClick={onCreate}
              className="h-10 rounded-xl bg-indigo-600 px-5 text-[10px] font-black tracking-widest text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-700"
            >
              Create Modification
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-sm">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
            <Users className="h-10 w-10 text-slate-200" />
          </div>
          <h4 className="text-lg font-black tracking-tight text-slate-900">
            No Modification Requests
          </h4>
          <p className="mt-2 max-w-[360px] text-sm font-medium leading-relaxed text-slate-400">
            Allocation change requests will appear here once they are created for this demand.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="p-5">Resource Name</th>
                  <th className="p-5">Project</th>
                  <th className="p-5 text-center">Current Allocation %</th>
                  <th className="p-5 text-center">Requested Allocation %</th>
                  <th className="p-5 text-center">Effective Date</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-center">Requested By</th>
                  <th className="p-5 text-center">Approved By</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedItems.map((item) => {
                  const canApproveRequest = canApprove && item.status === "REQUESTED";
                  const canCancelRequest = canCancel && item.status === "REQUESTED";
                  const isApproving = processingAction === `approve-${item.id}`;
                  const isRejecting = processingAction === `reject-${item.id}`;
                  const isCancelling = processingAction === `cancel-${item.id}`;

                  return (
                    <tr key={item.id} className="group transition-colors hover:bg-slate-50/40">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-700">
                            {String(item.resourceName || "R")
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((name) => name[0])
                              .join("") || "R"}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-black tracking-tight text-slate-900">
                              {item.resourceName || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.projectName || "N/A"}</span>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-[11px] font-black text-slate-700">
                          {formatPercent(item.currentAllocationPercentage)}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-[11px] font-black text-indigo-600">
                          {formatPercent(item.requestedAllocationPercentage)}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{formatDate(item.effectiveDate)}</span>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <ModificationStatusBadge status={item.status} />
                      </td>
                      <td className="p-5 text-center">
                        <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                          <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.requestedBy || "N/A"}</span>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-[10px] font-black text-slate-500">
                          {item.approvedBy || "N/A"}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-2">
                          {canApproveRequest && (
                            <>
                              <ActionIconButton
                                label="Approve modification"
                                icon={Check}
                                onClick={() => onApprove(item)}
                                disabled={isApproving || isRejecting}
                                className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              />
                              <ActionIconButton
                                label="Reject modification"
                                icon={X}
                                onClick={() => onReject(item)}
                                disabled={isApproving || isRejecting}
                                className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              />
                            </>
                          )}

                          {canCancelRequest && (
                            <ActionIconButton
                              label="Cancel modification"
                              icon={Trash2}
                              onClick={() => onCancel(item)}
                              disabled={isCancelling}
                              className="border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                            />
                          )}

                          {!canApproveRequest && !canCancelRequest && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                              No Action
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredItems.length > itemsPerPage && (
            <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                onNext={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModificationTable;
