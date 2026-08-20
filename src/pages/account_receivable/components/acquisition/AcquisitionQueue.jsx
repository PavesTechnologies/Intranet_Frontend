import { useEffect, useMemo, useState } from "react";
import { Layers, Play, Eye } from "lucide-react";
import StatusBadge from "../../../../components/status/statusbadge";
import SearchInput from "../../../../components/filter/Searchbar";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Pagination from "../../../../components/Pagination/pagination";
import ARTable from "../common/ARTable";

const BILLING_TYPE_LABELS = {
  TIME_MATERIAL: "Time & Material",
  FIXED_PRICE: "Fixed Price",
  MILESTONE: "Milestone",
  RECURRING: "Recurring",
};

const PAGE_SIZE = 8;

const TABLE_HEADERS = ["Client", "Project", "Billing Type", "Billing Period", "Status", "Reference", "Action"];
const TABLE_COLUMNS = ["client", "project", "billingType", "billingPeriod", "status", "reference", "action"];

const FILTER_BUTTON_CLASS =
  "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-left text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

export default function AcquisitionQueue({
  configs = [],
  onViewConfig,
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredConfigs = useMemo(() => {
    return configs.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.projectName.toLowerCase().includes(q) ||
        c.projectCode.toLowerCase().includes(q) ||
        c.client.toLowerCase().includes(q);

      const status = c.billingStatus?.toUpperCase();
      let matchesStatus = true;

      if (selectedStatusTab === "NOT_ACQUIRED") {
        matchesStatus = status === "NOT_ACQUIRED" || status === "NOT ACQUIRED";
      } else if (selectedStatusTab === "READY") {
        matchesStatus = status === "READY" || Boolean(c.snapshotNumber);
      } else if (selectedStatusTab === "PARTIALLY_READY") {
        matchesStatus = status === "PARTIALLY_READY" || status === "PARTIALLY READY";
      } else if (selectedStatusTab === "ALREADY_BILLED") {
        matchesStatus = status === "ALREADY_BILLED" || status === "ALREADY BILLED";
      }

      return matchesSearch && matchesStatus;
    });
  }, [configs, searchQuery, selectedStatusTab]);

  // Reset back to page 1 whenever the filtered result set changes shape.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatusTab, configs.length]);

  const tabs = [
    { key: "ALL", label: "All", count: configs.length },
    {
      key: "NOT_ACQUIRED",
      label: "Pending",
      count: configs.filter((c) => c.billingStatus === "NOT_ACQUIRED" || c.billingStatus === "Not Acquired").length,
    },
    {
      key: "READY",
      label: "Ready",
      count: configs.filter((c) => c.billingStatus === "READY" || c.billingStatus === "Ready" || Boolean(c.snapshotNumber)).length,
    },
    {
      key: "ALREADY_BILLED",
      label: "Billed",
      count: configs.filter((c) => c.billingStatus === "ALREADY_BILLED" || c.billingStatus === "Already Billed").length,
    },
  ];

  const statusFilterOptions = tabs.map((tab) => ({
    value: tab.key,
    label: `${tab.label} (${tab.count})`,
  }));

  const totalPages = Math.ceil(filteredConfigs.length / PAGE_SIZE) || 1;
  const paginatedConfigs = filteredConfigs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const tableRows = useMemo(
    () =>
      paginatedConfigs.map((cfg) => {
        const isPending = cfg.billingStatus === "NOT_ACQUIRED" || cfg.billingStatus === "Not Acquired";

        return {
          onRowClick: () => onViewConfig(cfg),
          client: <span className="font-medium text-slate-700">{cfg.client}</span>,
          project: (
            <div className="text-left">
              <div className="font-semibold text-slate-900">{cfg.projectName}</div>
              <div className="text-xs text-slate-400">{cfg.projectCode}</div>
            </div>
          ),
          billingType: (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {BILLING_TYPE_LABELS[cfg.billingType] || cfg.billingType}
            </span>
          ),
          billingPeriod: <span className="font-mono text-xs text-slate-600">{cfg.billingPeriod}</span>,
          status: <StatusBadge label={cfg.billingStatus} size="sm" />,
          reference: (
            <div className="text-left">
              <div className="font-mono text-xs text-slate-600">{cfg.id}</div>
              {cfg.snapshotNumber && (
                <div className="font-mono text-[11px] font-semibold text-emerald-600">{cfg.snapshotNumber}</div>
              )}
            </div>
          ),
          action: (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewConfig(cfg);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {isPending ? (
                <>
                  <Play className="h-3 w-3" /> Acquire
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" /> View
                </>
              )}
            </button>
          ),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paginatedConfigs]
  );

  return (
    <PageCard>
      <PageCardContent className="space-y-4 p-4 sm:p-5">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Acquisition Queue</h2>
        </div>

        {/* Search — wide — beside a compact status filter dropdown */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onSearch={setSearchQuery}
              placeholder="Search project, code or client..."
            />
          </div>
          <div className="sm:w-56">
            <FilterListbox
              options={statusFilterOptions}
              value={selectedStatusTab}
              onChange={setSelectedStatusTab}
              buttonClassName={FILTER_BUTTON_CLASS}
              placeholder="Filter status"
            />
          </div>
        </div>

        {/* Table */}
        <ARTable
          headers={TABLE_HEADERS}
          columns={TABLE_COLUMNS}
          rows={tableRows}
          loading={loading}
          emptyMessage="No matching projects. Adjust your search or status filter."
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
          onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
        />
      </PageCardContent>
    </PageCard>
  );
}
