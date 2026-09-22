import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  Inbox,
  Loader2,
  Filter,
  FileText,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { KPICard } from "../../../../components/kpi/KPI";
import SearchInput from "../../../../components/filter/Searchbar";
import Button from "../../../../components/Button/Button";
import Loader from "../../../../components/ui/Loader";
import StatusBadge from "../../../../components/status/statusbadge";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ARTable from "../common/ARTable";

import {
  fetchActiveBillingConfigurations,
  getBillingSnapshotByPeriod,
  getAcquiredSnapshotMetadata,
  formatBillingPeriod,
} from "../../services/billingDataAcquisitionService";
import {
  calculateTax,
  getTaxCalculation,
  getTaxCalculationErrorMessage,
} from "../../services/taxCalculationService";
import { getInvoice } from "../../services/invoiceService";
import { getActiveTaxRegions } from "../../services/taxRateConfigurationService";
import {
  getBillingOccurrences,
} from "../../services/billingOccurrenceService";
import BillingOccurrenceCard from "./BillingOccurrenceCard";

const ACQUISITION_PATH = "/account-receivable/billing-data-acquisition";
const OCCURRENCE_DETAIL_BASE = "/account-receivable/tax-calculation/occurrence";

export default function TaxCalculationConsole() {
  const navigate = useNavigate();

  const [snapshots, setSnapshots] = useState([]);
  const [taxRegions, setTaxRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calculatingIds, setCalculatingIds] = useState({});

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");

  // KPI card definitions (mirrors BillingApprovals pattern)
  const kpiCardDefs = [
    { key: "ALL", label: "Total Snapshots", icon: Layers, color: "bg-[#0A0082] text-white" },
    { key: "READY_TO_TAX", label: "Ready for Tax", icon: CheckCircle2, color: "bg-emerald-600 text-white" },
    { key: "IN_TAX", label: "In Tax", icon: Clock, color: "bg-amber-500 text-white" },
    { key: "TAX_COMPLETED", label: "Tax Completed", icon: CheckCircle2, color: "bg-blue-600 text-white" },
    { key: "INVOICED", label: "Invoiced", icon: FileText, color: "bg-indigo-600 text-white" },
  ];

  const handleKpiClick = (kpiKey) => {
    if (kpiKey === "ALL") {
      setStatusFilter("ALL");
    } else {
      setStatusFilter((prev) => (prev === kpiKey ? "ALL" : kpiKey));
    }
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setLoading(true);

    try {
      // This table is the Time & Material billing-snapshot queue only --
      // Fixed Price/Recurring occurrences are loaded separately below via
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

            if (snapshotId && (snapshotStatus === "TAX_COMPLETED" || snapshotStatus === "IN_TAX" || snapshotStatus === "INVOICED" || existingSnapshot)) {
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
      setTaxRegions(regionsList);

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

  // Filter population down to relevant tax snapshot candidates (persistent workspace)
  const relevantSnapshots = useMemo(() => {
    return snapshots.filter((s) => {
      const st = (s.status || "").toUpperCase();
      return (
        st === "READY_TO_TAX" ||
        st === "READY_FOR_TAX" ||
        st === "READY" ||
        st === "IN_TAX" ||
        st === "TAX_COMPLETED" ||
        st === "CALCULATED" ||
        st === "INVOICED"
      );
    });
  }, [snapshots]);

  // Executive KPI Card Counts
  const kpis = useMemo(() => {
    let readyToTax = 0;
    let inTax = 0;
    let taxCompleted = 0;
    let invoiced = 0;

    relevantSnapshots.forEach((s) => {
      const st = (s.status || "").toUpperCase();
      if (st === "READY_TO_TAX" || st === "READY_FOR_TAX" || st === "READY") readyToTax++;
      else if (st === "IN_TAX") inTax++;
      else if (st === "TAX_COMPLETED" || st === "CALCULATED") taxCompleted++;
      else if (st === "INVOICED") invoiced++;
    });

    return {
      totalSnapshots: relevantSnapshots.length,
      readyToTax,
      inTax,
      taxCompleted,
      invoiced,
    };
  }, [relevantSnapshots]);

  // Filtered Queue
  const filteredSnapshots = useMemo(() => {
    return relevantSnapshots.filter((s) => {
      const st = (s.status || "").toUpperCase();

      // Status filter
      if (statusFilter === "READY_TO_TAX") {
        if (st !== "READY_TO_TAX" && st !== "READY_FOR_TAX" && st !== "READY") return false;
      } else if (statusFilter === "IN_TAX") {
        if (st !== "IN_TAX") return false;
      } else if (statusFilter === "TAX_COMPLETED") {
        if (st !== "TAX_COMPLETED" && st !== "CALCULATED") return false;
      } else if (statusFilter === "INVOICED") {
        if (st !== "INVOICED") return false;
      }

      // Region filter
      if (regionFilter !== "ALL") {
        if (s.taxRegion !== regionFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = (s.projectName || "").toLowerCase();
        const pCode = (s.projectCode || "").toLowerCase();
        const client = (s.client || "").toLowerCase();
        const snapNum = (s.snapshotNumber || "").toLowerCase();

        if (
          !pName.includes(q) &&
          !pCode.includes(q) &&
          !client.includes(q) &&
          !snapNum.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [relevantSnapshots, statusFilter, regionFilter, searchQuery]);

  // Unique Tax Regions for Filter list
  const uniqueRegions = useMemo(() => {
    const set = new Set();
    relevantSnapshots.forEach((s) => {
      if (s.taxRegion) set.add(s.taxRegion);
    });
    return Array.from(set);
  }, [relevantSnapshots]);

  // Action button handler
  const handleAction = (item) => {
    const snapId = item.snapshotId;

    if (!snapId) {
      showStatusToast("Billing snapshot information is unavailable. Please refresh the billing data.", "error");
      return;
    }

    const st = (item.status || "").toUpperCase();
    if (st === "INVOICED") {
      navigate(`/account-receivable/invoices/${snapId}`, {
        state: { config: item.config },
      });
      return;
    }

    // Always navigate to the Tax Calculation detail page where calculation is reviewed and executed
    navigate(`/account-receivable/tax-calculation/${snapId}`, {
      state: { config: item.config },
    });
  };

  const renderActionButton = (item) => {
    const st = (item.status || "").toUpperCase();
    const snapId = item.snapshotId;
    const isCalculating = calculatingIds[snapId];

    if (!snapId) {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled
          className="text-xs text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed"
          title="Billing snapshot information is unavailable. Please refresh the billing data."
        >
          <Calculator className="mr-1.5 h-3.5 w-3.5" />
          Snapshot Unavailable
        </Button>
      );
    }

    if (isCalculating) {
      return (
        <Button size="sm" variant="primary" disabled className="bg-amber-600 border-amber-600 text-white text-xs">
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          Calculating Tax...
        </Button>
      );
    }

    if (st === "IN_TAX") {
      return (
        <Button size="sm" variant="outline" disabled className="text-xs text-amber-700 bg-amber-50 border-amber-200">
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          Calculation in Progress
        </Button>
      );
    }

    if (st === "INVOICED") {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleAction(item);
          }}
          className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold"
        >
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          View Invoice
        </Button>
      );
    }

    if (st === "TAX_COMPLETED" || st === "CALCULATED") {
      return (
        <Button
          size="sm"
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            handleAction(item);
          }}
          className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold"
        >
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          View Invoice Generation
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant="primary"
        onClick={(e) => {
          e.stopPropagation();
          handleAction(item);
        }}
        className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white text-xs font-semibold"
      >
        <Calculator className="mr-1.5 h-3.5 w-3.5" />
        Calculate Tax
      </Button>
    );
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

  // Genuine Empty State (when zero relevant snapshots AND zero billing occurrences exist)
  if (!loading && relevantSnapshots.length === 0 && !occLoading && !hasAnyOccurrences) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="Tax Calculation"
          subtitle="Calculate and review tax for acquired billing snapshots."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadData(true);
                loadOccurrences();
              }}
              disabled={refreshing}
            >
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

  const tableHeaders = [
    "Client",
    "Project",
    "Snapshot Number",
    "Billing Period",
    "Tax Region",
    "Commercial Amount",
    "Status",
    "Action",
  ];

  const tableColumns = [
    "client",
    "project",
    "snapshotNumber",
    "billingPeriod",
    "taxRegion",
    "taxableAmount",
    "status",
    "action",
  ];

  const tableRows = filteredSnapshots.map((item) => ({
    onRowClick: () => {
      if (!item.snapshotId) {
        showStatusToast("Billing snapshot information is unavailable. Please refresh the billing data.", "error");
        return;
      }
      handleAction(item);
    },
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
    action: renderActionButton(item),
  }));

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <PageHeader
        title="Tax Calculation"
        subtitle="Calculate and review tax for acquired billing snapshots and billing occurrences."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadData(true);
              loadOccurrences();
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {kpiCardDefs.map((kpi) => {
          const isActive =
            statusFilter === kpi.key ||
            (statusFilter === "ALL" && kpi.key === "ALL");

          const kpiValue =
            kpi.key === "ALL" ? kpis.totalSnapshots
            : kpi.key === "READY_TO_TAX" ? kpis.readyToTax
            : kpi.key === "IN_TAX" ? kpis.inTax
            : kpi.key === "TAX_COMPLETED" ? kpis.taxCompleted
            : kpis.invoiced;

          return (
            <button
              key={kpi.key}
              type="button"
              onClick={() => handleKpiClick(kpi.key)}
              title={`Filter by ${kpi.label}`}
              className="text-left rounded-xl transition-transform active:scale-[0.99] focus:outline-none"
            >
              <KPICard
                label={kpi.label}
                value={loading ? "…" : kpiValue}
                icon={<kpi.icon className="h-5 w-5" />}
                color={kpi.color}
                active={isActive}
                className="h-full w-full cursor-pointer bg-white shadow-sm border border-slate-200 transition-all hover:shadow-md"
              />
            </button>
          );
        })}
      </div>

      {/* Time & Material — Billing Snapshot Queue & Filters */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Time &amp; Material — Billing Snapshots
      </h2>
      <PageCard>
        <PageCardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-md">
                <SearchInput
                value={searchQuery}
                onChange={handleSearchInputChange}
                onSearch={(val) => setSearchQuery(val)}
                placeholder="Search by project, code, or client..."
                />
          </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Filter className="h-3.5 w-3.5" /> Filter:
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Statuses ({relevantSnapshots.length})</option>
                <option value="READY_TO_TAX">Ready for Tax ({kpis.readyToTax})</option>
                <option value="IN_TAX">In Tax ({kpis.inTax})</option>
                <option value="TAX_COMPLETED">Tax Completed ({kpis.taxCompleted})</option>
                <option value="INVOICED">Invoiced ({kpis.invoiced})</option>
              </select>

              {/* Region Filter */}
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Tax Regions</option>
                {uniqueRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AR Table */}
          <ARTable
            headers={tableHeaders}
            columns={tableColumns}
            rows={tableRows}
            loading={loading}
            emptyMessage="No billing snapshots match your current filters."
          />
        </PageCardContent>
      </PageCard>

      {/* Fixed Price / Recurring — Billing Occurrences */}
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
