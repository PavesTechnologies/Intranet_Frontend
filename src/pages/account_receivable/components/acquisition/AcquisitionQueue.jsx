import React, { useEffect, useMemo, useState } from "react";
import { Layers, Play, Eye, RotateCcw, FilterX } from "lucide-react";
import StatusBadge from "../../../../components/status/statusbadge";
import SearchInput from "../../../../components/filter/Searchbar";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Pagination from "../../../../components/Pagination/pagination";
import ARTable from "../common/ARTable";
import ActionMenu from "../common/ActionMenu";
import { normalizeAcquisitionStatus } from "../../services/billingDataAcquisitionService";
import { getBillingTypeDisplayName } from "../../utils/billingType";

const BILLING_TYPE_LABELS = {
  TIME_MATERIAL: "Time & Material",
  FIXED_PRICE: "Fixed Price",
  MILESTONE: "Milestone",
  RECURRING: "Recurring",
};

const STATUS_DISPLAY_LABELS = {
  NOT_ACQUIRED: "Not Acquired",
  READY_FOR_TAX: "Ready for Tax",
  TAX_COMPLETED: "Tax Completed",
  INVOICED: "Invoiced",
};

const PAGE_SIZE = 8;

const TABLE_HEADERS = ["Client", "Project", "Billing Type", "Billing Period", "Status", "Reference", "Actions"];
const TABLE_COLUMNS = ["client", "project", "billingType", "billingPeriod", "status", "reference", "actions"];

const TABLE_ALIGNMENTS = {
  client: "left",
  project: "left",
  billingType: "left",
  billingPeriod: "center",
  status: "center",
  reference: "left",
  actions: "center",
};

const FILTER_BUTTON_CLASS =
  "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-left text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

export default function AcquisitionQueue({
  configs = [],
  onViewConfig,
  loading = false,
  selectedStatusFilter = "ALL",
  onStatusFilterChange,
  searchQuery = "",
  onSearchQueryChange,
  onClearFilters,
}) {
  // Local state fallbacks if parent does not manage state directly
  const [localSearch, setLocalSearch] = useState("");
  const [localStatusFilter, setLocalStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const activeSearch = onSearchQueryChange ? searchQuery : localSearch;
  const handleSearchChange = onSearchQueryChange || setLocalSearch;

  const activeStatusFilter = onStatusFilterChange ? selectedStatusFilter : localStatusFilter;
  const handleStatusFilterChange = onStatusFilterChange || setLocalStatusFilter;

  const handleResetFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      setLocalSearch("");
      setLocalStatusFilter("ALL");
    }
  };

  // Canonical composable filtering pipeline
  const filteredConfigs = useMemo(() => {
    return configs.filter((c) => {
      const hasSnapshot = Boolean(c.snapshotId || c.existingSnapshot);
      const st = normalizeAcquisitionStatus(c.billingStatus, hasSnapshot);

      // 1. Status Filter (from active KPI card or status dropdown)
      let matchesStatus = true;
      if (activeStatusFilter === "NOT_ACQUIRED") {
        matchesStatus = st === "NOT_ACQUIRED";
      } else if (
        activeStatusFilter === "READY_FOR_TAX" ||
        activeStatusFilter === "READY_TO_TAX" ||
        activeStatusFilter === "READY"
      ) {
        matchesStatus = st === "READY_FOR_TAX";
      } else if (activeStatusFilter === "TAX_COMPLETED") {
        matchesStatus = st === "TAX_COMPLETED";
      } else if (activeStatusFilter === "INVOICED") {
        matchesStatus = st === "INVOICED";
      }

      // 2. Search Filter (case-insensitive on projectName, projectCode, client)
      let matchesSearch = true;
      if (activeSearch) {
        const q = activeSearch.toLowerCase().trim();
        const pName = String(c.projectName || "").toLowerCase();
        const pCode = String(c.projectCode || "").toLowerCase();
        const client = String(c.client || "").toLowerCase();
        matchesSearch = pName.includes(q) || pCode.includes(q) || client.includes(q);
      }

      return matchesStatus && matchesSearch;
    });
  }, [configs, activeSearch, activeStatusFilter]);

  // Reset back to page 1 whenever search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearch, activeStatusFilter, configs.length]);

  // Status option counts calculated over TOTAL population (configs)
  const populationCounts = useMemo(() => {
    let notAcquired = 0;
    let readyForTax = 0;
    let taxCompleted = 0;
    let invoiced = 0;

    configs.forEach((c) => {
      const hasSnapshot = Boolean(c.snapshotId || c.existingSnapshot);
      const st = normalizeAcquisitionStatus(c.billingStatus, hasSnapshot);
      if (st === "NOT_ACQUIRED") notAcquired++;
      else if (st === "READY_FOR_TAX") readyForTax++;
      else if (st === "TAX_COMPLETED") taxCompleted++;
      else if (st === "INVOICED") invoiced++;
    });

    return {
      totalSetups: configs.length,
      notAcquired,
      readyForTax,
      taxCompleted,
      invoiced,
    };
  }, [configs]);

  const tabs = [
    { key: "ALL", label: "All Setups", count: populationCounts.totalSetups },
    { key: "NOT_ACQUIRED", label: "Not Acquired", count: populationCounts.notAcquired },
    { key: "READY_FOR_TAX", label: "Ready for Tax", count: populationCounts.readyForTax },
    { key: "TAX_COMPLETED", label: "Tax Completed", count: populationCounts.taxCompleted },
    { key: "INVOICED", label: "Invoiced", count: populationCounts.invoiced },
  ];

  const statusFilterOptions = tabs.map((tab) => ({
    value: tab.key,
    label: `${tab.label} (${tab.count})`,
  }));

  const totalPages = Math.ceil(filteredConfigs.length / PAGE_SIZE) || 1;
  const paginatedConfigs = filteredConfigs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const isFilterActive = activeStatusFilter !== "ALL" || activeSearch !== "";

  const getStatusLabelText = (key) => {
    switch (key) {
      case "NOT_ACQUIRED":
        return "Not Acquired";
      case "READY_FOR_TAX":
      case "READY_TO_TAX":
      case "READY":
        return "Ready for Tax";
      case "TAX_COMPLETED":
        return "Tax Completed";
      case "INVOICED":
        return "Invoiced";
      default:
        return "All Setups";
    }
  };

  const tableRows = useMemo(
    () =>
      paginatedConfigs.map((cfg) => {
        const hasSnapshot = Boolean(cfg.snapshotId || cfg.existingSnapshot);
        const st = normalizeAcquisitionStatus(cfg.billingStatus, hasSnapshot);
        const isPending = st === "NOT_ACQUIRED";
        const isTaxInProgress = String(cfg.billingStatus || "").trim().toUpperCase() === "IN_TAX";
        const displayStatus = STATUS_DISPLAY_LABELS[st] || st;

        return {
          onRowClick: () => onViewConfig(cfg),
          client: <div className="text-left font-medium text-slate-700">{cfg.client}</div>,
          project: (
            <div className="text-left">
              <div className="font-semibold text-slate-900">{cfg.projectName}</div>
              <div className="text-xs text-slate-400">{cfg.projectCode}</div>
            </div>
          ),
          billingType: (
            <div className="flex items-center justify-start">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {BILLING_TYPE_LABELS[cfg.billingType] || getBillingTypeDisplayName(cfg.billingType)}
              </span>
            </div>
          ),
          billingPeriod: (
            <div className="flex items-center justify-center font-mono text-xs text-slate-600">
              {cfg.billingPeriod}
            </div>
          ),
          status: (
            <div className="flex items-center justify-center">
              <StatusBadge label={cfg.billingStatus} size="sm" />
            </div>
          ),
          reference: (
            <div className="flex flex-col items-start gap-0.5 text-left">
              <span className="font-mono text-xs font-medium text-slate-700">{cfg.id}</span>
              {(st === "READY_TO_TAX" || st === "IN_TAX" || st === "TAX_COMPLETED") && cfg.snapshotNumber ? (
                <span className="font-mono text-[11px] font-semibold text-emerald-600">{cfg.snapshotNumber}</span>
              ) : null}
            </div>
          ),
          actions: (
            <div
              className="flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <ActionMenu
                items={[
                  {
                    label:
                      st === "TAX_COMPLETED"
                        ? "View Tax Calculation"
                        : isPending
                          ? "Acquire Data"
                          : "View Snapshot",
                    icon:
                      st === "TAX_COMPLETED" ? (
                        <Eye className="h-4 w-4 text-slate-600" />
                      ) : isPending ? (
                        <Play className="h-4 w-4 text-slate-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-600" />
                      ),
                    onClick: () => onViewConfig(cfg),
                  },
                ]}
              />
            </div>
          ),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paginatedConfigs]
  );

  return (
    <PageCard>
      <PageCardContent className="space-y-4 p-4 sm:p-5">
        {/* Header Title & Result Counter — "Acquisition Queue" preserved */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Acquisition Queue</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono font-semibold text-slate-700">
              {filteredConfigs.length} {filteredConfigs.length === 1 ? "project" : "projects"}
            </span>
          </div>
        </div>

        {/* Controls Bar: Search Input + FilterListbox + Clear Button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchInput
              value={activeSearch}
              onSearch={handleSearchChange}
              placeholder="Search project, code or client..."
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="w-56 sm:w-64">
              <FilterListbox
                options={statusFilterOptions}
                value={activeStatusFilter}
                onChange={handleStatusFilterChange}
                buttonClassName={FILTER_BUTTON_CLASS}
                placeholder="Filter status"
              />
            </div>

            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Clear all search and status filters"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
              >
                <FilterX className="h-3.5 w-3.5 text-slate-500" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Table or Contextual Empty State */}
        {filteredConfigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center space-y-3">
            <div className="rounded-full bg-slate-100 p-3 text-slate-400">
              <Layers className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800">No matching projects found</h3>
              <p className="max-w-md text-xs text-slate-500">
                {activeSearch && activeStatusFilter !== "ALL"
                  ? `No projects matching "${activeSearch}" found under status "${getStatusLabelText(activeStatusFilter)}".`
                  : activeSearch
                    ? `No active billing setup projects match "${activeSearch}".`
                    : `No projects currently in status "${getStatusLabelText(activeStatusFilter)}".`}
              </p>
            </div>
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
              >
                <RotateCcw className="h-3 w-3" /> Clear filters to show all projects
              </button>
            )}
          </div>
        ) : (
          <>
            <ARTable
              headers={TABLE_HEADERS}
              columns={TABLE_COLUMNS}
              rows={tableRows}
              alignments={TABLE_ALIGNMENTS}
              loading={loading}
              emptyMessage="No matching projects. Adjust your search or status filter."
            />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            />
          </>
        )}
      </PageCardContent>
    </PageCard>
  );
}
