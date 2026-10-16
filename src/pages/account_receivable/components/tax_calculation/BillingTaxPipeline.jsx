import { useEffect, useMemo, useState } from "react";
import { Calculator, Eye, Inbox } from "lucide-react";

import { PageCard } from "../../../../components/Cards/PageCard";
import SearchInput from "../../../../components/filter/Searchbar";
import ARClearFiltersButton from "../common/ARClearFiltersButton";
import ARKPIStatusTabs from "../common/ARKPIStatusTabs";
import ActionMenu from "../common/ActionMenu";
import Pagination from "../../../../components/Pagination/pagination";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Button from "../../../../components/Button/Button";
import { StageBadge, BillingTypeBadge } from "./PipelineBadges";
import { formatCurrency, formatDisplayDate } from "../../utils/format";
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_ORDER,
  PIPELINE_STAGE_LABELS,
  PIPELINE_EMPTY_MESSAGES,
  countPipelineStages,
  filterByPipelineStage,
} from "../../utils/taxPipeline";

const PAGE_SIZE = 10;
const ALL = "ALL";

// List shows identification only; tax values, region, reference numbers and
// the like live on the View (detail) page. Widths are shared by header and
// body through <colgroup>, so every header sits exactly over its values.
const COLUMNS = [
  { key: "client", label: "Client", align: "left", width: "15%" },
  { key: "project", label: "Project", align: "left", width: "18%" },
  { key: "billingType", label: "Billing Type", align: "left", width: "15%" },
  { key: "billingPeriod", label: "Billing Period", align: "left", width: "17%" },
  { key: "amount", label: "Amount", align: "left", width: "13%" },
  { key: "status", label: "Status", align: "center", width: "12%" },
  { key: "action", label: "Action", align: "center", width: "10%" },
];

const ALIGN_CLASS = { left: "text-left", right: "text-left", center: "text-center" };

// Same horizontal rhythm for header and body cells; outer columns line up
// with the card's 20px content gutter.
const cellPadding = (idx) =>
  `px-4 ${idx === 0 ? "pl-4 sm:pl-5" : ""} ${idx === COLUMNS.length - 1 ? "pr-4 sm:pr-5" : ""}`;

function Money({ value, currency }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-300">—</span>;
  }
  return (
    <span className="whitespace-nowrap tabular-nums text-slate-800">
      {formatCurrency(value, currency)}
    </span>
  );
}

/**
 * Billing Tax Pipeline — every billing record (T&M snapshot or Milestone
 * Plan / Recurring occurrence) rendered in the same row layout,
 * filtered by pipeline stage. Presentation only: records arrive already
 * normalized (utils/taxPipeline) and the single row action comes from
 * `getRowAction`.
 */
export default function BillingTaxPipeline({
  records = [],
  loading = false,
  stage = ALL,
  onStageChange,
  getRowAction,
  onClearFilters,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [billingTypeFilter, setBillingTypeFilter] = useState(ALL);
  const [regionFilter, setRegionFilter] = useState(ALL);
  const [monthFilter, setMonthFilter] = useState(ALL);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [stage, searchQuery, billingTypeFilter, regionFilter, monthFilter]);

  // Search + filters apply first; stage tabs then split that result, so tab
  // counts always describe what the user would see by clicking them.
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (billingTypeFilter !== ALL && r.billingType !== billingTypeFilter) return false;
      if (regionFilter !== ALL && r.taxRegion !== regionFilter) return false;
      if (monthFilter !== ALL && !(r.billingDateKey || "").startsWith(monthFilter)) return false;
      if (q && !r.searchText.includes(q)) return false;
      return true;
    });
  }, [records, searchQuery, billingTypeFilter, regionFilter, monthFilter]);

  const stageCounts = useMemo(() => countPipelineStages(filteredRecords), [filteredRecords]);

  const visibleRecords = useMemo(
    () => filterByPipelineStage(filteredRecords, stage),
    [filteredRecords, stage]
  );

  const totalPages = Math.ceil(visibleRecords.length / PAGE_SIZE) || 1;
  const pageRecords = visibleRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    billingTypeFilter !== ALL ||
    regionFilter !== ALL ||
    monthFilter !== ALL ||
    stage !== ALL;

  const clearFilters = () => {
    setSearchQuery("");
    setBillingTypeFilter(ALL);
    setRegionFilter(ALL);
    setMonthFilter(ALL);
    onClearFilters?.();
  };

  const emptyMessage = hasActiveFilters
    ? "No billing records match your current filters."
    : PIPELINE_EMPTY_MESSAGES[stage] || PIPELINE_EMPTY_MESSAGES.ALL;

  return (
    // No overflow clipping on the card: it grows with its content and the page
    // does the vertical scrolling; filter dropdowns can extend past its edge.
    <PageCard>
      {/* Title and search */}
      <div className="flex flex-col gap-3 px-4 pt-4 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Billing Tax Pipeline</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            All billing types move through the same stages, from upcoming occurrence to invoice.
          </p>
        </div>
        <div className="flex w-full items-center justify-end gap-2 lg:w-[420px]">
          <div className="min-w-0 flex-1">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={(val) => setSearchQuery(val)}
              placeholder="Search by project, client, snapshot number..."
            />
          </div>
          {hasActiveFilters && (
            <ARClearFiltersButton onClick={clearFilters} label="Clear filters" />
          )}
        </div>
      </div>

      {/* Stage tabs — All, then the pipeline in order. The bottom rule is an
          inset shadow (not a border + negative margin) so the row never
          overflows vertically; it only scrolls sideways on narrow screens. */}
      <ARKPIStatusTabs
        label="Billing tax pipeline stages"
        loading={loading}
        className="mt-3"
        items={[
          { key: ALL, label: "All", value: stageCounts[ALL], active: stage === ALL, onClick: () => onStageChange?.(ALL) },
          ...PIPELINE_STAGE_ORDER.map((key) => ({
            key,
            label: PIPELINE_STAGE_LABELS[key],
            value: stageCounts[key],
            active: stage === key,
            onClick: () => onStageChange?.(stage === key ? ALL : key),
          })),
        ]}
      />

      {/* Records */}
      <div className="border-t border-slate-200">
        {loading ? (
          <LoadingSpinner text="Loading billing records..." />
        ) : pageRecords.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
            <Inbox className="h-4 w-4 text-slate-400" />
            {emptyMessage}
          </div>
        ) : (
          // Horizontal scroll only when the viewport is narrower than the
          // table's minimum; never a vertical scroll container.
          <div className="w-full overflow-x-auto overflow-y-hidden">
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <colgroup>
                {COLUMNS.map((col) => (
                  <col key={col.key} style={{ width: col.width }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {COLUMNS.map((col, idx) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`whitespace-nowrap py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${cellPadding(idx)} ${ALIGN_CLASS[col.align]}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRecords.map((record) => {
                  const action = getRowAction?.(record);
                  const clickable = action && !action.disabled;
                  return (
                    <tr
                      key={record.key}
                      onClick={clickable ? action.onClick : undefined}
                      className={`h-12 align-middle transition-colors hover:bg-slate-50 ${clickable ? "cursor-pointer" : ""}`}
                    >
                      {/* max-w-0 lets the % width win so long names truncate instead of widening the column */}
                      <td className={`max-w-0 py-2 text-left font-medium text-slate-800 ${cellPadding(0)}`}>
                        <div className="truncate" title={record.client}>{record.client}</div>
                      </td>
                      <td className={`max-w-0 py-2 text-left ${cellPadding(1)}`}>
                        <div className="truncate font-semibold text-slate-900" title={record.project}>{record.project}</div>
                      </td>
                      <td className={`py-2 text-left ${cellPadding(2)}`}>
                        <BillingTypeBadge label={record.billingType} />
                      </td>
                      <td className={`whitespace-nowrap py-2 text-left text-slate-700 ${cellPadding(3)}`}>
                        {record.billingPeriod}
                        {/* An upcoming occurrence is identified by when it will bill */}
                        {record.stage === PIPELINE_STAGES.UPCOMING && record.billingDate && (
                          <div className="text-[11px] leading-4 text-slate-400">Bills {formatDisplayDate(record.billingDate)}</div>
                        )}
                      </td>
                      <td className={`py-2 text-left ${cellPadding(4)}`}>
                        <Money value={record.amount} currency={record.currency} />
                      </td>
                      <td className={`py-2 text-center ${cellPadding(5)}`}>
                        <StageBadge stage={record.stage} label={record.statusLabel} title={record.rawStatus} />
                      </td>
                      <td className={`py-2 text-center ${cellPadding(6)}`} onClick={(e) => e.stopPropagation()}>
                        {action && (
                          <ActionMenu
                            items={[
                              {
                                label: action.label,
                                icon: action.emphasis ? (
                                  <Calculator className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <Eye className="h-4 w-4 text-slate-600" />
                                ),
                                disabled: action.disabled,
                                onClick: action.onClick,
                              },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && visibleRecords.length > PAGE_SIZE && (
        <div className="border-t border-slate-200 px-4 py-2 sm:px-5">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
          />
        </div>
      )}
    </PageCard>
  );
}
