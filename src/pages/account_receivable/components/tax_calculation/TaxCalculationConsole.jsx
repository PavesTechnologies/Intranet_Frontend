import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { KPICard } from "../../../../components/kpi/KPI";
import Button from "../../../../components/Button/Button";
import Loader from "../../../../components/ui/Loader";
import SearchInput from "../../../../components/filter/Searchbar";
import FilterListbox from "../../../../components/filter/FilterListbox";
import Pagination from "../../../../components/Pagination/pagination";
import StatusBadge from "../../../../components/status/statusbadge";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ARTable from "../common/ARTable";
import ActionMenu from "../common/ActionMenu";

import {
  fetchActiveBillingConfigurations,
  getBillingSnapshotByPeriod,
  getAcquiredSnapshotMetadata,
  formatBillingPeriod,
} from "../../services/billingDataAcquisitionService";
import { getTaxCalculation } from "../../services/taxCalculationService";
import { getInvoice } from "../../services/invoiceService";
import { getActiveTaxRegions } from "../../services/taxRateConfigurationService";
import { getBillingOccurrences } from "../../services/billingOccurrenceService";
import BillingOccurrenceCard from "./BillingOccurrenceCard";

/* ------------------------------------------------------------------ */
/* Global constants                                                    */
/* ------------------------------------------------------------------ */

const ACQUISITION_PATH = "/account-receivable/billing-data-acquisition";
const OCCURRENCE_DETAIL_BASE = "/account-receivable/tax-calculation/occurrence";

// Same page size as the other AR list pages (e.g. BillingApprovals)
const PAGE_SIZE = 5;

const STATUS_TABS = {
  ALL: "ALL",
  READY_TO_TAX: "READY_TO_TAX",
  IN_TAX: "IN_TAX",
  TAX_COMPLETED: "TAX_COMPLETED",
  INVOICED: "INVOICED",
};

const TABLE_HEADERS = [
  "Client",
  "Project",
  "Snapshot Number",
  "Billing Period",
  "Tax Region",
  "Commercial Amount",
  "Status",
  "Action",
];

const TABLE_COLUMNS = [
  "client",
  "project",
  "snapshotNumber",
  "billingPeriod",
  "taxRegion",
  "taxableAmount",
  "status",
  "action",
];

// Normalises the many raw status strings into one of the STATUS_TABS keys
function getStatusGroup(status) {
  const st = (status || "").toUpperCase();
  if (st === "READY_TO_TAX" || st === "READY_FOR_TAX" || st === "READY") return STATUS_TABS.READY_TO_TAX;
  if (st === "IN_TAX") return STATUS_TABS.IN_TAX;
  if (st === "TAX_COMPLETED" || st === "CALCULATED") return STATUS_TABS.TAX_COMPLETED;
  if (st === "INVOICED") return STATUS_TABS.INVOICED;
  return null;
}

export default function TaxCalculationConsole() {
  const navigate = useNavigate();

  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters + pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState(STATUS_TABS.ALL);
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Billing Occurrences — Fixed Price / Recurring records feeding this same
  // Tax Calculation workspace. Each section is fetched by the exact backend
  // status it represents; the frontend never re-derives eligibility.
  const [occLoading, setOccLoading] = useState(true);
  const [readyOccurrences, setReadyOccurrences] = useState([]);
  const [upcomingOccurrences, setUpcomingOccurrences] = useState([]);
  const [processedOccurrences, setProcessedOccurrences] = useState([]);
  const [invoicedOccurrences, setInvoicedOccurrences] = useState([]);

  const loadOccurrences = async () => {
    setOccLoading(true);
    try {
      // periodStatus and taxStatus are two separate backend fields (never
      // assume they're the same) -- periodStatus is the occurrence's own
      // lifecycle (SCHEDULED -> TAX_PENDING -> TAX_CALCULATED, advanced only
      // by the backend scheduler) and is what both bucket membership here
      // and calculate-tax eligibility are keyed on; taxStatus/
      // taxCalculationStatus are informational fields shown on the card/
      // detail view only.
      const [ready, upcoming, processed] = await Promise.all([
        getBillingOccurrences({ periodStatus: "TAX_PENDING" }).catch(() => []),
        getBillingOccurrences({ periodStatus: "SCHEDULED" }).catch(() => []),
        getBillingOccurrences({ periodStatus: "TAX_CALCULATED" }).catch(() => []),
      ]);
      setReadyOccurrences(ready);
      setUpcomingOccurrences(upcoming);
      // Invoiced is not its own periodStatus/taxStatus value — it's the
      // backend's isInvoiced flag on an already-tax-calculated occurrence,
      // so it's split out here rather than queried separately.
      setProcessedOccurrences(processed.filter((o) => !o.isInvoiced));
      setInvoicedOccurrences(processed.filter((o) => o.isInvoiced));
    } catch (err) {
      console.error("[TaxCalculationConsole] Error loading billing occurrences:", err);
    } finally {
      setOccLoading(false);
    }
  };

  useEffect(() => {
    loadOccurrences();
  }, []);

  const handleViewOccurrence = (occurrence) => {
    navigate(`${OCCURRENCE_DETAIL_BASE}/${occurrence.billingScheduleId}`, {
      state: { occurrence },
    });
  };

  const handleOpenOccurrenceTaxCalculation = (occurrence) => {
    navigate(`${OCCURRENCE_DETAIL_BASE}/${occurrence.billingScheduleId}`, {
      state: { occurrence },
    });
  };

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setLoading(true);

    try {
      // This table is the Time & Material billing-snapshot queue only --
      // Fixed Price/Recurring occurrences are loaded separately via
      // getBillingOccurrences(). fetchActiveBillingConfigurations() returns
      // every active configuration regardless of billing type, so it must
      // be filtered down here the same way Data Acquisition does.
      const allActiveConfigs = await fetchActiveBillingConfigurations();
      const activeConfigs = allActiveConfigs.filter((cfg) => cfg.billingTypeCode === "TIME_MATERIAL");
      const regionsList = await getActiveTaxRegions().catch(() => []);

      const loadedSnapshots = (
        await Promise.all(
          activeConfigs.map(async (cfg) => {
            if (!cfg.projectId && !cfg.id) return null;

            const savedMeta = getAcquiredSnapshotMetadata(cfg.projectId);
            const snapStart = cfg.billingPeriodStart || savedMeta?.billingPeriodStart || null;
            const snapEnd = cfg.billingPeriodEnd || savedMeta?.billingPeriodEnd || null;

            let existingSnapshot = null;
            if (cfg.projectId && snapStart && snapEnd) {
              existingSnapshot = await getBillingSnapshotByPeriod(cfg.projectId, snapStart, snapEnd).catch(() => null);
            }

            const snapshotId =
              existingSnapshot?.snapshotId ||
              savedMeta?.snapshotId ||
              cfg.snapshotId ||
              null;

            const snapshotNumber =
              existingSnapshot?.snapshotNumber ||
              savedMeta?.snapshotNumber ||
              cfg.snapshotNumber ||
              null;

            let snapshotStatus =
              existingSnapshot?.status ||
              savedMeta?.status ||
              cfg.billingStatus ||
              (snapshotId ? "READY_TO_TAX" : "NOT_ACQUIRED");

            let taxableAmount =
              existingSnapshot?.totalAmount ||
              existingSnapshot?.subtotal ||
              savedMeta?.totalAmount ||
              savedMeta?.subtotal ||
              cfg.projectBudget ||
              0;

            let taxRegionName = cfg.taxRegionName || cfg.taxRegionLabel || "India";

            if (
              snapshotId &&
              (snapshotStatus === "TAX_COMPLETED" ||
                snapshotStatus === "IN_TAX" ||
                snapshotStatus === "INVOICED" ||
                existingSnapshot)
            ) {
              const taxCalcData = await getTaxCalculation(snapshotId).catch(() => null);
              if (taxCalcData) {
                const tStatus = (taxCalcData.snapshotStatus || taxCalcData.status || "").toUpperCase();
                if (tStatus === "CALCULATED" || tStatus === "TAX_COMPLETED" || tStatus === "COMPLETED") {
                  snapshotStatus = "TAX_COMPLETED";
                } else if (taxCalcData.status) {
                  snapshotStatus = taxCalcData.status;
                }
                if (taxCalcData.taxableAmount !== null && taxCalcData.taxableAmount !== undefined) {
                  taxableAmount = taxCalcData.taxableAmount;
                }
                if (taxCalcData.taxRegionName) {
                  taxRegionName = taxCalcData.taxRegionName;
                }
              }

              // Check if invoice exists for this snapshot
              const invData = await getInvoice(snapshotId).catch(() => null);
              if (invData && (invData.invoiceNumber || invData.invoiceId)) {
                snapshotStatus = "INVOICED";
              } else if (savedMeta?.status === "INVOICED" || existingSnapshot?.status === "INVOICED") {
                snapshotStatus = "INVOICED";
              }
            }

            if (typeof taxRegionName === "string" && taxRegionName.includes("-") && taxRegionName.length > 30) {
              const matched = regionsList.find(
                (r) => r.taxRegionId === taxRegionName || r.id === taxRegionName
              );
              taxRegionName = matched?.taxRegionName || matched?.label || "India";
            }

            const stUpper = (snapshotStatus || "").toUpperCase();
            if (snapshotId && (stUpper === "READY" || stUpper === "READY_TO_TAX")) {
              snapshotStatus = "READY_FOR_TAX";
            } else if (stUpper === "CALCULATED") {
              snapshotStatus = "TAX_COMPLETED";
            } else if (stUpper === "INVOICED") {
              snapshotStatus = "INVOICED";
            }

            const displayPeriod =
              existingSnapshot?.billingPeriod ||
              (snapStart && snapEnd ? formatBillingPeriod(snapStart, snapEnd) : cfg.billingPeriod);

            return {
              id: snapshotId || `cfg-${cfg.id || cfg.projectId}`,
              snapshotId,
              snapshotNumber,
              client: cfg.client || "Account Management",
              projectName: cfg.projectName || "Website Redesign",
              projectCode: cfg.projectCode || `PRJ-${cfg.projectId || "1"}`,
              billingPeriod: displayPeriod,
              periodStart: snapStart || cfg.periodStart,
              periodEnd: snapEnd || cfg.periodEnd,
              taxRegion: taxRegionName || "India",
              currency: cfg.currency || "USD",
              taxableAmount,
              status: snapshotStatus,
              config: {
                ...cfg,
                snapshotPeriodStart: snapStart,
                snapshotPeriodEnd: snapEnd,
                billingPeriod: displayPeriod,
                snapshotId,
                snapshotNumber,
                billingStatus: snapshotStatus,
              },
            };
          })
        )
      ).filter(Boolean);

      setSnapshots(loadedSnapshots);

      if (isManualRefresh) {
        showStatusToast("Tax calculation queue refreshed.", "success");
      }
    } catch (err) {
      console.error("[TaxCalculationConsole] Error loading data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData(true);
    loadOccurrences();
  };

  // Only snapshots that belong in the tax workspace
  const relevantSnapshots = useMemo(
    () => snapshots.filter((s) => getStatusGroup(s.status) !== null),
    [snapshots]
  );

  const tabCounts = useMemo(() => {
    const counts = {
      [STATUS_TABS.ALL]: relevantSnapshots.length,
      [STATUS_TABS.READY_TO_TAX]: 0,
      [STATUS_TABS.IN_TAX]: 0,
      [STATUS_TABS.TAX_COMPLETED]: 0,
      [STATUS_TABS.INVOICED]: 0,
    };
    relevantSnapshots.forEach((s) => {
      counts[getStatusGroup(s.status)] += 1;
    });
    return counts;
  }, [relevantSnapshots]);

  // KPI cards double as status filters
  const kpiCards = [
    { key: STATUS_TABS.ALL, label: "Total Snapshots", icon: Layers, color: "bg-[#0A0082] text-white" },
    { key: STATUS_TABS.READY_TO_TAX, label: "Ready for Tax", icon: CheckCircle2, color: "bg-emerald-600 text-white" },
    { key: STATUS_TABS.IN_TAX, label: "In Tax", icon: Clock, color: "bg-amber-500 text-white" },
    { key: STATUS_TABS.TAX_COMPLETED, label: "Tax Completed", icon: CheckCircle2, color: "bg-blue-600 text-white" },
    { key: STATUS_TABS.INVOICED, label: "Invoiced", icon: FileText, color: "bg-indigo-600 text-white" },
  ];

  const statusFilterOptions = [
    { value: STATUS_TABS.ALL, label: `All Statuses (${tabCounts.ALL})` },
    { value: STATUS_TABS.READY_TO_TAX, label: `Ready for Tax (${tabCounts.READY_TO_TAX})` },
    { value: STATUS_TABS.IN_TAX, label: `In Tax (${tabCounts.IN_TAX})` },
    { value: STATUS_TABS.TAX_COMPLETED, label: `Tax Completed (${tabCounts.TAX_COMPLETED})` },
    { value: STATUS_TABS.INVOICED, label: `Invoiced (${tabCounts.INVOICED})` },
  ];

  const regionFilterOptions = useMemo(() => {
    const regions = Array.from(
      new Set(relevantSnapshots.map((s) => s.taxRegion).filter(Boolean))
    );
    return [
      { value: "ALL", label: "All Tax Regions" },
      ...regions.map((r) => ({ value: r, label: r })),
    ];
  }, [relevantSnapshots]);

  const handleKpiClick = (key) => {
    if (key === STATUS_TABS.ALL) {
      setStatusTab(STATUS_TABS.ALL);
    } else {
      setStatusTab((prev) => (prev === key ? STATUS_TABS.ALL : key));
    }
    setCurrentPage(1);
  };

  const handleStatusChange = (value) => {
    setStatusTab(value);
    setCurrentPage(1);
  };

  const handleRegionChange = (value) => {
    setRegionFilter(value);
    setCurrentPage(1);
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab, regionFilter, searchQuery]);

  const filteredSnapshots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return relevantSnapshots.filter((s) => {
      if (statusTab !== STATUS_TABS.ALL && getStatusGroup(s.status) !== statusTab) return false;
      if (regionFilter !== "ALL" && s.taxRegion !== regionFilter) return false;

      if (q) {
        const haystack = [s.projectName, s.projectCode, s.client, s.snapshotNumber]
          .map((v) => (v || "").toLowerCase());
        if (!haystack.some((v) => v.includes(q))) return false;
      }
      return true;
    });
  }, [relevantSnapshots, statusTab, regionFilter, searchQuery]);

  const totalPages = Math.ceil(filteredSnapshots.length / PAGE_SIZE) || 1;
  const paginatedSnapshots = useMemo(
    () => filteredSnapshots.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredSnapshots, currentPage]
  );

  // Action handler
  const handleAction = (item) => {
    const snapId = item.snapshotId;

    if (!snapId) {
      showStatusToast("Billing snapshot information is unavailable. Please refresh the billing data.", "error");
      return;
    }

    if (getStatusGroup(item.status) === STATUS_TABS.INVOICED) {
      navigate(`/account-receivable/invoices/${snapId}`, {
        state: { config: item.config },
      });
      return;
    }

    // Tax Calculation detail page is where calculation is reviewed and executed
    navigate(`/account-receivable/tax-calculation/${snapId}`, {
      state: { config: item.config },
    });
  };

  // Three-dots menu items, one primary action per status
  const getActionItems = (item) => {
    if (!item.snapshotId) {
      return [
        {
          label: "Snapshot Unavailable",
          icon: <AlertCircle className="h-4 w-4" />,
          disabled: true,
          onClick: () => {},
        },
      ];
    }

    switch (getStatusGroup(item.status)) {
      case STATUS_TABS.IN_TAX:
        return [
          {
            label: "Calculation in Progress",
            icon: <Loader2 className="h-4 w-4 animate-spin" />,
            disabled: true,
            onClick: () => {},
          },
        ];
      case STATUS_TABS.TAX_COMPLETED:
        return [
          {
            label: "Generate Invoice",
            icon: <FileText className="h-4 w-4" />,
            onClick: () => handleAction(item),
          },
        ];
      case STATUS_TABS.INVOICED:
        return [
          {
            label: "View Invoice",
            icon: <FileText className="h-4 w-4" />,
            onClick: () => handleAction(item),
          },
        ];
      default:
        return [
          {
            label: "Calculate Tax",
            icon: <Calculator className="h-4 w-4" />,
            onClick: () => handleAction(item),
          },
        ];
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader size="lg" text="Loading Tax Calculation Console..." />
      </div>
    );
  }

  const hasAnyOccurrences =
    readyOccurrences.length > 0 ||
    upcomingOccurrences.length > 0 ||
    processedOccurrences.length > 0 ||
    invoicedOccurrences.length > 0;

  // Genuine empty state: zero relevant snapshots AND zero billing occurrences
  if (!loading && relevantSnapshots.length === 0 && !occLoading && !hasAnyOccurrences) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="Tax Calculation"
          subtitle="Calculate and review tax for acquired billing snapshots."
          action={
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />

        <PageCard>
          <PageCardContent className="p-12 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Calculator className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-800">
                No Billing Snapshots in Tax Calculation Workspace
              </h3>
              <p className="text-sm text-slate-500">
                Acquire and validate billing data before starting tax calculation.
              </p>
            </div>
            <div className="pt-3">
              <Button
                onClick={() => navigate(ACQUISITION_PATH)}
                className="bg-[#0A0082] text-white hover:bg-[#0A0082]/90 font-semibold px-6 py-2.5"
              >
                Go to Billing Data Acquisition
              </Button>
            </div>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  const tableRows = paginatedSnapshots.map((item) => ({
    onRowClick: () => handleAction(item),
    client: <span className="font-semibold text-slate-800">{item.client}</span>,
    project: (
      <div className="text-left">
        <div className="font-bold text-slate-900">{item.projectName}</div>
        <div className="text-xs font-mono text-slate-400">{item.projectCode}</div>
      </div>
    ),
    snapshotNumber: item.snapshotNumber ? (
      <span className="font-mono font-semibold text-indigo-700">{item.snapshotNumber}</span>
    ) : (
      <span className="text-xs text-slate-400 italic">Not available</span>
    ),
    billingPeriod: <span className="font-medium text-slate-700">{item.billingPeriod}</span>,
    taxRegion: <span className="font-medium text-slate-800">{item.taxRegion}</span>,
    taxableAmount: (
      <span className="font-mono font-bold text-slate-900">
        {item.currency} {Number(item.taxableAmount || 0).toLocaleString()}
      </span>
    ),
    status: <StatusBadge label={item.status === "CALCULATED" ? "TAX_COMPLETED" : item.status} size="sm" />,
    action: <ActionMenu items={getActionItems(item)} />,
  }));

  return (
    <div className="w-full space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Tax Calculation"
        subtitle="Calculate and review tax for acquired billing snapshots and billing occurrences."
        action={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* 2. KPI Cards — click to filter, click the active card again to clear */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => handleKpiClick(kpi.key)}
            title={`Filter by ${kpi.label}`}
            className="text-left rounded-xl transition-transform active:scale-[0.99] focus:outline-none"
          >
            <KPICard
              label={kpi.label}
              value={loading ? "…" : tabCounts[kpi.key]}
              icon={<kpi.icon className="h-5 w-5" />}
              color={kpi.color}
              active={statusTab === kpi.key}
              className="h-full w-full cursor-pointer bg-white shadow-sm border border-slate-200 transition-all hover:shadow-md"
            />
          </button>
        ))}
      </div>

      {/* 3. Time & Material — Billing Snapshot Queue */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Time &amp; Material — Billing Snapshots
      </h2>
      <PageCard>
        <PageCardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-md">
              <SearchInput
                value={searchQuery}
                onChange={handleSearchInputChange}
                onSearch={(val) => setSearchQuery(val)}
                placeholder="Search by project, client, or snapshot number..."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-48 sm:w-52">
                <FilterListbox
                  options={statusFilterOptions}
                  value={statusTab}
                  onChange={handleStatusChange}
                  placeholder="Filter by Status"
                />
              </div>
              <div className="w-48 sm:w-52">
                <FilterListbox
                  options={regionFilterOptions}
                  value={regionFilter}
                  onChange={handleRegionChange}
                  placeholder="Filter by Tax Region"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <ARTable
              headers={TABLE_HEADERS}
              columns={TABLE_COLUMNS}
              rows={tableRows}
              loading={loading}
              emptyMessage="No billing snapshots match your current filters."
            />
            {!loading && filteredSnapshots.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              />
            )}
          </div>
        </PageCardContent>
      </PageCard>

      {/* 4. Fixed Price / Recurring — Billing Occurrences */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Ready for Tax Calculation — Fixed Price &amp; Recurring
        </h2>
        {occLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader size="sm" text="Loading billing occurrences..." />
          </div>
        ) : readyOccurrences.length === 0 ? (
          <PageCard>
            <PageCardContent className="py-6 text-center text-sm text-slate-500">
              No billing occurrences are currently pending tax calculation.
            </PageCardContent>
          </PageCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {readyOccurrences.map((occurrence) => (
              <BillingOccurrenceCard
                key={occurrence.billingScheduleId}
                occurrence={occurrence}
                variant="ready"
                onOpenTaxCalculation={handleOpenOccurrenceTaxCalculation}
                onCalculateTax={handleOpenOccurrenceTaxCalculation}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Upcoming Billing Occurrences
        </h2>
        {occLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader size="sm" text="Loading billing occurrences..." />
          </div>
        ) : upcomingOccurrences.length === 0 ? (
          <PageCard>
            <PageCardContent className="py-6 text-center text-sm text-slate-500">
              No upcoming billing occurrences are scheduled.
            </PageCardContent>
          </PageCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingOccurrences.map((occurrence) => (
              <BillingOccurrenceCard key={occurrence.billingScheduleId} occurrence={occurrence} variant="upcoming" />
            ))}
          </div>
        )}
      </div>

      {processedOccurrences.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Processed Billing Occurrences
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {processedOccurrences.map((occurrence) => (
              <BillingOccurrenceCard
                key={occurrence.billingScheduleId}
                occurrence={occurrence}
                variant="processed"
                onView={handleViewOccurrence}
              />
            ))}
          </div>
        </div>
      )}

      {invoicedOccurrences.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Invoiced Billing Occurrences
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {invoicedOccurrences.map((occurrence) => (
              <BillingOccurrenceCard
                key={occurrence.billingScheduleId}
                occurrence={occurrence}
                variant="invoiced"
                onView={handleViewOccurrence}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}