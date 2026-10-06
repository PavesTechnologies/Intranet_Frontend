import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Sparkles,
  Play,
  RefreshCw,
  Calculator,
  ArrowRight,
  Loader2,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";

import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import FormInput from "../../../components/forms/FormInput";
import Modal from "../../../components/Modal/modal";
import StatusBadge from "../../../components/status/statusbadge";
import Breadcrumb from "../../../components/Breadcrumb/Breadcrumb";
import { showStatusToast } from "../../../components/toastfy/toast";

import {
  fetchActiveBillingConfigurations,
  acquireBillingData,
  generateInvoiceDraft,
  getBillingSnapshotByPeriod,
  sendProjectManagerReminder,
  getAcquiredSnapshotMetadata,
  saveAcquiredSnapshotMetadata,
  clearAcquiredSnapshotMetadata,
  formatBillingPeriod,
  toIsoDateOnly,
  getFrequencyDuration,
  calculatePeriodEnd,
} from "../services/billingDataAcquisitionService";
import { calculateTax, getTaxCalculationErrorMessage } from "../services/taxCalculationService";

import SnapshotWorkspace from "../components/acquisition/SnapshotWorkspace";
import BackIconButton from "../components/common/BackIconButton";

const QUEUE_PATH = "/account-receivable/billing-data-acquisition/workspace";

// Resolves the single primary, state-aware action shown in the page header —
// avoids ever presenting more than one competing primary call-to-action.
function getPrimaryAction(status, { acquiring, calculatingTax, onAcquire, onReValidate, onContinueToTax, hasSnapshotId = true }) {
  switch (status) {
    case "NOT_ACQUIRED":
      return {
        label: acquiring ? "Acquiring Snapshot..." : "Acquire Snapshot",
        icon: Play,
        onClick: onAcquire,
        disabled: acquiring,
        spin: acquiring,
        variant: "primary",
      };
    case "VALIDATING":
      return { label: "Validating...", icon: RefreshCw, onClick: null, disabled: true, spin: true, variant: "primary" };
    case "NO_BILLABLE_DATA":
    case "NO_DATA":
      return {
        label: acquiring ? "Checking..." : "Check Again",
        icon: RefreshCw,
        onClick: onAcquire,
        disabled: acquiring,
        spin: acquiring,
        variant: "primary",
      };
    case "PARTIALLY_READY":
    case "PENDING_APPROVAL":
      return {
        label: acquiring ? "Re-Validating..." : "Re-Validate Approvals",
        icon: RefreshCw,
        onClick: onReValidate,
        disabled: acquiring,
        spin: acquiring,
        variant: "primary",
        className: "bg-amber-600 hover:bg-amber-700 text-white border-amber-600",
      };
    case "ACQUISITION_FAILED":
      return {
        label: acquiring ? "Retrying..." : "Retry Acquisition",
        icon: RefreshCw,
        onClick: onAcquire,
        disabled: acquiring,
        spin: acquiring,
        variant: "danger",
      };
    case "CONFIGURATION_REQUIRED":
      return {
        label: "Review Billing Setup",
        icon: SlidersHorizontal,
        onClick: () => showStatusToast("Opening Billing Configuration Setup...", "info"),
        disabled: false,
        variant: "primary",
        className: "bg-amber-600 hover:bg-amber-700 text-white border-amber-600",
      };
    case "READY":
    case "READY_TO_TAX":
    case "READY_FOR_TAX":
      return {
        label: "Calculate Tax",
        icon: Calculator,
        onClick: hasSnapshotId
          ? onContinueToTax
          : () => showStatusToast("Billing snapshot information is unavailable. Please refresh the billing data.", "error"),
        disabled: !hasSnapshotId,
        variant: "success",
        className: !hasSnapshotId ? "opacity-50 cursor-not-allowed" : "",
      };
    case "IN_TAX":
      return { label: "Calculating Tax...", icon: Loader2, onClick: null, disabled: true, spin: true, variant: "success" };
    case "TAX_COMPLETED":
      return {
        label: "View Tax Calculation",
        icon: ArrowRight,
        onClick: hasSnapshotId
          ? onContinueToTax
          : () => showStatusToast("Billing snapshot information is unavailable. Please refresh the billing data.", "error"),
        disabled: !hasSnapshotId,
        variant: "primary",
        className: !hasSnapshotId ? "opacity-50 cursor-not-allowed" : "",
      };
    case "ALREADY_BILLED":
    case "INVOICED":
      return {
        label: "View Invoice",
        icon: ArrowRight,
        onClick: hasSnapshotId
          ? onContinueToTax
          : () => showStatusToast("Billing snapshot information is unavailable. Please refresh the billing data.", "error"),
        disabled: !hasSnapshotId,
        variant: "primary",
        className: !hasSnapshotId ? "opacity-50 cursor-not-allowed" : "",
      };
    default:
      return null;
  }
}

export default function AcquisitionDetail() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Prefer router navigation state if passed; otherwise fall back to loading by id
  const [config, setConfig] = useState(() => {
    const raw = location.state?.config;
    if (!raw) return null;
    const hasPersistedSnapshot = Boolean(raw.snapshotId || raw.existingSnapshot);
    return {
      ...raw,
      billingStatus: hasPersistedSnapshot ? raw.billingStatus : (raw.billingStatus || "NOT_ACQUIRED"),
      snapshotLifecycleStatus: hasPersistedSnapshot ? raw.snapshotLifecycleStatus : (raw.snapshotLifecycleStatus || "NOT_ACQUIRED"),
      billingPeriodStart: raw.billingPeriodStart || null,
      billingPeriodEnd: raw.billingPeriodEnd || null,
      snapshotPeriodStart: raw.snapshotPeriodStart || null,
      snapshotPeriodEnd: raw.snapshotPeriodEnd || null,
      billingPeriod: hasPersistedSnapshot && raw.billingPeriod ? raw.billingPeriod : "—",
    };
  });
  const [loadingConfig, setLoadingConfig] = useState(!location.state?.config);

  // Sub-view: "WORKSPACE" (default live operational screen) | "DRAFT" (pre-tax commercial draft)
  const [subView, setSubView] = useState("WORKSPACE");

  // Acquisition execution state
  const [acquiring, setAcquiring] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [calculatingTax, setCalculatingTax] = useState(false);
  const [remindingPM, setRemindingPM] = useState(false);

  // Results from the latest acquisition execution
  const [acquisitionResults, setAcquisitionResults] = useState(
    location.state?.acquisitionResults || null
  );

  // Draft commercial summary (populated when transitioning to DRAFT subview)
  const [draft, setDraft] = useState(null);

  // Manual billing period modal state
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // Load configuration and existing snapshot on mount
  useEffect(() => {
    let isMounted = true;

    async function applyExistingSnapshot(targetConfig, forceStart = null, forceEnd = null) {
      const numericProjId = Number(targetConfig.projectId || targetConfig.id);
      if (!numericProjId || isNaN(numericProjId)) return;

      const effectiveConfigId = targetConfig.billingConfigurationId;
      const savedMeta = getAcquiredSnapshotMetadata(numericProjId, effectiveConfigId);

      // Determine the actual acquired snapshot period strictly from persisted snapshot data
      let effectiveStart =
        forceStart ||
        targetConfig.existingSnapshot?.billingPeriodStart ||
        targetConfig.billingPeriodStart ||
        targetConfig.snapshotPeriodStart ||
        (savedMeta?.snapshotId ? savedMeta.billingPeriodStart : null);
      let effectiveEnd =
        forceEnd ||
        targetConfig.existingSnapshot?.billingPeriodEnd ||
        targetConfig.billingPeriodEnd ||
        targetConfig.snapshotPeriodEnd ||
        (savedMeta?.snapshotId ? savedMeta.billingPeriodEnd : null);

      if (!effectiveStart || !effectiveEnd) {
        // No snapshot has been acquired yet - do not derive from project dates or frequency!
        clearAcquiredSnapshotMetadata(numericProjId, effectiveConfigId);
        if (isMounted) {
          setAcquisitionResults(null);
          setPeriodStart("");
          setPeriodEnd("");
          setConfig((prev) =>
            prev
              ? {
                  ...prev,
                  billingStatus: "NOT_ACQUIRED",
                  snapshotLifecycleStatus: "NOT_ACQUIRED",
                  snapshotNumber: null,
                  snapshotId: null,
                  existingSnapshot: null,
                  billingPeriodStart: null,
                  billingPeriodEnd: null,
                  snapshotPeriodStart: null,
                  snapshotPeriodEnd: null,
                  billingPeriod: "—",
                }
              : prev
          );
        }
        return;
      }

      if (effectiveStart && effectiveEnd) {
        try {
          const snapshotData = await getBillingSnapshotByPeriod(
            numericProjId,
            effectiveStart,
            effectiveEnd,
            effectiveConfigId
          );

          if (isMounted && snapshotData && (snapshotData.snapshotId || snapshotData.id)) {
            const resolvedStatus = snapshotData.status || "READY_FOR_TAX";
            const snapStart = snapshotData.billingPeriodStart || effectiveStart;
            const snapEnd = snapshotData.billingPeriodEnd || effectiveEnd;
            const snapPeriod = snapshotData.billingPeriod || formatBillingPeriod(snapStart, snapEnd);

            setAcquisitionResults({
              labor: {
                applicable: true,
                status: "success",
                records: snapshotData.laborRecords || snapshotData.timesheets || [],
                amount: snapshotData.subtotal ?? snapshotData.totalAmount ?? 0,
                lastFetchedAt: new Date().toISOString(),
                snapshotId: snapshotData.snapshotId || snapshotData.id,
                snapshotNumber: snapshotData.snapshotNumber || targetConfig.snapshotNumber,
                billingPeriodStart: snapStart,
                billingPeriodEnd: snapEnd,
                billingPeriod: snapPeriod,
                readiness: snapshotData.readiness,
              },
              success: true,
              isExisting: true,
              billingStatus: resolvedStatus,
              snapshotLifecycleStatus: resolvedStatus,
              acquisitionStatus: snapshotData.acquisitionStatus,
            });
            setConfig((prev) =>
              prev
                ? {
                    ...prev,
                    billingStatus: resolvedStatus,
                    snapshotLifecycleStatus: resolvedStatus,
                    acquisitionStatus: snapshotData.acquisitionStatus || prev.acquisitionStatus,
                    snapshotNumber: snapshotData.snapshotNumber || prev.snapshotNumber,
                    snapshotId: snapshotData.snapshotId || prev.snapshotId,
                    billingPeriodStart: snapStart,
                    billingPeriodEnd: snapEnd,
                    snapshotPeriodStart: snapStart,
                    snapshotPeriodEnd: snapEnd,
                    billingPeriod: snapPeriod,
                    existingSnapshot: snapshotData,
                  }
                  ...prev,
                  billingStatus: resolvedStatus,
                  snapshotNumber: snapshotData.snapshotNumber,
                  snapshotId: snapshotData.snapshotId,
                  billingPeriodStart: snapStart,
                  billingPeriodEnd: snapEnd,
                  snapshotPeriodStart: snapStart,
                  snapshotPeriodEnd: snapEnd,
                  billingPeriod: snapPeriod,
                }
                : prev
            );
            setPeriodStart(snapStart);
            setPeriodEnd(snapEnd);

            saveAcquiredSnapshotMetadata(numericProjId, {
              projectId: numericProjId,
              billingConfigurationId: effectiveConfigId,
              snapshotId: snapshotData.snapshotId || snapshotData.id,
              snapshotNumber: snapshotData.snapshotNumber || targetConfig.snapshotNumber,
              status: resolvedStatus,
              billingPeriodStart: snapStart,
              billingPeriodEnd: snapEnd,
              billingPeriod: snapPeriod,
              subtotal: snapshotData.subtotal ?? snapshotData.totalAmount ?? 0,
              totalAmount: snapshotData.totalAmount ?? snapshotData.subtotal ?? 0,
            });
          } else if (isMounted) {
            // Backend confirms no snapshot exists for this project, configuration, and period:
            // purge stale metadata and set status to NOT_ACQUIRED
            clearAcquiredSnapshotMetadata(
              numericProjId,
              effectiveConfigId,
              effectiveStart,
              effectiveEnd
            );
            setAcquisitionResults(null);
            setPeriodStart("");
            setPeriodEnd("");
            setConfig((prev) =>
              prev
                ? {
                    ...prev,
                    billingStatus: "NOT_ACQUIRED",
                    snapshotLifecycleStatus: "NOT_ACQUIRED",
                    snapshotNumber: null,
                    snapshotId: null,
                    existingSnapshot: null,
                    billingPeriodStart: null,
                    billingPeriodEnd: null,
                    snapshotPeriodStart: null,
                    snapshotPeriodEnd: null,
                    billingPeriod: "—",
                  }
                : prev
            );
          }
        } catch (err) {
          console.warn("[AcquisitionDetail] Error hydrating existing snapshot:", err);
          if (isMounted) {
            if (err?.isNetworkError) {
              // Network error must not automatically be interpreted as proof that no snapshot exists.
              showStatusToast(
                "Network error while verifying billing snapshot. Backend data could not be reached.",
                "warning"
              );
            } else {
              setAcquisitionResults(null);
              setConfig((prev) =>
                prev
                  ? {
                      ...prev,
                      billingStatus: prev.billingStatus === "ACQUISITION_FAILED" ? "ACQUISITION_FAILED" : "NOT_ACQUIRED",
                      snapshotLifecycleStatus: prev.snapshotLifecycleStatus === "ACQUISITION_FAILED" ? "ACQUISITION_FAILED" : "NOT_ACQUIRED",
                      snapshotNumber: null,
                      snapshotId: null,
                      existingSnapshot: null,
                    }
                  : prev
              );
            }
          }
        }
      }
    }

    async function initialize() {
      if (!config) {
        try {
          // Acquisition Detail is a Timesheet/T&M-only view -- Fixed Price
          // and Recurring never route here, so scope the match pool to T&M
          // the same way the Data Acquisition console does.
          const list = await fetchActiveBillingConfigurations();
          const tmList = list.filter((item) => item.billingTypeCode === "TIME_MATERIAL");
          const match = tmList.find(
            (item) => String(item.projectId || item.id) === String(projectId)
          );
          if (isMounted && match) {
            let projectDuration = match.projectDuration;
            if (!projectDuration || projectDuration === "—") {
              const pStart = toIsoDateOnly(match.projectStartDate || match.effectiveFrom || match.startDate);
              const pEnd = toIsoDateOnly(match.projectEndDate || match.effectiveTo || match.endDate);
              if (pStart && pEnd) {
                projectDuration = formatBillingPeriod(pStart, pEnd);
              }
            }

            const hasPersistedSnapshot = Boolean(match.existingSnapshot?.snapshotId || match.snapshotId);
            const initialStatus = hasPersistedSnapshot
              ? (match.existingSnapshot?.status || match.billingStatus || "READY_FOR_TAX")
              : (match.billingStatus || "NOT_ACQUIRED");

            const enrichedMatch = {
              ...match,
              projectDuration: projectDuration || "—",
              snapshotPeriodStart: hasPersistedSnapshot ? match.snapshotPeriodStart : null,
              snapshotPeriodEnd: hasPersistedSnapshot ? match.snapshotPeriodEnd : null,
              billingPeriodStart: hasPersistedSnapshot ? match.billingPeriodStart : null,
              billingPeriodEnd: hasPersistedSnapshot ? match.billingPeriodEnd : null,
              billingPeriod: hasPersistedSnapshot && match.billingPeriod ? match.billingPeriod : "—",
              snapshotId: match.existingSnapshot?.snapshotId || match.snapshotId || null,
              snapshotNumber: match.existingSnapshot?.snapshotNumber || match.snapshotNumber || null,
              billingStatus: initialStatus,
              snapshotLifecycleStatus: initialStatus,
              existingSnapshot: match.existingSnapshot || null,
            };
            setConfig(enrichedMatch);
            setPeriodStart(hasPersistedSnapshot ? match.billingPeriodStart || "" : "");
            setPeriodEnd(hasPersistedSnapshot ? match.billingPeriodEnd || "" : "");
            applyExistingSnapshot(enrichedMatch);
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
        let projectDuration = config.projectDuration;
        if (!projectDuration || projectDuration === "—") {
          const pStart = toIsoDateOnly(config.projectStartDate || config.effectiveFrom || config.startDate);
          const pEnd = toIsoDateOnly(config.projectEndDate || config.effectiveTo || config.endDate);
          if (pStart && pEnd) {
            projectDuration = formatBillingPeriod(pStart, pEnd);
          }
        }

        const hasPersistedSnapshot = Boolean(config.existingSnapshot?.snapshotId || config.snapshotId);
        const initialStatus = hasPersistedSnapshot
          ? (config.existingSnapshot?.status || config.billingStatus || "READY_FOR_TAX")
          : (config.billingStatus || "NOT_ACQUIRED");

        const updatedConfig = {
          ...config,
          projectDuration: projectDuration || "—",
          billingStatus: initialStatus,
          snapshotLifecycleStatus: config.snapshotLifecycleStatus || initialStatus,
          billingPeriodStart: config.billingPeriodStart || null,
          billingPeriodEnd: config.billingPeriodEnd || null,
          snapshotPeriodStart: config.snapshotPeriodStart || null,
          snapshotPeriodEnd: config.snapshotPeriodEnd || null,
          billingPeriod: hasPersistedSnapshot && config.billingPeriod ? config.billingPeriod : "—",
          snapshotId: config.existingSnapshot?.snapshotId || config.snapshotId || null,
          snapshotNumber: config.existingSnapshot?.snapshotNumber || config.snapshotNumber || null,
          existingSnapshot: config.existingSnapshot || null,
        };

        if (updatedConfig.existingSnapshot?.snapshotId) {
          const snap = updatedConfig.existingSnapshot;
          const resolvedStatus = snap.status || config.billingStatus || "READY";
          const snapStart = snap.billingPeriodStart;
          const snapEnd = snap.billingPeriodEnd;
          const snapPeriod = snap.billingPeriod || formatBillingPeriod(snapStart, snapEnd);

          setAcquisitionResults({
            labor: {
              applicable: true,
              status: "success",
              records: snap.laborRecords || snap.timesheets || [],
              amount: snap.subtotal ?? snap.totalAmount ?? 0,
              lastFetchedAt: new Date().toISOString(),
              snapshotId: snap.snapshotId,
              snapshotNumber: snap.snapshotNumber,
              billingPeriodStart: snapStart,
              billingPeriodEnd: snapEnd,
              billingPeriod: snapPeriod,
              readiness: snap.readiness,
            },
            success: true,
            isExisting: true,
            billingStatus: resolvedStatus,
            snapshotLifecycleStatus: snap.snapshotLifecycleStatus || resolvedStatus,
            acquisitionStatus: snap.acquisitionStatus || config.acquisitionStatus,
          });
          setPeriodStart(snapStart || "");
          setPeriodEnd(snapEnd || "");
          setConfig({
            ...updatedConfig,
            billingStatus: resolvedStatus,
            snapshotLifecycleStatus: snap.snapshotLifecycleStatus || resolvedStatus,
            acquisitionStatus: snap.acquisitionStatus || updatedConfig.acquisitionStatus,
            snapshotNumber: snap.snapshotNumber,
            snapshotId: snap.snapshotId,
            billingPeriodStart: snapStart,
            billingPeriodEnd: snapEnd,
            snapshotPeriodStart: snapStart,
            snapshotPeriodEnd: snapEnd,
            billingPeriod: snapPeriod,
          });
        } else {
          setPeriodStart(hasPersistedSnapshot ? config.billingPeriodStart || "" : "");
          setPeriodEnd(hasPersistedSnapshot ? config.billingPeriodEnd || "" : "");
          setConfig(updatedConfig);
          applyExistingSnapshot(updatedConfig);
        }
        setLoadingConfig(false);
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const handleTriggerAcquire = (cfg) => {
    if (acquiring) return;
    const currentConfig = cfg || config;
    const start = periodStart || (currentConfig?.invoiceGeneration === "AUTOMATIC" ? currentConfig?.billingPeriodStart : "");
    const end = periodEnd || (currentConfig?.invoiceGeneration === "AUTOMATIC" ? currentConfig?.billingPeriodEnd : "");

    if (!start || !end || currentConfig?.invoiceGeneration === "MANUAL") {
      setPeriodStart(start || "");
      setPeriodEnd(end || "");
      setShowPeriodModal(true);
      return;
    }

    if (start > end) {
      showStatusToast("End date must be on or after start date.", "warning");
      return;
    }

    executeAcquisition(currentConfig, start, end);
  };

  const handleModalCancel = () => {
    setShowPeriodModal(false);
    if (!config?.snapshotId) {
      setPeriodStart("");
      setPeriodEnd("");
    }
  };

  const handleModalProceed = () => {
    if (acquiring) return;
    if (!periodStart || !periodEnd) {
      showStatusToast("Please select both start date and end date.", "warning");
      return;
    }
    if (periodStart > periodEnd) {
      showStatusToast("End date must be on or after start date.", "warning");
      return;
    }
    setShowPeriodModal(false);
    executeAcquisition(config, periodStart, periodEnd);
  };

  const executeAcquisition = (cfg, start, end) => {
    if (acquiring) return;
    const cleanStart = toIsoDateOnly(start);
    const cleanEnd = toIsoDateOnly(end);
    setAcquiring(true);
    setConfig((prev) => (prev ? { ...prev, billingStatus: "VALIDATING" } : prev));
    acquireBillingData(cfg, cleanStart, cleanEnd)
      .then((results) => {
        setAcquisitionResults(results);
        setAcquiring(false);

        const statusUpper = String(results?.billingStatus || "").toUpperCase();
        const isSuccessfulStatus =
          results?.success &&
          (statusUpper === "READY" ||
            statusUpper === "READY_FOR_TAX" ||
            statusUpper === "READY_TO_TAX" ||
            statusUpper === "TAX_COMPLETED" ||
            statusUpper === "INVOICED" ||
            statusUpper === "ALREADY_BILLED" ||
            results?.isExisting);

        if (isSuccessfulStatus) {
          const laborRes = results?.labor;
          const snapshotNum = laborRes?.snapshotNumber || results.snapshotNumber;
          const snapshotId = laborRes?.snapshotId || results.snapshotId;
          const finalBillingStatus = results.billingStatus || (results.isExisting ? "READY_FOR_TAX" : "READY");
          const finalLifecycleStatus = results.snapshotLifecycleStatus || finalBillingStatus;
          const finalStart = toIsoDateOnly(laborRes?.billingPeriodStart || results.billingPeriodStart || cleanStart);
          const finalEnd = toIsoDateOnly(laborRes?.billingPeriodEnd || results.billingPeriodEnd || cleanEnd);
          const finalPeriod = formatBillingPeriod(finalStart, finalEnd);

          saveAcquiredSnapshotMetadata(cfg.projectId, {
            projectId: cfg.projectId,
            billingConfigurationId: cfg.billingConfigurationId,
            snapshotId,
            snapshotNumber: snapshotNum,
            status: finalBillingStatus,
            billingPeriodStart: finalStart,
            billingPeriodEnd: finalEnd,
            billingPeriod: finalPeriod,
            subtotal: laborRes?.amount || results.subtotal || 0,
            totalAmount: laborRes?.amount || results.totalAmount || 0,
          });

          setConfig((prev) =>
            prev
              ? {
                  ...prev,
                  billingStatus: finalBillingStatus,
                  snapshotLifecycleStatus: finalLifecycleStatus,
                  acquisitionStatus: results.acquisitionStatus || prev.acquisitionStatus,
                  snapshotNumber: snapshotNum || prev.snapshotNumber,
                  snapshotId: snapshotId || prev.snapshotId,
                  billingPeriodStart: finalStart,
                  billingPeriodEnd: finalEnd,
                  snapshotPeriodStart: finalStart,
                  snapshotPeriodEnd: finalEnd,
                  billingPeriod: finalPeriod,
                }
              : prev
          );

          setPeriodStart(finalStart);
          setPeriodEnd(finalEnd);

          const toastMsg = results?.isExisting
            ? "Existing billing snapshot loaded successfully."
            : "Billing snapshot acquired successfully. All required timesheets are approved.";
          showStatusToast(toastMsg, "success");
        } else if (results?.billingStatus === "CONFIGURATION_REQUIRED") {
          setConfig((prev) =>
            prev
              ? {
                  ...prev,
                  billingStatus: "CONFIGURATION_REQUIRED",
                  snapshotLifecycleStatus: "CONFIGURATION_REQUIRED",
                  snapshotNumber: prev.snapshotNumber || null,
                  snapshotId: prev.snapshotId || null,
                }
              : prev
          );
          showStatusToast(
            results.message || "Billing configuration setup is required before acquiring snapshot.",
            "warning"
          );
        } else if (results?.billingStatus === "PARTIALLY_READY") {
          setConfig((prev) =>
            prev
              ? {
                  ...prev,
                  billingStatus: "PARTIALLY_READY",
                  snapshotLifecycleStatus: "PARTIALLY_READY",
                  snapshotNumber: prev.snapshotNumber || null,
                  snapshotId: prev.snapshotId || null,
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
                  snapshotLifecycleStatus: "PENDING_APPROVAL",
                  snapshotNumber: prev.snapshotNumber || null,
                  snapshotId: prev.snapshotId || null,
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
                  snapshotLifecycleStatus: "NO_BILLABLE_DATA",
                  snapshotNumber: prev.snapshotNumber || null,
                  snapshotId: prev.snapshotId || null,
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
                  billingStatus: results?.billingStatus || "ACQUISITION_FAILED",
                  snapshotLifecycleStatus: results?.billingStatus || "ACQUISITION_FAILED",
                  snapshotNumber: null,
                  snapshotId: null,
                  existingSnapshot: null,
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
        const errMsg = err.message || "We couldn't retrieve billing data at this time. Please try again.";
        setAcquisitionResults({
          labor: {
            applicable: true,
            status: "error",
            error: errMsg,
            records: [],
            amount: 0,
            lastFetchedAt: new Date().toISOString(),
          },
          success: false,
          billingStatus: "ACQUISITION_FAILED",
          snapshotLifecycleStatus: "ACQUISITION_FAILED",
          message: errMsg,
        });
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                billingStatus: "ACQUISITION_FAILED",
                snapshotLifecycleStatus: "ACQUISITION_FAILED",
                snapshotNumber: null,
                snapshotId: null,
                existingSnapshot: null,
              }
            : prev
        );
        showStatusToast(errMsg, "error");
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
    executeAcquisition(
      config,
      periodStart || config.billingPeriodStart || config.snapshotPeriodStart,
      periodEnd || config.billingPeriodEnd || config.snapshotPeriodEnd
    );
  };

  const handleRefreshSnapshot = async () => {
    if (refreshing || acquiring || !config) return;
    setRefreshing(true);
    try {
      const numericProjId = Number(config.projectId || config.id);
      const start = periodStart || config.billingPeriodStart || config.snapshotPeriodStart;
      const end = periodEnd || config.billingPeriodEnd || config.snapshotPeriodEnd;

      if (numericProjId && start && end) {
        const snapshotData = await getBillingSnapshotByPeriod(
          numericProjId,
          start,
          end,
          config?.billingConfigurationId
        );
        if (snapshotData && (snapshotData.snapshotId || snapshotData.id)) {
          const resolvedStatus = snapshotData.status || config.billingStatus || "READY_FOR_TAX";
          const snapStart = snapshotData.billingPeriodStart || start;
          const snapEnd = snapshotData.billingPeriodEnd || end;
          const snapPeriod = snapshotData.billingPeriod || formatBillingPeriod(snapStart, snapEnd);

          setAcquisitionResults({
            labor: {
              applicable: true,
              status: "success",
              records: snapshotData.laborRecords || snapshotData.timesheets || [],
              amount: snapshotData.subtotal ?? snapshotData.totalAmount ?? 0,
              lastFetchedAt: new Date().toISOString(),
              snapshotId: snapshotData.snapshotId || snapshotData.id,
              snapshotNumber: snapshotData.snapshotNumber || config.snapshotNumber,
              billingPeriodStart: snapStart,
              billingPeriodEnd: snapEnd,
              billingPeriod: snapPeriod,
              readiness: snapshotData.readiness,
            },
            success: true,
            isExisting: true,
            billingStatus: resolvedStatus,
            snapshotLifecycleStatus: resolvedStatus,
            acquisitionStatus: snapshotData.acquisitionStatus,
          });

          setConfig((prev) =>
            prev
              ? {
                  ...prev,
                  billingStatus: resolvedStatus,
                  snapshotLifecycleStatus: resolvedStatus,
                  acquisitionStatus: snapshotData.acquisitionStatus || prev.acquisitionStatus,
                  snapshotNumber: snapshotData.snapshotNumber || prev.snapshotNumber,
                  snapshotId: snapshotData.snapshotId || prev.snapshotId,
                  billingPeriodStart: snapStart,
                  billingPeriodEnd: snapEnd,
                  snapshotPeriodStart: snapStart,
                  snapshotPeriodEnd: snapEnd,
                  billingPeriod: snapPeriod,
                  existingSnapshot: snapshotData,
                }
              : prev
          );

          saveAcquiredSnapshotMetadata(numericProjId, {
            projectId: numericProjId,
            billingConfigurationId: config?.billingConfigurationId,
            snapshotId: snapshotData.snapshotId || snapshotData.id,
            snapshotNumber: snapshotData.snapshotNumber || config.snapshotNumber,
            status: resolvedStatus,
            billingPeriodStart: snapStart,
            billingPeriodEnd: snapEnd,
            billingPeriod: snapPeriod,
            subtotal: snapshotData.subtotal ?? snapshotData.totalAmount ?? 0,
            totalAmount: snapshotData.totalAmount ?? snapshotData.subtotal ?? 0,
          });

          showStatusToast("Snapshot details refreshed from backend.", "success");
        } else {
          clearAcquiredSnapshotMetadata(
            numericProjId,
            config?.billingConfigurationId,
            start,
            end
          );
          setAcquisitionResults(null);
          setConfig((prev) => ({
            ...prev,
            billingStatus: "NOT_ACQUIRED",
            snapshotLifecycleStatus: "NOT_ACQUIRED",
            snapshotId: null,
            snapshotNumber: null,
            existingSnapshot: null,
          }));
          showStatusToast("No updated snapshot details found for this period.", "info");
        }
      }
    } catch (err) {
      console.error("[AcquisitionDetail] Error refreshing snapshot:", err);
      showStatusToast(err.message || "Failed to refresh snapshot details.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleContinueToTax = () => {
    const realSnapshotId =
      config?.snapshotId ||
      acquisitionResults?.labor?.snapshotId ||
      null;

    if (!realSnapshotId) {
      showStatusToast("Billing snapshot information is unavailable. Please refresh the billing data.", "error");
      return;
    }

    const st = String(config?.snapshotLifecycleStatus || config?.billingStatus || "").toUpperCase();
    if (st === "INVOICED" || st === "ALREADY_BILLED") {
      navigate(`/account-receivable/invoices/${realSnapshotId}`, {
        state: { config, acquisitionResults },
      });
      return;
    }

    // Navigate to the Tax Calculation page where the user can review and calculate tax
    navigate(`/account-receivable/tax-calculation/${realSnapshotId}`, {
      state: { source: "billing-data-acquisition", config, acquisitionResults },
    });
  };

  const handleSaveInvoiceDraft = () => {
    showStatusToast("Invoice Draft generated and stored in billing history.", "success");
    navigate(QUEUE_PATH);
  };

  if (loadingConfig) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-sm font-semibold text-slate-800">Configuration Not Found</p>
        <p className="mt-1 text-xs text-slate-500">
          The requested billing configuration does not exist or has been removed.
        </p>
        <Button variant="outline" size="small" className="mt-4" onClick={() => navigate(QUEUE_PATH)}>
          Back to Queue
        </Button>
      </div>
    );
  }

  // --- RENDER DRAFT SUBVIEW ---
  if (subView === "DRAFT" && draft) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pre-Tax Commercial Draft</h1>
            <p className="text-xs text-slate-500">
              Review line-item totals before advancing to official tax calculation.
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
                <div className="mt-1 font-mono font-semibold text-slate-800">{config.billingPeriod || "—"}</div>
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
  const statusUpper = (config.billingStatus || "NOT_ACQUIRED").toUpperCase();
  const lifecycleUpper = String(
    (config.billingStatus === "ACQUISITION_FAILED" || acquisitionResults?.billingStatus === "ACQUISITION_FAILED"
      ? "ACQUISITION_FAILED"
      : null) ||
    config.snapshotLifecycleStatus ||
    acquisitionResults?.snapshotLifecycleStatus ||
    (config.billingStatus !== "ALREADY_BILLED" ? config.billingStatus : null) ||
    acquisitionResults?.billingStatus ||
    config.billingStatus ||
    "NOT_ACQUIRED"
  ).toUpperCase();

  const realSnapshotId = config.snapshotId || acquisitionResults?.labor?.snapshotId || null;
  const isAcquired =
    lifecycleUpper === "READY_TO_TAX" ||
    lifecycleUpper === "READY_FOR_TAX" ||
    lifecycleUpper === "READY" ||
    lifecycleUpper === "IN_TAX" ||
    lifecycleUpper === "TAX_COMPLETED" ||
    lifecycleUpper === "INVOICED" ||
    lifecycleUpper === "ALREADY_BILLED" ||
    statusUpper === "ALREADY_BILLED" ||
    Boolean(realSnapshotId);

  const snapshotNumber = acquisitionResults?.labor?.snapshotNumber || config.snapshotNumber || null;

  const primaryAction = getPrimaryAction(lifecycleUpper, {
    acquiring: acquiring || generating,
    calculatingTax,
    onAcquire: () => handleTriggerAcquire(config),
    onReValidate: handleReValidate,
    onContinueToTax: handleContinueToTax,
    hasSnapshotId: Boolean(realSnapshotId),
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <Breadcrumb
        items={[
          { label: "Billing Data Acquisition", to: QUEUE_PATH },
          { label: config.projectName || snapshotNumber || "Snapshot" },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billing Snapshot</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-xl font-bold text-slate-900 sm:text-2xl">
              {snapshotNumber || "Not Yet Acquired"}
            </h1>
            <StatusBadge label={config.billingStatus || "NOT_ACQUIRED"} size="sm" />
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {isAcquired && (
            <Button
              variant="outline"
              size="small"
              onClick={handleRefreshSnapshot}
              disabled={refreshing || acquiring}
              className="text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          )}
          {primaryAction && (
            <Button
              variant={primaryAction.variant}
              size="small"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className={`text-xs font-semibold ${primaryAction.className || ""}`}
            >
              <primaryAction.icon className={`h-3.5 w-3.5 ${primaryAction.spin ? "animate-spin" : ""}`} />
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>

      {/* Clear user-facing message when snapshot details are unavailable */}
      {isAcquired && !realSnapshotId && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
          <span>Billing snapshot information is unavailable. Please refresh the billing data.</span>
        </div>
      )}

      {/* Main Workspace */}
      <SnapshotWorkspace
        config={config}
        acquisitionResults={acquisitionResults}
        acquiring={acquiring || generating}
        onRemindPM={handleRemindPM}
        remindingPM={remindingPM}
      />

      {/* Date Period Selection Modal */}
      <Modal
        isOpen={showPeriodModal}
        onClose={handleModalCancel}
        title="Select Billing Period"
        subtitle="Select the billing period start and end dates to acquire source data for this snapshot."
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleModalCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleModalProceed} disabled={acquiring}>
              Acquire Snapshot
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormInput
            label="Billing Period Start Date *"
            aria-label="Billing Period Start Date"
            name="periodStart"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
          <FormInput
            label="Billing Period End Date *"
            aria-label="Billing Period End Date"
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

