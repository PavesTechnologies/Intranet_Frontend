import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import PageHeader from "../../../components/ui/PageHeader";
import Loader from "../../../components/ui/Loader";
import { showStatusToast } from "../../../components/toastfy/toast";

import { fetchActiveBillingConfigurations, getBillingSnapshotByPeriod } from "../services/billingDataAcquisitionService";

import AcquisitionHeader from "../components/acquisition/AcquisitionHeader";
import AcquisitionMetrics from "../components/acquisition/AcquisitionMetrics";
import AcquisitionQueue from "../components/acquisition/AcquisitionQueue";
import EmptyWorkspaceState from "../components/acquisition/EmptyWorkspaceState";
import AcquisitionTimeline from "../components/acquisition/AcquisitionTimeline";

export default function BillingDataAcquisition() {
  const navigate = useNavigate();

  const [activeConfigs, setActiveConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("");

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
      const configs = await fetchActiveBillingConfigurations();

      // Batch query existing snapshots for configurations
      const updatedConfigs = await Promise.all(
        configs.map(async (cfg) => {
          if (cfg.projectId && cfg.periodStart && cfg.periodEnd) {
            const existingSnapshot = await getBillingSnapshotByPeriod(
              cfg.projectId,
              cfg.periodStart,
              cfg.periodEnd
            );
            if (existingSnapshot) {
              return {
                ...cfg,
                billingStatus: "READY",
                snapshotNumber: existingSnapshot.snapshotNumber,
                snapshotId: existingSnapshot.snapshotId,
                existingSnapshot,
              };
            }
          }
          return cfg;
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

      {/* KPI Metrics Summary */}
      <AcquisitionMetrics configs={activeConfigs} loading={loadingConfigs} />

      {/* Acquisition Queue — full-width, scalable enterprise table */}
      <AcquisitionQueue
        configs={activeConfigs}
        onViewConfig={handleViewConfig}
        loading={loadingConfigs}
      />

      {/* Guidance + pending worklist — the detail for a selected record now lives on its own page */}
      <EmptyWorkspaceState configs={activeConfigs} onViewConfig={handleViewConfig} />

      {/* Bottom Operational Audit Timeline — compact, collapsed by default */}
      <AcquisitionTimeline />
    </div>
  );
}
