import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  RefreshCw,
  CheckCircle2,
  CalendarClock,
  Layers,
  FileText,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import { KPICard } from "../../../../components/kpi/KPI";
import Button from "../../../../components/Button/Button";
import { showStatusToast } from "../../../../components/toastfy/toast";

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
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_ORDER,
  toSnapshotPipelineRecord,
  toOccurrencePipelineRecord,
  comparePipelineRecords,
} from "../../utils/taxPipeline";
import BillingTaxPipeline from "./BillingTaxPipeline";

/* ------------------------------------------------------------------ */
/* Global constants                                                    */
/* ------------------------------------------------------------------ */

const OCCURRENCE_DETAIL_BASE = "/account-receivable/tax-calculation/occurrence";
const ALL = "ALL";

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
  "Actions",
];

const TABLE_COLUMNS = [
  "client",
  "project",
  "snapshotNumber",
  "billingPeriod",
  "taxRegion",
  "taxableAmount",
  "status",
  "actions",
];

const TABLE_ALIGNMENTS = {
  client: "left",
  project: "left",
  snapshotNumber: "left",
  billingPeriod: "left",
  taxRegion: "left",
  taxableAmount: "left",
  status: "center",
  actions: "center",
};


const TABLE_HEADER_ALIGNMENTS = {
  client: "center",
  project: "center",
  snapshotNumber: "center",
  billingPeriod: "center",
  taxRegion: "center",
  taxableAmount: "center",
  status: "center",
  actions: "center",
};



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
  const [stage, setStage] = useState(ALL);

  // Billing Occurrences — Milestone Plan / Recurring records
  // feeding this same Tax Calculation workspace. Each bucket is fetched by the
  // exact backend status it represents; the frontend never re-derives
  // eligibility.
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
      // and calculate-tax eligibility are keyed on.
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

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setLoading(true);

    try {
      // Time & Material billing snapshots only -- Milestone Plan/Recurring
      // occurrences are loaded separately via getBillingOccurrences().
      // fetchActiveBillingConfigurations() returns every active configuration
      // regardless of billing type, so it must be filtered down here the same
      // way Data Acquisition does.
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
            // Tax totals as returned by the backend tax engine, when calculated.
            let totalTaxAmount = null;
            let grandTotal = null;

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
                totalTaxAmount = taxCalcData.totalTaxAmount ?? null;
                grandTotal = taxCalcData.grandTotal ?? null;
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
              billingDate: existingSnapshot?.billingDate || null,
              taxRegion: taxRegionName || "India",
              currency: cfg.currency || "USD",
              taxableAmount,
              totalTaxAmount,
              grandTotal,
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
    loadOccurrences();
  }, []);

  const handleRefresh = () => {
    loadData(true);
    loadOccurrences();
  };

  // One display model for every billing type — T&M snapshots and billing
  // occurrences become identical pipeline records.
  const records = useMemo(() => {
    const occurrenceBuckets = [
      [upcomingOccurrences, PIPELINE_STAGES.UPCOMING],
      [readyOccurrences, PIPELINE_STAGES.READY_FOR_TAX],
      [processedOccurrences, PIPELINE_STAGES.TAX_CALCULATED],
      [invoicedOccurrences, PIPELINE_STAGES.INVOICED],
    ];
    return [
      ...snapshots.map(toSnapshotPipelineRecord).filter(Boolean),
      ...occurrenceBuckets.flatMap(([list, bucketStage]) =>
        list.map((occ) => toOccurrencePipelineRecord(occ, bucketStage))
      ),
    ].sort(comparePipelineRecords);
  }, [snapshots, upcomingOccurrences, readyOccurrences, processedOccurrences, invoicedOccurrences]);

  const stageCounts = useMemo(() => {
    const counts = { [ALL]: records.length };
    PIPELINE_STAGE_ORDER.forEach((s) => {
      counts[s] = 0;
    });
    records.forEach((r) => {
      counts[r.stage] += 1;
    });
    return counts;
  }, [records]);

  const pipelineLoading = (loading && !refreshing) || occLoading;

  // KPI cards double as stage filters; clicking the active card clears it.
  const handleKpiClick = (key) => {
    setStage((prev) => (key === ALL || prev === key ? ALL : key));
  };

  /* ---------------------------- Row actions ---------------------------- */

  const openSnapshotTax = (snapshot) =>
    navigate(`/account-receivable/tax-calculation/${snapshot.snapshotId}`, {
      state: { config: snapshot.config },
    });

  const openOccurrenceTax = (occurrence) =>
    navigate(`${OCCURRENCE_DETAIL_BASE}/${occurrence.billingScheduleId}`, {
      state: { occurrence },
    });

  // One action per row: Calculate Tax where the record is ready for it,
  // otherwise View. Both open the record's Tax Calculation detail page, which
  // carries every follow-up action (invoice generation, view invoice).
  const getRowAction = (record) => {
    const open =
      record.source === "SNAPSHOT"
        ? () => {
            if (!record.original.snapshotId) {
              showStatusToast("Billing snapshot information is unavailable. Please refresh the billing data.", "error");
              return;
            }
            openSnapshotTax(record.original);
          }
        : () => openOccurrenceTax(record.original);

    if (record.stage === PIPELINE_STAGES.READY_FOR_TAX) {
      return { label: "Calculate Tax", emphasis: true, onClick: open };
    }
    return { label: "View", onClick: open };
  };

  return (
    <div className="w-full space-y-5">
      {/* 1. Page Header */}
      <PageHeader
        title="Tax Calculation"
        subtitle="Calculate and review tax for acquired billing snapshots and billing occurrences."
        actions={
          <Button variant="outline" size="small" onClick={handleRefresh} disabled={refreshing || occLoading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* 2. KPI Cards — counts come from the same records the pipeline renders */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_CARDS.map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => handleKpiClick(kpi.key)}
            title={`Show ${kpi.label}`}
            className="rounded-xl text-left outline-none focus:outline-none focus-visible:outline-none"
          >
            <KPICard
              label={kpi.label}
              value={pipelineLoading ? "…" : stageCounts[kpi.key]}
              icon={<kpi.icon className="h-5 w-5" />}
              color={kpi.color}
              active={stage === kpi.key}
              className="h-full w-full cursor-pointer bg-white shadow-sm border border-slate-200 transition-all hover:shadow-md !ring-0 !outline-none focus:!ring-0 focus:!outline-none focus-visible:!ring-0 focus-visible:!outline-none"
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
              alignments={TABLE_ALIGNMENTS}
              headerAlignments={TABLE_HEADER_ALIGNMENTS}
              loading={loading}
              emptyMessage={relevantSnapshots.length === 0 ? "No billing snapshots in tax calculation workspace." : "No billing snapshots match your current filters."}
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
