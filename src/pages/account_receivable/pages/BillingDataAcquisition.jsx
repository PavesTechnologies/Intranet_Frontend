import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Clock,
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import FormInput from "../../../components/forms/FormInput";
import { Fonts } from "../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../components/toastfy/toast";

import {
  fetchActiveBillingConfigurations,
  acquireBillingData,
  generateInvoiceDraft,
  getBillingSnapshotByPeriod,
} from "../services/billingDataAcquisitionService";

import AcquisitionHeader from "../components/acquisition/AcquisitionHeader";
import AcquisitionMetrics from "../components/acquisition/AcquisitionMetrics";
import AcquisitionQueue from "../components/acquisition/AcquisitionQueue";
import EmptyWorkspaceState from "../components/acquisition/EmptyWorkspaceState";
import SnapshotWorkspace from "../components/acquisition/SnapshotWorkspace";
import AcquisitionTimeline from "../components/acquisition/AcquisitionTimeline";

export default function BillingDataAcquisition() {
  const navigate = useNavigate();

  // Active state
  const [activeConfigs, setActiveConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("");

  // Selected project state (persist in console, null means unselected dashboard)
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [acquisitionResults, setAcquisitionResults] = useState(null);
  const [acquiring, setAcquiring] = useState(false);

  // Subview for draft invoice preview
  const [subView, setSubView] = useState("WORKSPACE");
  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Manual period modal
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // Gating modal
  const [showGatingModal, setShowGatingModal] = useState(false);

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

  const handleSelectConfigFromQueue = async (config) => {
    setSelectedConfig(config);

    // Bypasses date picker modal completely for view/selection
    const start = config.periodStart;
    const end = config.periodEnd;

    // Check if snapshot is cached or already acquired
    if (config.existingSnapshot) {
      setAcquisitionResults({
        labor: {
          applicable: true,
          status: "success",
          records: config.existingSnapshot.laborRecords || [],
          amount: config.existingSnapshot.subtotal || 0,
          snapshotId: config.existingSnapshot.snapshotId,
          snapshotNumber: config.existingSnapshot.snapshotNumber,
        },
      });
      return;
    }

    // Otherwise load existing snapshot asynchronously
    setAcquiring(true);
    try {
      const existing = await getBillingSnapshotByPeriod(config.projectId, start, end);
      if (existing) {
        setAcquisitionResults({
          labor: {
            applicable: true,
            status: "success",
            records: existing.laborRecords || [],
            amount: existing.subtotal || 0,
            snapshotId: existing.snapshotId,
            snapshotNumber: existing.snapshotNumber,
          },
        });
        setSelectedConfig((prev) =>
          prev ? { ...prev, billingStatus: "READY", snapshotNumber: existing.snapshotNumber } : prev
        );
      } else {
        setAcquisitionResults(null);
      }
    } catch (err) {
      console.error("[BillingDataAcquisition] Selection fetch error:", err);
    } finally {
      setAcquiring(false);
    }
  };

  const handleTriggerAcquire = (config) => {
    if (config.invoiceGeneration === "MANUAL") {
      setPeriodStart(config.periodStart);
      setPeriodEnd(config.periodEnd);
      setShowPeriodModal(true);
    } else {
      executeAcquisition(config, config.periodStart, config.periodEnd);
    }
  };

  const handleModalProceed = () => {
    setShowPeriodModal(false);
    executeAcquisition(selectedConfig, periodStart, periodEnd);
  };

  const executeAcquisition = (config, start, end) => {
    setAcquiring(true);
    acquireBillingData(config, start, end)
      .then((results) => {
        setAcquisitionResults(results);
        setAcquiring(false);
        const laborRes = results?.labor;
        const snapshotNum = laborRes?.snapshotNumber;

        setSelectedConfig((prev) =>
          prev
            ? {
                ...prev,
                billingStatus: "READY",
                snapshotNumber: snapshotNum || prev.snapshotNumber,
                snapshotId: laborRes?.snapshotId || prev.snapshotId,
              }
            : prev
        );

        setActiveConfigs((prevConfigs) =>
          prevConfigs.map((c) =>
            c.projectId === config.projectId
              ? {
                  ...c,
                  billingStatus: "READY",
                  snapshotNumber: snapshotNum || c.snapshotNumber,
                  snapshotId: laborRes?.snapshotId || c.snapshotId,
                }
              : c
          )
        );

        showStatusToast("Billing snapshot acquired successfully.", "success");
      })
      .catch((err) => {
        setAcquiring(false);
        showStatusToast(err.message || "Snapshot acquisition failed.", "error");
      });
  };

  const handleContinueToTax = () => {
    setGenerating(true);
    generateInvoiceDraft(selectedConfig, acquisitionResults).then((result) => {
      setDraft(result);
      setGenerating(false);
      setSubView("DRAFT");
    });
  };

  const handleSaveInvoiceDraft = () => {
    showStatusToast("Invoice Draft generated and stored in billing history.", "success");
    setAcquisitionResults(null);
    setDraft(null);
    setSelectedConfig(null);
    setSubView("WORKSPACE");
  };

  if (loadingConfigs) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  // --- RENDER DRAFT VIEW ---
  if (subView === "DRAFT" && draft && selectedConfig) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Invoice Draft Generated</h2>
            <p className="text-sm text-slate-500">
              Draft Number: <span className="font-mono text-slate-700 font-bold">{draft.draftNumber}</span>
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
            Draft
          </span>
        </div>

        <PageCard className="border-slate-200 bg-white shadow-sm">
          <PageCardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-b border-slate-100 pb-6">
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase">Client</div>
                <div className="mt-1 font-extrabold text-slate-900">{selectedConfig.client}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase">Project Name</div>
                <div className="mt-1 font-extrabold text-slate-900">{selectedConfig.projectName}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase">Billing Period</div>
                <div className="mt-1 font-bold text-slate-800 font-mono">{selectedConfig.billingPeriod}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase">Currency</div>
                <div className="mt-1 font-bold text-indigo-700 font-mono">{selectedConfig.currency}</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Subtotal (Acquired Sum)</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedConfig.currency} {draft.subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500 font-medium">Estimated Tax (Dynamic GST 18%)</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedConfig.currency} {draft.estimatedTax.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xl font-black text-slate-900 pt-2 font-mono">
                <span>Grand Total</span>
                <span>
                  {selectedConfig.currency} {draft.estimatedGrandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-indigo-50/70 border border-indigo-200/80 p-4 flex gap-3 text-xs text-slate-600 items-start">
              <Sparkles className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-900 block mb-0.5">Dynamic Tax Engine Calculation</span>
                Applicable GST has been calculated automatically based on corporate tax settings and registration rules.
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSubView("WORKSPACE")}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Console Workspace
              </button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setSubView("WORKSPACE")}>
                  Discard
                </Button>
                <Button variant="primary" className="font-bold bg-indigo-600" onClick={handleSaveInvoiceDraft}>
                  Save & Commit to History
                </Button>
              </div>
            </div>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  // --- RENDER MAIN TWO-PANEL CONSOLE ---
  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <AcquisitionHeader
        lastSync={lastSyncTime}
        onRefresh={() => loadData(true)}
        refreshing={refreshing}
      />

      {/* KPI Metrics Summary */}
      <AcquisitionMetrics configs={activeConfigs} />

      {/* Main Two-Panel Acquisition Console */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Panel: Acquisition Queue */}
        <div className="lg:col-span-4 h-full">
          <AcquisitionQueue
            configs={activeConfigs}
            selectedConfigId={selectedConfig?.projectId}
            onSelectConfig={handleSelectConfigFromQueue}
            loading={loadingConfigs}
          />
        </div>

        {/* Right Panel: Snapshot Workspace Console */}
        <div className="lg:col-span-8 h-full">
          {selectedConfig ? (
            <SnapshotWorkspace
              config={selectedConfig}
              acquisitionResults={acquisitionResults}
              acquiring={acquiring}
              onAcquire={handleTriggerAcquire}
              onReAcquire={(cfg) => executeAcquisition(cfg, cfg.periodStart, cfg.periodEnd)}
              onContinueToTax={handleContinueToTax}
            />
          ) : (
            <EmptyWorkspaceState
              configs={activeConfigs}
              onSelectConfig={handleSelectConfigFromQueue}
            />
          )}
        </div>
      </div>

      {/* Bottom Operational Audit Timeline */}
      <AcquisitionTimeline />

      {/* Manual Date Period Config Modal */}
      {showPeriodModal && selectedConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-6">
            <div>
              <h3 className={Fonts.subheading}>Define Manual Billing Period</h3>
              <p className="text-xs text-slate-500 mt-1">
                This project configuration requires manual billing period approval. Review or adjust dates.
              </p>
            </div>

            <div className="space-y-4">
              <FormInput
                label="Billing Start Date *"
                name="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
              <FormInput
                label="Billing End Date *"
                name="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setShowPeriodModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" className="bg-indigo-600 font-bold" onClick={handleModalProceed}>
                Acquire Source Snapshot
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
