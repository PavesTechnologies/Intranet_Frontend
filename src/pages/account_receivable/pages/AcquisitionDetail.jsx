import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import FormInput from "../../../components/forms/FormInput";
import Modal from "../../../components/Modal/modal";
import { showStatusToast } from "../../../components/toastfy/toast";

import {
  fetchActiveBillingConfigurations,
  acquireBillingData,
  generateInvoiceDraft,
  getBillingSnapshotByPeriod,
  sendProjectManagerReminder,
} from "../services/billingDataAcquisitionService";
import { calculateTax, getTaxCalculationErrorMessage } from "../services/taxCalculationService";

import SnapshotWorkspace from "../components/acquisition/SnapshotWorkspace";
import BackIconButton from "../components/common/BackIconButton";

const QUEUE_PATH = "/account-receivable/billing-data-acquisition";

export default function AcquisitionDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();

  const [config, setConfig] = useState(location.state?.config || null);
  const [loadingConfig, setLoadingConfig] = useState(!location.state?.config);
  const [acquisitionResults, setAcquisitionResults] = useState(null);
  const [acquiring, setAcquiring] = useState(false);
  const [remindingPM, setRemindingPM] = useState(false);
  const [calculatingTax, setCalculatingTax] = useState(false);

  // Subview for draft invoice preview
  const [subView, setSubView] = useState("WORKSPACE");
  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Manual period modal
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function applyExistingSnapshot(targetConfig) {
      if (
        (targetConfig.billingStatus === "READY" || targetConfig.billingStatus === "Ready") &&
        targetConfig.periodStart &&
        targetConfig.periodEnd
      ) {
        try {
          setAcquiring(true);
          const numericProjId = Number(targetConfig.projectId || targetConfig.id) || 9;
          const snapshotData = await getBillingSnapshotByPeriod(
            numericProjId,
            targetConfig.periodStart,
            targetConfig.periodEnd
          );

          if (isMounted && snapshotData && snapshotData.laborRecords?.length > 0) {
            setAcquisitionResults({
              labor: {
                applicable: true,
                status: "success",
                records: snapshotData.laborRecords,
                amount: snapshotData.subtotal,
                lastFetchedAt: new Date().toISOString(),
                snapshotId: snapshotData.snapshotId,
                snapshotNumber: snapshotData.snapshotNumber,
                readiness: snapshotData.readiness,
              },
              success: true,
              billingStatus: "READY",
            });
            setConfig((prev) =>
              prev
                ? {
                    ...prev,
                    billingStatus: "READY",
                    snapshotNumber: snapshotData.snapshotNumber,
                    snapshotId: snapshotData.snapshotId,
                  }
                : prev
            );
          }
        } catch (err) {
          console.warn("[AcquisitionDetail] Error hydrating existing snapshot:", err);
        } finally {
          if (isMounted) setAcquiring(false);
        }
      }
    }

    async function initialize() {
      if (!config) {
        try {
          const list = await fetchActiveBillingConfigurations();
          const match = list.find(
            (item) => String(item.projectId || item.id) === String(projectId)
          );
          if (isMounted && match) {
            setConfig(match);
            setPeriodStart(match.periodStart || "");
            setPeriodEnd(match.periodEnd || "");
            applyExistingSnapshot(match);
          } else if (isMounted) {
            showStatusToast("Project configuration not found.", "error");
            navigate(QUEUE_PATH, { replace: true });
          }
        } catch (err) {
          console.error("Failed to load project billing configuration", err);
        } finally {
          if (isMounted) setLoadingConfig(false);
        }
      } else {
        setPeriodStart(config.periodStart || "");
        setPeriodEnd(config.periodEnd || "");
        applyExistingSnapshot(config);
        setLoadingConfig(false);
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const handleTriggerAcquire = (cfg) => {
    if (cfg.invoiceGeneration === "MANUAL") {
      setPeriodStart(cfg.periodStart);
      setPeriodEnd(cfg.periodEnd);
      setShowPeriodModal(true);
    } else {
      executeAcquisition(cfg, cfg.periodStart, cfg.periodEnd);
    }
  };

  const handleModalProceed = () => {
    setShowPeriodModal(false);
    executeAcquisition(config, periodStart, periodEnd);
  };

  const executeAcquisition = (cfg, start, end) => {
    setAcquiring(true);
    setConfig((prev) => (prev ? { ...prev, billingStatus: "VALIDATING" } : prev));
    acquireBillingData(cfg, start, end)
      .then((results) => {
        setAcquisitionResults(results);
        setAcquiring(false);

        if (results?.success && results?.billingStatus === "READY") {
          const laborRes = results?.labor;
          const snapshotNum = laborRes?.snapshotNumber;

          setConfig((prev) =>
            prev
              ? {
                  ...prev,
                  billingStatus: "READY",
                  snapshotNumber: snapshotNum || prev.snapshotNumber,
                  snapshotId: laborRes?.snapshotId || prev.snapshotId,
                }
              : prev
          );

          showStatusToast("Billing snapshot acquired successfully. All required timesheets are approved.", "success");
        } else if (results?.billingStatus === "PARTIALLY_READY") {
          setConfig((prev) =>
            prev
              ? {
                  ...prev,
                  billingStatus: "PARTIALLY_READY",
                  snapshotNumber: null,
                  snapshotId: null,
                }
              : prev
          );
          showStatusToast(
            results.message || "Billing is blocked: timesheets are still awaiting manager approval.",
            "warning"
          );
        } else if (results?.billingStatus === "PENDING_APPROVAL") {
          setConfig((prev) =>
            prev
              ? {
                  ...prev,
                  billingStatus: "PENDING_APPROVAL",
                  snapshotNumber: null,
                  snapshotId: null,
                }
              : prev
          );
          showStatusToast(
            results.message || "Timesheets were found for this billing period, but none are approved yet.",
            "warning"
          );
        } else if (results?.billingStatus === "NO_BILLABLE_DATA" || results?.billingStatus === "NO_DATA") {
          setConfig((prev) =>
            prev
              ? {
                  ...prev,
                  billingStatus: "NO_BILLABLE_DATA",
                  snapshotNumber: null,
                  snapshotId: null,
                }
              : prev
          );
          showStatusToast(
            results.message || "No billable data was found for this billing period.",
            "info"
          );
        } else {
          setConfig((prev) =>
            prev
              ? {
                  ...prev,
                  billingStatus: "ACQUISITION_FAILED",
                  snapshotNumber: null,
                  snapshotId: null,
                }
              : prev
          );
          showStatusToast(
            results.message || "Billing data could not be retrieved due to a system error.",
            "error"
          );
        }
      })
      .catch((err) => {
        setAcquiring(false);
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                billingStatus: "ACQUISITION_FAILED",
                snapshotNumber: null,
                snapshotId: null,
              }
            : prev
        );
        showStatusToast(
          err.message || "We couldn't retrieve billing data at this time. Please try again.",
          "error"
        );
      });
  };

  const handleRemindPM = () => {
    if (!config) return;
    setRemindingPM(true);
    const pendingTimesheets = acquisitionResults?.labor?.readiness?.pendingTimesheets || [];
    sendProjectManagerReminder(config, pendingTimesheets)
      .then((res) => {
        setRemindingPM(false);
        if (res.rateLimited) {
          showStatusToast(res.message, "warning");
        } else {
          showStatusToast(res.message, "success");
        }
      })
      .catch((err) => {
        setRemindingPM(false);
        showStatusToast(err.message || "Failed to send reminder to Project Manager.", "error");
      });
  };

  const handleReValidate = () => {
    if (!config) return;
    showStatusToast("Re-validating timesheet approvals...", "info");
    executeAcquisition(config, periodStart || config.periodStart, periodEnd || config.periodEnd);
  };

  const handleContinueToTax = async () => {
    const snapshotId =
      config?.snapshotId ||
      acquisitionResults?.labor?.snapshotId ||
      config?.id ||
      projectId;

    if (!snapshotId) {
      showStatusToast("Billing snapshot could not be found.", "error");
      return;
    }

    const currentStatus = (config?.billingStatus || "").toUpperCase();

    if (currentStatus === "TAX_COMPLETED") {
      navigate(`/account-receivable/tax-calculation/${snapshotId}`, {
        state: { config, acquisitionResults },
      });
      return;
    }

    if (currentStatus === "IN_TAX" || calculatingTax) return;

    setCalculatingTax(true);
    try {
      const calcResult = await calculateTax(snapshotId);
      showStatusToast("Tax calculation completed successfully.", "success");
      setConfig((prev) => (prev ? { ...prev, billingStatus: "TAX_COMPLETED" } : prev));
      navigate(`/account-receivable/tax-calculation/${snapshotId}`, {
        state: { taxCalculation: calcResult, config, acquisitionResults },
      });
    } catch (error) {
      const errorMsg = getTaxCalculationErrorMessage(error);
      if (errorMsg && errorMsg.toLowerCase().includes("already")) {
        showStatusToast("Tax calculation has already been completed for this billing snapshot.", "info");
        setConfig((prev) => (prev ? { ...prev, billingStatus: "TAX_COMPLETED" } : prev));
        navigate(`/account-receivable/tax-calculation/${snapshotId}`, {
          state: { config, acquisitionResults },
        });
      } else {
        showStatusToast(errorMsg, "error");
      }
    } finally {
      setCalculatingTax(false);
    }
  };

  const handleSaveInvoiceDraft = () => {
    showStatusToast("Invoice Draft generated and stored in billing history.", "success");
    navigate(QUEUE_PATH);
  };

  if (loadingConfig) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader size="lg" text="Loading Project Billing Configuration..." />
      </div>
    );
  }

  if (!config) {
    return (
      <PageCard>
        <PageCardContent className="p-8 text-center">
          <p className="text-slate-600">Project configuration not found.</p>
          <Button className="mt-4" onClick={() => navigate(QUEUE_PATH)}>
            Back to Acquisition Console
          </Button>
        </PageCardContent>
      </PageCard>
    );
  }

  // --- RENDER DRAFT VIEW ---
  if (subView === "DRAFT" && draft) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Invoice Draft Generated</h2>
            <p className="text-sm text-slate-500">
              Draft Number: <span className="font-mono font-semibold text-slate-700">{draft.draftNumber}</span>
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Draft
          </span>
        </div>

        <PageCard className="border-slate-200 bg-white shadow-sm">
          <PageCardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-6 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Client</div>
                <div className="mt-1 font-semibold text-slate-900">{config.client}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Project Name</div>
                <div className="mt-1 font-semibold text-slate-900">{config.projectName}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Billing Period</div>
                <div className="mt-1 font-mono font-semibold text-slate-800">{config.billingPeriod}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Currency</div>
                <div className="mt-1 font-mono font-semibold text-indigo-700">{config.currency}</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Subtotal (Acquired Sum)</span>
                <span className="font-mono font-semibold text-slate-900">
                  {config.currency} {draft.subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                <span className="font-medium text-slate-500">Estimated Tax (Dynamic GST 18%)</span>
                <span className="font-mono font-semibold text-slate-900">
                  {config.currency} {draft.estimatedTax.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 font-mono text-xl font-bold text-slate-900">
                <span>Grand Total</span>
                <span>
                  {config.currency} {draft.estimatedGrandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-slate-600">
              <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600" />
              <div>
                <span className="mb-0.5 block font-semibold text-indigo-900">Dynamic Tax Engine Calculation</span>
                Applicable GST has been calculated automatically based on corporate tax settings and registration rules.
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-6">
              <BackIconButton onClick={() => setSubView("WORKSPACE")} label="Back to Acquisition Detail" />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSubView("WORKSPACE")}>
                  Discard
                </Button>
                <Button variant="primary" onClick={handleSaveInvoiceDraft}>
                  Save &amp; Commit to History
                </Button>
              </div>
            </div>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  // --- RENDER DETAIL WORKSPACE ---
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <BackIconButton onClick={() => navigate(QUEUE_PATH)} label="Back to Acquisition Queue" />
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{config.projectName}</h1>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          {config.client} &middot; <span className="font-mono">{config.projectCode}</span>
        </p>
      </div>

      <SnapshotWorkspace
        config={config}
        acquisitionResults={acquisitionResults}
        acquiring={acquiring || generating}
        onAcquire={handleTriggerAcquire}
        onReAcquire={(cfg) => executeAcquisition(cfg, cfg.periodStart, cfg.periodEnd)}
        onContinueToTax={handleContinueToTax}
        onRemindPM={handleRemindPM}
        onReValidate={handleReValidate}
        remindingPM={remindingPM}
        calculatingTax={calculatingTax}
      />

      {/* Manual Date Period Config Modal */}
      <Modal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        title="Define Manual Billing Period"
        subtitle="This project configuration requires manual billing period approval. Review or adjust dates."
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPeriodModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleModalProceed}>
              Acquire Source Snapshot
            </Button>
          </div>
        }
      >
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
      </Modal>
    </div>
  );
}
