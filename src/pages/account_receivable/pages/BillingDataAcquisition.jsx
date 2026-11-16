import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import PageHeader from "../../../components/ui/PageHeader";
import Loader from "../../../components/ui/Loader";
import { showStatusToast } from "../../../components/toastfy/toast";

import {
  fetchActiveBillingConfigurations,
  getBillingSnapshotByPeriod,
  getAcquiredSnapshotMetadata,
  clearAcquiredSnapshotMetadata,
  formatBillingPeriod,
  toIsoDateOnly,
  normalizeAcquisitionStatus,
} from "../services/billingDataAcquisitionService";

import AcquisitionHeader from "../components/acquisition/AcquisitionHeader";
import AcquisitionMetrics from "../components/acquisition/AcquisitionMetrics";
import AcquisitionQueue from "../components/acquisition/AcquisitionQueue";

export default function BillingDataAcquisition() {
  const navigate = useNavigate();

  const [activeConfigs, setActiveConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("");

  // Centralized filter state shared between KPI cards and Acquisition Queue
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);

    const now = new Date();
    const formatted =
      now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " " +
      now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    setLastSyncTime(formatted);

    try {
      // Fixed Price and Recurring billing configurations flow through
      // Billing Occurrence -> Tax Calculation, never through Data
      // Acquisition -- fetchActiveBillingConfigurations() returns every
      // active configuration regardless of billing type, so this console
      // (Timesheet/T&M only) must filter down to TIME_MATERIAL itself.
      const allConfigs = await fetchActiveBillingConfigurations();
      const configs = allConfigs.filter((cfg) => cfg.billingTypeCode === "TIME_MATERIAL");

      // Batch query existing snapshots using the actual acquired snapshot period
      const updatedConfigs = await Promise.all(
        configs.map(async (cfg) => {
          if (!cfg.projectId) return cfg;

          const isNotAcquired = String(cfg.billingStatus || "").trim().toUpperCase() === "NOT_ACQUIRED";
          if (isNotAcquired) {
            // Authoritative backend rule: NOT_ACQUIRED configurations must never query or populate acquired snapshot data
            clearAcquiredSnapshotMetadata(cfg.projectId);
            return {
              ...cfg,
              billingStatus: "NOT_ACQUIRED",
              billingPeriodStart: null,
              billingPeriodEnd: null,
              billingPeriod: "—",
              periodStart: "",
              periodEnd: "",
              snapshotId: null,
              snapshotNumber: null,
              existingSnapshot: null,
            };
          }

          // Check if there is an acquired snapshot period for this genuinely acquired project
          const savedMeta = getAcquiredSnapshotMetadata(cfg.projectId);
          const snapStart = cfg.billingPeriodStart || savedMeta?.billingPeriodStart || null;
          const snapEnd = cfg.billingPeriodEnd || savedMeta?.billingPeriodEnd || null;

          // CRITICAL: Only query by-period if we have the actual acquired snapshot period.
          // Do NOT call by-period using the project configuration period.
          if (snapStart && snapEnd) {
            const existingSnapshot = await getBillingSnapshotByPeriod(
              cfg.projectId,
              snapStart,
              snapEnd
            );
            if (existingSnapshot && existingSnapshot.snapshotId) {
              const effectiveStatus = existingSnapshot.status || savedMeta?.status || cfg.billingStatus || "READY_FOR_TAX";
              const actualStart = existingSnapshot.billingPeriodStart || snapStart;
              const actualEnd = existingSnapshot.billingPeriodEnd || snapEnd;
              const actualPeriod = existingSnapshot.billingPeriod || formatBillingPeriod(actualStart, actualEnd);

              return {
                ...cfg,
                billingStatus: effectiveStatus,
                snapshotNumber: existingSnapshot.snapshotNumber,
                snapshotId: existingSnapshot.snapshotId,
                snapshotPeriodStart: actualStart,
                snapshotPeriodEnd: actualEnd,
                billingPeriodStart: actualStart,
                billingPeriodEnd: actualEnd,
                billingPeriod: actualPeriod,
                existingSnapshot,
              };
            }
          }
          return {
            ...cfg,
            billingStatus: normalizeAcquisitionStatus(cfg.billingStatus, false),
          };
        })
      );

      setActiveConfigs(updatedConfigs);
      if (isManualRefresh) {
        showStatusToast("Acquisition console synchronized with source systems.", "success");
      }
    } catch (err) {
      console.error("[BillingDataAcquisition] Load error:", err);
    } finally {
      setLoadingConfigs(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleViewConfig = (config) => {
    navigate(`/account-receivable/billing-data-acquisition/${config.projectId}`, { state: { config } });
  };

  const handleClearFilters = () => {
    setSelectedStatusFilter("ALL");
    setSearchQuery("");
  };

  if (loadingConfigs) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Billing Data Acquisition Console"
        subtitle="Manage source data acquisition, review billing snapshots, and prepare commercial records for invoicing."
        actions={
          <AcquisitionHeader
            lastSync={lastSyncTime}
            onRefresh={() => loadData(true)}
            refreshing={refreshing}
          />
        }
      />

      {/* KPI Metrics Summary (Interactive cards synchronized with Queue filter) */}
      <AcquisitionMetrics
        configs={activeConfigs}
        loading={loadingConfigs}
        selectedStatusFilter={selectedStatusFilter}
        onSelectStatusFilter={setSelectedStatusFilter}
      />

      {/* Acquisition Queue — full-width, scalable enterprise table */}
      <AcquisitionQueue
        configs={activeConfigs}
        onViewConfig={handleViewConfig}
        loading={loadingConfigs}
        selectedStatusFilter={selectedStatusFilter}
        onStatusFilterChange={setSelectedStatusFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
