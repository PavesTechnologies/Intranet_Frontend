// src/pages/Projects/Milestones/index.jsx
// Project Details → Milestones tab. Visible to project managers only; the backend
// additionally requires the manager to own or belong to the project.
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Lock, Plus, RefreshCw } from "lucide-react";
import Pagination from "../../../components/Pagination/pagination";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "../../../components/toastfy/toast";
import MilestoneSummaryCards from "./components/MilestoneSummaryCards";
import MilestoneTable from "./components/MilestoneTable";
import MilestoneFormModal from "./components/MilestoneFormModal";
import MilestoneDetailDrawer from "./components/MilestoneDetailDrawer";
import { useMilestoneList, useMilestoneMutations, useMilestoneSummary } from "./hooks/useMilestones";
import {
  EXECUTION_STATUSES,
  READINESS_META,
  READINESS_VALUES,
  STATUS_META,
  firstApiError,
  isEditable,
} from "./utils/milestoneUtils";

const PAGE_SIZE = 20;

const selectClass =
  "rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm text-slate-700 shadow-sm " +
  "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

const ErrorState = ({ error, onRetry }) => {
  const forbidden = error?.response?.status === 403;
  const Icon = forbidden ? Lock : AlertCircle;
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${forbidden ? "bg-slate-100" : "bg-rose-50"}`}>
        <Icon className={`h-5 w-5 ${forbidden ? "text-slate-500" : "text-rose-600"}`} aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {forbidden ? "You don't have access to these milestones" : "Couldn't load milestones"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {forbidden
            ? "Only project managers who own or belong to this project can view milestones."
            : firstApiError(error)}
        </p>
      </div>
      {!forbidden && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
};

const MilestonesTab = ({ projectId }) => {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [readiness, setReadiness] = useState("");
  const [sort, setSort] = useState({ sortBy: "createdAt", direction: "asc" });
  const [formState, setFormState] = useState({ open: false, milestone: null });
  const [selectedId, setSelectedId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const { remove } = useMilestoneMutations(projectId);

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync({ milestoneId: pendingDelete.id });
      showStatusToast("Milestone deleted", "success");
      setPendingDelete(null);
    } catch (err) {
      showStatusToast(firstApiError(err), "error");
    }
  };

  const listParams = useMemo(
    () => ({ page, size: PAGE_SIZE, status, readiness, ...sort }),
    [page, status, readiness, sort]
  );
  const list = useMilestoneList(projectId, listParams);
  const summary = useMilestoneSummary(projectId);

  const rows = list.data?.content ?? [];
  const totalPages = list.data?.totalPages ?? 0;

  // Deleting the last row of the last page leaves us past the end; step back one page.
  useEffect(() => {
    if (page > 0 && list.data && page >= list.data.totalPages) setPage(Math.max(0, list.data.totalPages - 1));
  }, [page, list.data]);
  // Keep the drawer in sync with refreshed list data after any mutation.
  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null;

  const onSort = (column) => {
    setPage(0);
    setSort((s) =>
      s.sortBy === column ? { sortBy: column, direction: s.direction === "asc" ? "desc" : "asc" } : { sortBy: column, direction: "asc" }
    );
  };

  const openCreate = () => setFormState({ open: true, milestone: null });
  const openEdit = (m) => {
    if (!isEditable(m)) return; // completed milestones are read-only
    setSelectedId(null);
    setFormState({ open: true, milestone: m });
  };

  const loadError = list.error || summary.error;

  return (
    <div className="px-5 py-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-800">Milestones</h1>
        {!loadError && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add milestone
          </button>
        )}
      </div>

      {loadError ? (
        <ErrorState
          error={loadError}
          onRetry={() => {
            list.refetch();
            summary.refetch();
          }}
        />
      ) : (
        <>
          <MilestoneSummaryCards summary={summary.data} isLoading={summary.isLoading} />

          <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filter milestones">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Status
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
                className={selectClass}
              >
                <option value="">All</option>
                {EXECUTION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Billing
              <select
                value={readiness}
                onChange={(e) => {
                  setReadiness(e.target.value);
                  setPage(0);
                }}
                className={selectClass}
              >
                <option value="">All</option>
                {READINESS_VALUES.map((r) => (
                  <option key={r} value={r}>
                    {READINESS_META[r].label}
                  </option>
                ))}
              </select>
            </label>
            {(status || readiness) && (
              <button
                type="button"
                onClick={() => {
                  setStatus("");
                  setReadiness("");
                  setPage(0);
                }}
                className="rounded text-sm font-medium text-indigo-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Clear filters
              </button>
            )}
            <span className="ml-auto text-xs text-slate-500" aria-live="polite">
              {list.data ? `${list.data.totalElements} milestone${list.data.totalElements === 1 ? "" : "s"}` : ""}
            </span>
          </div>

          <MilestoneTable
            rows={rows}
            isLoading={list.isLoading}
            isFiltered={!!(status || readiness)}
            sort={sort}
            onSort={onSort}
            onOpen={(m) => setSelectedId(m.id)}
            onEdit={openEdit}
            onDelete={setPendingDelete}
            onCreate={openCreate}
          />

          <Pagination
            currentPage={page + 1}
            totalPages={totalPages}
            onPrevious={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          />
        </>
      )}

      <MilestoneFormModal
        isOpen={formState.open}
        onClose={() => setFormState({ open: false, milestone: null })}
        projectId={projectId}
        milestone={formState.milestone}
        summary={summary.data}
      />

      <ConfirmationModal
        isOpen={!!pendingDelete}
        title="Delete milestone"
        message={
          pendingDelete
            ? `Delete ${pendingDelete.milestoneCode} “${pendingDelete.name}”? This can't be undone.`
            : ""
        }
        confirmText="Delete"
        cancelText="Go back"
        variant="danger"
        isLoading={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <MilestoneDetailDrawer
        milestone={selected}
        projectId={projectId}
        onClose={() => setSelectedId(null)}
        onEdit={openEdit}
      />
    </div>
  );
};

export default MilestonesTab;
