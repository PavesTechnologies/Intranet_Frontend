/**
 * Billing Data Acquisition console — /account-receivable/billing-data-acquisition/workspace
 *
 * Single data source: GET /api/billing-data-acquisition?billingType=…&page=…&size=…
 * Nothing else is called from this page. The previous per-row snapshot lookups,
 * the active-configurations fetch and the localStorage snapshot metadata are all
 * gone, so one request renders one page of the table.
 *
 * Paging is server-side. Search and the status tabs filter the rows of the page
 * currently loaded — the endpoint exposes no search or status parameter, so the
 * UI says "on this page" rather than implying a filter across all results.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, Layers, Play, RefreshCw } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import Button from "../../../components/Button/Button";
import StatusBadge from "../../../components/status/statusbadge";
import SearchInput from "../../../components/filter/Searchbar";
import Pagination from "../../../components/Pagination/pagination";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import { showStatusToast } from "../../../components/toastfy/toast";

import ARTable from "../components/common/ARTable";
import ActionMenu from "../components/common/ActionMenu";
import ARKPIStatusTabs from "../components/common/ARKPIStatusTabs";
import ARClearFiltersButton from "../components/common/ARClearFiltersButton";

import { fetchBillingDataAcquisitionPage } from "../services/billingDataAcquisitionService";

/** This console covers Time & Material only; the endpoint filters server-side. */
const BILLING_TYPE_PARAM = "TIME_AND_MATERIAL";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

/**
 * BillingAcquisitionStatus enum names → display text. Snapshot lifecycle names
 * are included too, since the column simply shows whatever the row carries.
 */
const STATUS_LABELS = {
  NOT_ACQUIRED: "Not Acquired",
  READY: "Ready",
  PARTIALLY_READY: "Partially Ready",
  ALREADY_BILLED: "Already Billed",
  READY_FOR_TAX: "Ready for Tax",
  IN_TAX: "In Tax",
  TAX_COMPLETED: "Tax Completed",
  INVOICED: "Invoiced",
  CANCELLED: "Cancelled",
};

function statusLabel(status) {
  if (!status) return "—";
  return STATUS_LABELS[status] || status.replace(/_/g, " ");
}

const TABLE_HEADERS = ["Client", "Project", "Project Code", "Billing Type", "Status", "Actions"];
const TABLE_COLUMNS = ["client", "project", "projectCode", "billingType", "status", "actions"];

export default function BillingDataAcquisition() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    size: PAGE_SIZE_OPTIONS[0],
    totalElements: 0,
    totalPages: 1,
    first: true,
    last: true,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadPage = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await fetchBillingDataAcquisitionPage({
        billingType: BILLING_TYPE_PARAM,
        page,
        size,
      });

      setRows(result.rows);
      setPagination(result.pagination);
      setLoadError(result.error || "");

      if (result.error) {
        showStatusToast(result.error, "error");
      } else if (isManualRefresh) {
        showStatusToast("Acquisition list refreshed.", "success");
      }

      setLoading(false);
      setRefreshing(false);
    },
    [page, size]
  );

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  // A page of 10 rows can hold at most 10 statuses — the filters are page-scoped.
  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      return [row.projectName, row.projectCode, row.clientName, row.billingType]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [rows, searchQuery, statusFilter]);

  const statusTabs = useMemo(() => {
    const counts = new Map();
    rows.forEach((row) => {
      if (!row.status) return;
      counts.set(row.status, (counts.get(row.status) || 0) + 1);
    });
    return [
      { key: "ALL", label: "All", count: rows.length },
      ...Array.from(counts.entries()).map(([key, count]) => ({
        key,
        label: statusLabel(key),
        count,
      })),
    ];
  }, [rows]);

  const openRow = useCallback(
    (row) => {
      if (!row.billingConfigurationId) {
        showStatusToast("This record has no billing configuration id, so it can't be opened.", "warning");
        return;
      }
      // The list carries no projectId — the detail route is opened with the
      // billing configuration id, and the row travels in navigation state.
      navigate(`/account-receivable/billing-data-acquisition/${row.billingConfigurationId}`, {
        state: { config: row, billingConfigurationId: row.billingConfigurationId },
      });
    },
    [navigate]
  );

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
  };

  const isFilterActive = statusFilter !== "ALL" || searchQuery !== "";

  const tableRows = useMemo(
    () =>
      visibleRows.map((row) => {
        const isNotAcquired = row.status === "NOT_ACQUIRED" || !row.status;
        return {
          onRowClick: () => openRow(row),
          client: <span className="font-medium text-slate-700">{row.clientName || "—"}</span>,
          project: <span className="font-semibold text-slate-900">{row.projectName || "—"}</span>,
          projectCode: (
            <span className="font-mono text-xs text-slate-600">{row.projectCode || "—"}</span>
          ),
          billingType: (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {row.billingType || "—"}
            </span>
          ),
          status: (
            <div className="flex items-center justify-center">
              {row.status ? <StatusBadge label={row.status} size="sm" /> : <span className="text-slate-400">—</span>}
            </div>
          ),
          actions: (
            <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
              <ActionMenu
                items={[
                  {
                    label: isNotAcquired ? "Acquire Data" : "View Billing Periods",
                    icon: isNotAcquired ? (
                      <Play className="h-4 w-4 text-slate-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-600" />
                    ),
                    onClick: () => openRow(row),
                  },
                ]}
              />
            </div>
          ),
        };
      }),
    [visibleRows, openRow]
  );

  const { totalElements, totalPages } = pagination;
  const rangeStart = totalElements === 0 ? 0 : (page - 1) * size + 1;
  const rangeEnd = Math.min(page * size, totalElements || rows.length);

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Billing Data Acquisition Console"
        subtitle="Time & Material billing configurations awaiting source data acquisition."
        actions={
          <Button
            variant="outline"
            onClick={() => loadPage(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      <PageCard>
        <PageCardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Acquisition queue</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {totalElements > 0
                  ? `Showing ${rangeStart}–${rangeEnd} of ${totalElements} configuration${totalElements === 1 ? "" : "s"}.`
                  : "Time & Material configurations returned by the acquisition service."}
              </p>
            </div>
            <div className="flex w-full items-center justify-end gap-2 lg:w-[460px]">
              <div className="min-w-0 flex-1">
                <SearchInput
                  value={searchQuery}
                  onSearch={setSearchQuery}
                  placeholder="Filter this page by project, code or client…"
                />
              </div>
              <select
                value={size}
                onChange={(event) => {
                  setSize(Number(event.target.value));
                  setPage(1);
                }}
                aria-label="Rows per page"
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} / page
                  </option>
                ))}
              </select>
              {isFilterActive && (
                <ARClearFiltersButton onClick={handleClearFilters} title="Clear search and status filter" />
              )}
            </div>
          </div>

          <ARKPIStatusTabs
            label="Acquisition status (this page)"
            loading={loading}
            items={statusTabs.map((tab) => ({
              key: tab.key,
              label: tab.label,
              value: tab.count,
              active: statusFilter === tab.key,
              onClick: () =>
                setStatusFilter(tab.key === "ALL" || statusFilter === tab.key ? "ALL" : tab.key),
            }))}
          />

          {loadError ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-amber-900">Couldn't load the acquisition list</h3>
                <p className="text-xs text-amber-800">{loadError}</p>
                <button
                  type="button"
                  onClick={() => loadPage(true)}
                  className="text-xs font-semibold text-amber-900 underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : !loading && rows.length > 0 && visibleRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
              <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                <Layers className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-800">Nothing matches on this page</h3>
                <p className="max-w-md text-xs text-slate-500">
                  The filters apply to the {rows.length} row{rows.length === 1 ? "" : "s"} currently loaded. Clear them,
                  or move to another page.
                </p>
              </div>
            </div>
          ) : (
            <ARTable
              headers={TABLE_HEADERS}
              columns={TABLE_COLUMNS}
              rows={tableRows}
              loading={loading}
              emptyMessage="No Time & Material billing configurations found."
            />
          )}

          {!loadError && totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPrevious={() => setPage((current) => Math.max(current - 1, 1))}
              onNext={() => setPage((current) => Math.min(current + 1, totalPages))}
            />
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
}
