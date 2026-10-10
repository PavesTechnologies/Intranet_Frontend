import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  CheckCircle2,
  CalendarClock,
  Layers,
  FileText,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import ARKPICard from "../common/ARKPICard";
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
  countPipelineStages,
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

const KPI_CARDS = [
  { key: ALL, label: "Total", icon: Layers, color: "bg-[#0A0082] text-white" },
  { key: PIPELINE_STAGES.UPCOMING, label: "Upcoming", icon: CalendarClock, color: "bg-slate-500 text-white" },
  { key: PIPELINE_STAGES.READY_FOR_TAX, label: "Ready for Tax", icon: Calculator, color: "bg-amber-500 text-white" },
  { key: PIPELINE_STAGES.TAX_CALCULATED, label: "Tax Calculated", icon: CheckCircle2, color: "bg-indigo-600 text-white" },
  { key: PIPELINE_STAGES.INVOICED, label: "Invoiced", icon: FileText, color: "bg-emerald-600 text-white" },
];

export default function TaxCalculationConsole() {
  const navigate = useNavigate();

  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stage, setStage] = useState(ALL);

  // Billing Occurrences — Milestone Plan / Recurring records feeding this
  // same Tax Calculation workspace. Every occurrence's stage comes from
  // getTaxPipelineStatus on its own fields, never from the query it was
  // fetched by.
  const [occLoading, setOccLoading] = useState(true);
  const [occurrences, setOccurrences] = useState([]);

  const loadOccurrences = async () => {
    setOccLoading(true);
    try {
      // periodStatus is the occurrence's own lifecycle (SCHEDULED ->
      // TAX_PENDING -> TAX_CALCULATED, advanced only by the backend
      // scheduler). The list endpoint has no invoice filter, so invoiced
      // occurrences arrive inside these lists and are told apart by their
      // isInvoiced field.
      const lists = await Promise.all(
        ["SCHEDULED", "TAX_PENDING", "TAX_CALCULATED"].map((periodStatus) =>
          getBillingOccurrences({ periodStatus }).catch(() => [])
        )
      );

      const byId = new Map();
      lists.flat().forEach((o) => {
        if (o?.billingScheduleId) byId.set(o.billingScheduleId, o);
      });
      setOccurrences(Array.from(byId.values()));
    } catch (err) {
      console.error("[TaxCalculationConsole] Error loading occurrences:", err);
    } finally {
      setOccLoading(false);
    }
  };

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [allConfigs, regionsList] = await Promise.all([
        fetchActiveBillingConfigurations().catch(() => []),
        getActiveTaxRegions().catch(() => []),
      ]);

      // Tax Calculation Console is scoped to Time & Material configurations;
      // Fixed Price / Milestone Plan and Recurring Billing have their own
      // schedules/occurrences.
      const configs = allConfigs.filter((cfg) => cfg.billingTypeCode === "TIME_MATERIAL");

      const loadedSnapshots = (
        await Promise.all(
          configs.map(async (cfg) => {
            const savedMeta = cfg.projectId
              ? getAcquiredSnapshotMetadata(cfg.projectId, cfg.billingConfigurationId)
              : null;
            const isMatchingConfig =
              cfg.billingConfigurationId && savedMeta?.billingConfigurationId
                ? String(savedMeta.billingConfigurationId) === String(cfg.billingConfigurationId)
                : !cfg.billingConfigurationId && Boolean(savedMeta);
            const validMeta = isMatchingConfig ? savedMeta : null;

            let snapStart =
              cfg.billingPeriodStart ||
              validMeta?.billingPeriodStart ||
              cfg.periodStart ||
              null;
            let snapEnd =
              cfg.billingPeriodEnd ||
              validMeta?.billingPeriodEnd ||
              cfg.periodEnd ||
              null;

            let existingSnapshot = null;
            if (cfg.projectId && snapStart && snapEnd) {
              existingSnapshot = await getBillingSnapshotByPeriod(
                cfg.projectId,
                snapStart,
                snapEnd,
                cfg.billingConfigurationId
              ).catch(() => null);
            }

            let snapshotId =
              existingSnapshot?.snapshotId ||
              validMeta?.snapshotId ||
              cfg.snapshotId ||
              null;
            let snapshotNumber =
              existingSnapshot?.snapshotNumber ||
              validMeta?.snapshotNumber ||
              cfg.snapshotNumber ||
              null;
            let snapshotStatus =
              existingSnapshot?.status ||
              validMeta?.status ||
              (snapshotId ? "READY_FOR_TAX" : cfg.billingStatus || "NOT_ACQUIRED");
            let taxableAmount = existingSnapshot?.totalAmount ?? null;
            let totalTaxAmount = null;
            let grandTotal = null;
            let taxRegionName = cfg.taxRegionName || cfg.taxRegion || null;
            let invoiceId = null;

            if (cfg.projectId) {
              const savedMeta = getAcquiredSnapshotMetadata(cfg.projectId);
              if (savedMeta) {
                if (savedMeta.snapshotId) snapshotId = savedMeta.snapshotId;
                if (savedMeta.snapshotNumber) snapshotNumber = savedMeta.snapshotNumber;
                if (savedMeta.status) snapshotStatus = savedMeta.status;
                if (savedMeta.periodStart) snapStart = savedMeta.periodStart;
                if (savedMeta.periodEnd) snapEnd = savedMeta.periodEnd;
              }
            }

            if (snapshotId) {
              const taxCalcData = await getTaxCalculation(snapshotId).catch(() => null);
              if (taxCalcData) {
                const tStatus = (taxCalcData.status || "").toUpperCase();
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

              // Invoiced only when the backend returns a persisted invoice for
              // this snapshot — a stored/snapshot status of "INVOICED" is not proof.
              const invData = await getInvoice(snapshotId).catch(() => null);
              if (invData?.invoiceId) invoiceId = invData.invoiceId;
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
              invoiceId,
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

  // One display model for every billing type — T&M snapshots and billing
  // occurrences become identical pipeline records.
  const records = useMemo(
    () =>
      [
        ...snapshots.map(toSnapshotPipelineRecord).filter(Boolean),
        ...occurrences.map(toOccurrencePipelineRecord),
      ].sort(comparePipelineRecords),
    [snapshots, occurrences]
  );

  const stageCounts = useMemo(() => countPipelineStages(records), [records]);

  const pipelineLoading = (loading && !refreshing) || occLoading;

  // KPI cards double as stage filters; clicking the active card clears it.
  const handleKpiClick = (key) => {
    setStage((prev) => (key === ALL || prev === key ? ALL : key));
  };

  /* ---------------------------- Row actions ---------------------------- */

  const openSnapshotTax = (snapshot) =>
    navigate(`/account-receivable/tax-calculation/${snapshot.snapshotId}`, {
      state: { config: snapshot.config, from: "tax-calculation-console" },
    });

  const openOccurrenceTax = (occurrence) =>
    navigate(`${OCCURRENCE_DETAIL_BASE}/${occurrence.billingScheduleId}`, {
      state: { occurrence, from: "tax-calculation-console" },
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
      />

      {/* 2. KPI Cards — counts come from the same records the pipeline renders */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_CARDS.map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => handleKpiClick(kpi.key)}
            title={`Show ${kpi.label}`}
            className="w-full rounded-xl text-left transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <ARKPICard
              label={kpi.label}
              value={pipelineLoading ? "…" : stageCounts[kpi.key]}
              icon={<kpi.icon className="h-5 w-5" />}
              color={kpi.color}
              active={stage === kpi.key}
              className="h-full w-full"
            />
          </button>
        ))}
      </div>

      {/* 3. Billing Tax Pipeline — one table for every billing type and stage */}
      <BillingTaxPipeline
        records={records}
        loading={pipelineLoading}
        stage={stage}
        onStageChange={setStage}
        getRowAction={getRowAction}
      />
    </div>
  );
}

