import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronRight, Inbox, Search } from "lucide-react";

import { PageCard } from "../../../../components/Cards/PageCard";
import SearchInput from "../../../../components/filter/Searchbar";
import FilterListbox from "../../../../components/filter/FilterListbox";
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
  formatMonthKey,
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
  { key: "amount", label: "Amount", align: "right", width: "13%" },
  { key: "status", label: "Status", align: "center", width: "12%" },
  { key: "action", label: "Action", align: "right", width: "10%" },
];

const ALIGN_CLASS = { left: "text-left", right: "text-right", center: "text-center" };

// Same horizontal rhythm for header and body cells; outer columns line up
// with the card's 20px content gutter.
const cellPadding = (idx) =>
  `px-4 ${idx === 0 ? "pl-4 sm:pl-5" : ""} ${idx === COLUMNS.length - 1 ? "pr-4 sm:pr-5" : ""}`;

// Compact, equal-height toolbar controls (search input and listboxes).
const CONTROL_HEIGHT = "!h-9";
const LISTBOX_BUTTON_CLASS =
  "relative h-9 w-full cursor-default rounded-lg border border-gray-300 bg-white pl-3 pr-8 text-left text-[13px] text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function Money({ value, currency }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-300">—</span>;
  }
  return (
    <span className="whitespace-nowrap font-mono tabular-nums text-slate-800">
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
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [billingTypeFilter, setBillingTypeFilter] = useState(ALL);
  const [regionFilter, setRegionFilter] = useState(ALL);
  const [monthFilter, setMonthFilter] = useState(ALL);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [stage, searchQuery, billingTypeFilter, regionFilter, monthFilter]);

  const billingTypeOptions = useMemo(() => {
    const types = Array.from(new Set(records.map((r) => r.billingType).filter(Boolean))).sort();
    return [{ value: ALL, label: "All Billing Types" }, ...types.map((t) => ({ value: t, label: t }))];
  }, [records]);

  const regionOptions = useMemo(() => {
    const regions = Array.from(new Set(records.map((r) => r.taxRegion).filter(Boolean))).sort();
    return [{ value: ALL, label: "All Tax Regions" }, ...regions.map((r) => ({ value: r, label: r }))];
  }, [records]);

  const monthOptions = useMemo(() => {
    const months = Array.from(
      new Set(records.map((r) => r.billingDateKey && r.billingDateKey.slice(0, 7)).filter(Boolean))
    ).sort().reverse();
    return [{ value: ALL, label: "All Billing Periods" }, ...months.map((m) => ({ value: m, label: formatMonthKey(m) }))];
  }, [records]);

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

  const stageCounts = useMemo(() => {
    const counts = { [ALL]: filteredRecords.length };
    PIPELINE_STAGE_ORDER.forEach((s) => {
      counts[s] = 0;
    });
    filteredRecords.forEach((r) => {
      counts[r.stage] += 1;
    });
    return counts;
  }, [filteredRecords]);

  const visibleRecords = useMemo(
    () => (stage === ALL ? filteredRecords : filteredRecords.filter((r) => r.stage === stage)),
    [filteredRecords, stage]
  );

  const totalPages = Math.ceil(visibleRecords.length / PAGE_SIZE) || 1;
  const pageRecords = visibleRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilters =
    searchQuery.trim() !== "" || billingTypeFilter !== ALL || regionFilter !== ALL || monthFilter !== ALL;

  const clearFilters = () => {
    setSearchQuery("");
    setBillingTypeFilter(ALL);
    setRegionFilter(ALL);
    setMonthFilter(ALL);
  };

  const emptyMessage = hasActiveFilters
    ? "No billing records match your current filters."
    : PIPELINE_EMPTY_MESSAGES[stage] || PIPELINE_EMPTY_MESSAGES.ALL;

  const renderTab = (key, label) => {
    const active = stage === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => onStageChange?.(key)}
        className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:bg-slate-50 ${
          active
            ? "border-[#0A0082] text-[#0A0082]"
            : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
        }`}
      >
        {label}
        <span
          className={`min-w-[20px] rounded-full px-1.5 py-px text-center text-[10px] font-semibold tabular-nums ${
            active ? "bg-[#0A0082] text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {loading ? "…" : stageCounts[key]}
        </span>
      </button>
    );
  };

  return (
    // No overflow clipping on the card: it grows with its content and the page
    // does the vertical scrolling; filter dropdowns can extend past its edge.
    <PageCard>
      {/* Title */}
      <div className="px-4 pt-4 sm:px-5">
        <h2 className="text-sm font-semibold text-slate-900">Billing Tax Pipeline</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          All billing types move through the same stages, from upcoming occurrence to invoice.
        </p>
      </div>

      {/* Stage tabs — All, then the pipeline in order. The bottom rule is an
          inset shadow (not a border + negative margin) so the row never
          overflows vertically; it only scrolls sideways on narrow screens. */}
      <div className="mt-3 flex items-center gap-1 overflow-x-auto overflow-y-hidden px-2 shadow-[inset_0_-1px_0_0_#e2e8f0] sm:px-3">
        {renderTab(ALL, "All")}
        <span className="mx-2 h-4 w-px shrink-0 bg-slate-200" aria-hidden="true" />
        {PIPELINE_STAGE_ORDER.map((s, idx) => (
          <Fragment key={s}>
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />}
            {renderTab(s, PIPELINE_STAGE_LABELS[s])}
          </Fragment>
        ))}
      </div>

      {/* Filter toolbar — search is the widest control; wraps to two rows below lg */}
      <div className="px-4 py-3 sm:px-5">
        <div className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 sm:grid-cols-3 lg:grid-cols-[minmax(0,2.1fr)_repeat(3,minmax(0,1fr))_auto]">
          <div className="relative sm:col-span-3 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={(val) => setSearchQuery(val)}
              placeholder="Search by project, client, snapshot number..."
              className={`${CONTROL_HEIGHT} !pl-8 !text-[13px] !shadow-none`}
            />
          </div>
          <FilterListbox
            options={billingTypeOptions}
            value={billingTypeFilter}
            onChange={setBillingTypeFilter}
            placeholder="Billing Type"
            buttonClassName={LISTBOX_BUTTON_CLASS}
          />
          <FilterListbox
            options={regionOptions}
            value={regionFilter}
            onChange={setRegionFilter}
            placeholder="Tax Region"
            buttonClassName={LISTBOX_BUTTON_CLASS}
          />
          <FilterListbox
            options={monthOptions}
            value={monthFilter}
            onChange={setMonthFilter}
            placeholder="Billing Period"
            buttonClassName={LISTBOX_BUTTON_CLASS}
          />
          {hasActiveFilters && (
            <Button
              variant="link"
              size="small"
              onClick={clearFilters}
              className="justify-self-end whitespace-nowrap px-2 text-xs sm:col-span-3 lg:col-span-1"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

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
                      <td className={`max-w-0 py-2 font-medium text-slate-800 ${cellPadding(0)}`}>
                        <div className="truncate" title={record.client}>{record.client}</div>
                      </td>
                      <td className={`max-w-0 py-2 ${cellPadding(1)}`}>
                        <div className="truncate font-semibold text-slate-900" title={record.project}>{record.project}</div>
                      </td>
                      <td className={`py-2 ${cellPadding(2)}`}>
                        <BillingTypeBadge label={record.billingType} />
                      </td>
                      <td className={`whitespace-nowrap py-2 text-slate-700 ${cellPadding(3)}`}>
                        {record.billingPeriod}
                        {/* An upcoming occurrence is identified by when it will bill */}
                        {record.stage === PIPELINE_STAGES.UPCOMING && record.billingDate && (
                          <div className="text-[11px] leading-4 text-slate-400">Bills {formatDisplayDate(record.billingDate)}</div>
                        )}
                      </td>
                      <td className={`py-2 text-right ${cellPadding(4)}`}>
                        <Money value={record.amount} currency={record.currency} />
                      </td>
                      <td className={`py-2 text-center ${cellPadding(5)}`}>
                        <StageBadge stage={record.stage} label={record.statusLabel} title={record.rawStatus} />
                      </td>
                      <td className={`py-2 text-right ${cellPadding(6)}`} onClick={(e) => e.stopPropagation()}>
                        {action && (
                          <Button
                            variant={action.emphasis ? "primary" : "outline"}
                            size="small"
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className="whitespace-nowrap text-xs font-semibold"
                          >
                            {action.label}
                          </Button>
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
