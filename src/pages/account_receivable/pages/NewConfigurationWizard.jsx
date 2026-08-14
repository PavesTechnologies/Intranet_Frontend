import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronRight, Pencil, FolderKanban, Coins, Receipt, ShieldCheck, Check } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import { showStatusToast } from "../../../components/toastfy/toast";
import WizardStepper from "../components/common/WizardStepper";
import WizardNavigation from "../components/common/WizardNavigation";
import ActivationSuccessDialog from "../components/billing-setup/ActivationSuccessDialog";
import ProjectStep from "../components/billing-setup/ProjectStep";
import BillingConfigurationStep from "../components/billing-setup/BillingConfigurationStep";
import BillingControlsStep from "../components/billing-setup/BillingControlsStep";
import ReviewActivateStep from "../components/billing-setup/ReviewActivateStep";
import {
  extractBillingConfigurationId,
  fetchBillingConfigurationById,
  getApiErrorMessage,
  saveDraftConfiguration,
  activateConfiguration,
  ensureBillingConfigurationDraft,
} from "../services/billingConfigService";

const INITIAL_WIZARD_DATA = {
  setupMode: "EXISTING",
  projectInfo: {
    projectSource: "ENTERPRISE",
  },
  billingConfig: {
    billingType: "",
    billingMode: "",
    billingFrequency: "",
    timeAndMaterial: {
      rateCard: "",
      rate: "",
      ratePeriod: "HOURLY",
      effectiveFrom: "",
      effectiveTo: "",
      rateCardId: null,
      roles: [],
      overtimeRule: "NONE",
      minimumBillingHours: "",
      maximumBillableHoursPerDay: "",
      roundingRule: "NONE",
      billApprovedTimesheetsOnly: true,
      includeOvertime: false,
      includeLeaveHours: false,
      billingCutoffDay: "",
    },
    fixedPrice: {
      totalContractValue: "",
      advanceReceived: "",
      retentionPercent: "",
      invoiceScheduleType: "",
      recognitionTrigger: "",
    },
    milestones: [],
    milestoneSettings: { billOnlyCompletedMilestones: false, allowPartialMilestoneBilling: false },
    monthlyRetainer: {
      amount: "",
      billingStartDate: "",
      autoInvoiceGeneration: false,
      billingDayOfMonth: "",
      prorateFirstMonth: false,
    },
    subscription: {
      plan: "",
      amount: "",
      billingCycle: "",
      startDate: "",
      endDate: "",
      autoRenewal: false,
      gracePeriodDays: "",
    },
  },
  controls: {
    paymentTerms: "",
    paymentTermId: "",
    taxRegionId: "",
    invoiceGenerationType: "MANUAL",
    autoInvoiceGeneration: null,
    invoiceGenerationDay: "",
    expenseBillingEligible: false,
  },
};

const STEPS = [
  { id: 1, label: "Project Selection", desc: "Select project and basic info", icon: <FolderKanban className="h-5 w-5" /> },
  { id: 2, label: "Commercial Configuration", desc: "Define pricing and rate details", icon: <Coins className="h-5 w-5" /> },
  { id: 3, label: "Invoice Preferences", desc: "Configure billing rules and terms", icon: <Receipt className="h-5 w-5" /> },
  { id: 4, label: "Review & Activate", desc: "Verify setup before activating", icon: <ShieldCheck className="h-5 w-5" /> },
];

const CONFIGURATIONS_PATH = "/account-receivable/project-billing-setup/configurations";

function isStepValid(step, data) {
  switch (step) {
    case 1: {
      const project = data.projectInfo || {};
      const source = project.projectSource || "ENTERPRISE";
      if (source === "ENTERPRISE") {
        return Boolean(
          project.clientId &&
          project.projectId &&
          project.projectCode &&
          project.startDate &&
          project.endDate
        );
      } else {
        const required = ["clientName", "projectName", "projectCode", "startDate", "endDate"];
        const hasAllRequired = required.every((field) => Boolean(project[field]));
        const datesValid = !project.startDate || !project.endDate || project.endDate >= project.startDate;
        return hasAllRequired && datesValid;
      }
    }
    case 2: {
      const config = data.billingConfig || {};
      const project = data.projectInfo || {};
      if (!(project.projectBudgetCurrency || project.currency)) return false;
      if (!config.billingType) return false;
      if (!config.billingTypeId) return false;
      if (!config.billingFrequency) return false;
      if (!config.billingFrequencyId) return false;

      if (config.billingType === "TIME_MATERIAL") {
        if (!config.billingMode) return false;
        if (config.billingMode === "STANDARD") {
          return Boolean(config.timeAndMaterial?.rate && config.timeAndMaterial?.ratePeriod);
        }
        if (config.billingMode === "ROLE_BASED") {
          const roles = config.timeAndMaterial?.roles || [];
          if (roles.length === 0) return false;
          return roles.every((r) => Boolean(r.role && r.rate && r.ratePeriod));
        }
      }

      if (config.billingType === "RECURRING") {
        if (!config.billingMode) return false;
        if (config.billingMode === "MONTHLY_RETAINER") {
          return Boolean(config.monthlyRetainer?.amount && config.monthlyRetainer?.billingStartDate);
        }
        if (config.billingMode === "SUBSCRIPTION") {
          return Boolean(
            config.subscription?.plan &&
            config.subscription?.amount &&
            config.subscription?.billingCycle &&
            config.subscription?.startDate &&
            config.subscription?.endDate
          );
        }
      }

      if (config.billingType === "FIXED_PRICE") {
        return Boolean(config.fixedPrice?.totalContractValue);
      }

      if (config.billingType === "MILESTONE") {
        return (config.milestones || []).length > 0;
      }

      return true;
    }
    case 3: {
      const controls = data.controls || {};
      if (controls.autoInvoiceGeneration === undefined || controls.autoInvoiceGeneration === null) {
        return false;
      }
      if (!controls.invoiceGenerationType) return false;
      if (!controls.taxRegionId) return false;
      if (controls.autoInvoiceGeneration === true) {
        const day = parseInt(controls.invoiceGenerationDay, 10);
        if (Number.isNaN(day) || day < 1 || day > 31) {
          return false;
        }
      }
      return Boolean(controls.paymentTermId);
    }
    default:
      return true;
  }
}

// Mirrors isStepValid but reports which required fields are still missing,
// so the Next button can explain itself via toast instead of just sitting disabled.
function getMissingFields(step, data) {
  const missing = [];
  switch (step) {
    case 1: {
      const project = data.projectInfo || {};
      const source = project.projectSource || "ENTERPRISE";
      if (source === "ENTERPRISE") {
        if (!project.clientId) missing.push("Client Name");
        if (!project.projectId) missing.push("Project Name");
        if (!project.projectCode) missing.push("Project Code");
        if (!project.startDate) missing.push("Project Start Date");
        if (!project.endDate) missing.push("Project End Date");
      } else {
        if (!project.clientName) missing.push("Client Name");
        if (!project.projectName) missing.push("Project Name");
        if (!project.projectCode) missing.push("Project Code");
        if (!project.startDate) missing.push("Project Start Date");
        if (!project.endDate) missing.push("Project End Date");
        if (project.startDate && project.endDate && project.endDate < project.startDate) {
          missing.push("Project End Date must be on or after the Start Date");
        }
      }
      break;
    }
    case 2: {
      const config = data.billingConfig || {};
      const project = data.projectInfo || {};
      if (!(project.projectBudgetCurrency || project.currency)) missing.push("Billing Currency (select a project with a currency)");
      if (!config.billingType) missing.push("Billing Type");
      if (!config.billingFrequency) missing.push("Billing Frequency");

      if (config.billingType === "TIME_MATERIAL") {
        if (!config.billingMode) missing.push("Pricing Model");
        else if (config.billingMode === "STANDARD") {
          if (!config.timeAndMaterial?.rate) missing.push("Rate");
          if (!config.timeAndMaterial?.ratePeriod) missing.push("Rate Period");
        } else if (config.billingMode === "ROLE_BASED") {
          const roles = config.timeAndMaterial?.roles || [];
          if (roles.length === 0) missing.push("At least one role-based rate");
          else if (!roles.every((r) => Boolean(r.role && r.rate && r.ratePeriod))) {
            missing.push("Role, Rate, and Rate Period for every role row");
          }
        }
      } else if (config.billingType === "RECURRING") {
        if (!config.billingMode) missing.push("Pricing Model");
        else if (config.billingMode === "MONTHLY_RETAINER") {
          if (!config.monthlyRetainer?.amount) missing.push("Retainer Amount");
          if (!config.monthlyRetainer?.billingStartDate) missing.push("Billing Start Date");
        } else if (config.billingMode === "SUBSCRIPTION") {
          if (!config.subscription?.plan) missing.push("Subscription Plan");
          if (!config.subscription?.amount) missing.push("Subscription Amount");
          if (!config.subscription?.billingCycle) missing.push("Billing Cycle");
          if (!config.subscription?.startDate) missing.push("Subscription Start Date");
          if (!config.subscription?.endDate) missing.push("Subscription End Date");
        }
      } else if (config.billingType === "FIXED_PRICE") {
        if (!config.fixedPrice?.totalContractValue) missing.push("Total Contract Value");
      } else if (config.billingType === "MILESTONE") {
        if ((config.milestones || []).length === 0) missing.push("At least one Milestone");
      }
      break;
    }
    case 3: {
      const controls = data.controls || {};
      if (controls.autoInvoiceGeneration === undefined || controls.autoInvoiceGeneration === null) {
        missing.push("Invoice Generation Mode");
      }
      if (!controls.taxRegionId) missing.push("Tax Region");
      if (controls.autoInvoiceGeneration === true) {
        const day = parseInt(controls.invoiceGenerationDay, 10);
        if (Number.isNaN(day) || day < 1 || day > 31) missing.push("Generation Day (1-31)");
      }
      if (!controls.paymentTermId) missing.push("Payment Terms");
      break;
    }
    default:
      break;
  }
  return missing;
}

function getStepValidationMessage(step, data) {
  const missing = getMissingFields(step, data);
  if (missing.length === 0) return null;
  return `Please complete the following before continuing: ${missing.join(", ")}.`;
}

export default function NewConfigurationWizard() {
  const navigate = useNavigate();
  const { configId } = useParams();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode");

  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState(INITIAL_WIZARD_DATA);
  const [loadingExisting, setLoadingExisting] = useState(Boolean(configId));
  const [viewOnly, setViewOnly] = useState(initialMode === "view");
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedConfigId, setSavedConfigId] = useState(extractBillingConfigurationId(configId));
  const [configStatus, setConfigStatus] = useState(null);

  // Editing an already-created (non-Draft) configuration should only ever
  // update that record, never re-run the create/activate flow.
  const isEditingExisting = Boolean(configId) && Boolean(configStatus) && configStatus !== "Draft";

  useEffect(() => {
    if (!configId) return;

    let isMounted = true;
    const loadConfiguration = async () => {
      try {
        const result = await fetchBillingConfigurationById(configId);
        if (!isMounted || !result) return;

        const { summary, detail } = result;
        if (detail) {
          setWizardData((prev) => ({ ...prev, ...detail }));
        }
        setSavedConfigId(summary.id || configId);
        setConfigStatus(summary.status || null);
        setCurrentStep(summary.status === "Draft" ? Math.min(summary.currentStep || 1, STEPS.length) : STEPS.length);
      } catch (error) {
        if (!isMounted) return;
        showStatusToast(getApiErrorMessage(error, "Failed to load billing configuration."), "error");
        navigate(CONFIGURATIONS_PATH);
      } finally {
        if (isMounted) setLoadingExisting(false);
      }
    };

    loadConfiguration();

    return () => {
      isMounted = false;
    };
  }, [configId, navigate]);

  const handleBack = () => setCurrentStep((step) => Math.max(step - 1, 1));

  const handleNext = () => {
    const validationMessage = getStepValidationMessage(currentStep, wizardData);
    if (validationMessage) {
      showStatusToast(validationMessage, "warning");
      return;
    }
    setCurrentStep((step) => Math.min(step + 1, STEPS.length));
  };

  const handleStepClick = (stepId) => {
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      return;
    }
    const validationMessage = getStepValidationMessage(currentStep, wizardData);
    if (validationMessage) {
      showStatusToast(validationMessage, "warning");
      return;
    }
    setCurrentStep(stepId);
  };

  const handleProjectInfoChange = (projectInfo) => {
    setWizardData((prev) => {
      const setupMode = projectInfo.projectSource === "ENTERPRISE" ? "EXISTING" : "STANDALONE";

      // We do not preselect any billingMode. Let the user explicitly choose it on Step 2.
      let billingMode = prev.billingConfig.billingMode;
      if (projectInfo.billingType !== prev.projectInfo.billingType) {
        billingMode = "";
      }

      return {
        ...prev,
        setupMode,
        projectInfo,
        billingConfig: {
          ...prev.billingConfig,
          billingType: projectInfo.billingType || prev.billingConfig.billingType,
          billingFrequency: projectInfo.billingFrequency || prev.billingConfig.billingFrequency,
          billingMode,
        },
      };
    });
  };

  const handleBillingConfigChange = (billingConfig) => setWizardData((prev) => ({ ...prev, billingConfig }));
  const handleControlsChange = (controls) => setWizardData((prev) => ({ ...prev, controls }));

  // Merges a newly-assigned billingConfigurationId into wizard state and returns it.
  const applyBillingConfigurationId = (nextId) => {
    if (!nextId) return nextId;
    setSavedConfigId(nextId);
    setWizardData((prev) => ({
      ...prev,
      billingConfigurationId: nextId,
      billingConfig: {
        ...prev.billingConfig,
        billingConfigurationId: nextId,
        id: nextId,
      },
    }));
    return nextId;
  };

  const persistDraft = async () => {
    const result = await saveDraftConfiguration(wizardData, savedConfigId);
    const nextId =
      extractBillingConfigurationId(result) ||
      extractBillingConfigurationId(wizardData.billingConfigurationId) ||
      savedConfigId;
    return applyBillingConfigurationId(nextId);
  };

  // Returns the existing billingConfigurationId immediately, or creates just the
  // parent billing configuration record (not a full draft save) and returns the
  // id it's assigned. Used by the TM rate card save buttons so they never have to
  // block on a separate "Save Draft" click when the parent config doesn't exist yet.
  // Deliberately avoids saveDraftConfiguration here: that also bulk-syncs every TM
  // rate card row (and deletes any absent from wizard state), which would race with
  // the single-row create/update the rate card button is about to perform itself.
  const ensureBillingConfigurationId = async () => {
    if (savedConfigId) return savedConfigId;
    const nextId = await ensureBillingConfigurationDraft(wizardData);
    return applyBillingConfigurationId(nextId);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await persistDraft();
      showStatusToast("Draft saved successfully.", "success");
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to save draft."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate(CONFIGURATIONS_PATH);

  const handleFinalSubmit = async () => {
    setActivating(true);
    try {
      // savedConfigId is already set whenever we're editing an existing record,
      // so saveDraftConfiguration always performs an update (PUT), never a create.
      const saveResult = await saveDraftConfiguration(wizardData, savedConfigId);
      const billingConfigurationId =
        extractBillingConfigurationId(saveResult) ||
        extractBillingConfigurationId(wizardData.billingConfigurationId) ||
        savedConfigId;

      if (!billingConfigurationId) {
        showStatusToast(
          `Unable to ${isEditingExisting ? "update" : "activate"} billing configuration: missing billingConfigurationId.`,
          "error"
        );
        return;
      }

      setSavedConfigId(billingConfigurationId);
      setWizardData((prev) => ({
        ...prev,
        billingConfigurationId,
        billingConfig: {
          ...prev.billingConfig,
          billingConfigurationId,
          id: billingConfigurationId,
        },
      }));

      if (isEditingExisting) {
        // The record already exists and is already active — just persist the edits.
        showStatusToast("Billing configuration updated successfully.", "success");
        navigate(CONFIGURATIONS_PATH);
        return;
      }

      await activateConfiguration(billingConfigurationId);
      setShowSuccess(true);
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, `Failed to ${isEditingExisting ? "update" : "activate"} billing configuration.`),
        "error"
      );
    } finally {
      setActivating(false);
    }
  };

  const handleActivationClose = () => {
    setShowSuccess(false);
    navigate(CONFIGURATIONS_PATH);
  };

  const isLastStep = currentStep === STEPS.length;
  // Native `disabled` only reflects an in-flight request — a step with missing
  // fields stays clickable so onNext can explain what's missing via toast.
  const nextDisabled = isLastStep && activating;
  const nextIncomplete = !isLastStep && !isStepValid(currentStep, wizardData);

  const breadcrumbItems = useMemo(
    () => [
      { label: "Account Receivable", to: "/account-receivable/dashboard" },
      { label: "Project Billing Setup", to: "/account-receivable/project-billing-setup/overview" },
      { label: "Billing Config Workspace", to: null },
      { label: configId ? (viewOnly ? "View Workspace" : "Edit Workspace") : "New Setup", to: null },
    ],
    [configId, viewOnly]
  );

  if (loadingExisting) {
    return (
      <div className="p-6">
        <Loader />
      </div>
    );
  }

  if (viewOnly) {
    return (
      <div className="space-y-6 p-6">
        <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
          {breadcrumbItems.map((item, index) => (
            <span key={item.label} className="flex items-center gap-2">
              {item.to ? (
                <Link to={item.to} className="hover:text-slate-800">
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-900">{item.label}</span>
              )}
              {index < breadcrumbItems.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
            </span>
          ))}
        </nav>

        <PageHeader
          title={wizardData.projectInfo?.projectName || "Billing Configuration"}
          subtitle="Viewing an active project billing configuration in read-only mode."
          actions={
            <Button variant="outline" onClick={() => setViewOnly(false)}>
              <Pencil className="h-4 w-4" /> Edit Configuration
            </Button>
          }
        />

        <ReviewActivateStep wizardData={wizardData} />
      </div>
    );
  }

  const progressValue = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="space-y-3">
      {/* Page Header */}
      <PageHeader
        title={configId ? "Edit Billing Configuration Workspace" : "Billing Configuration Workspace"}
        subtitle="Configure commercial terms, pricing models, and billing rules for customer projects."
      />

      {/* Segmented Flow Stepper Path */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 shadow-inner">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isLast = index === STEPS.length - 1;
          const isClickable = isCompleted && Boolean(handleStepClick);

          return (
            <div key={step.id} className="flex-1 min-w-[130px] flex items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && handleStepClick(step.id)}
                className={`w-full flex items-center justify-center gap-2 py-1.5 px-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 focus:outline-none ${isActive
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                  : isCompleted
                    ? "text-slate-700 hover:text-slate-900 hover:bg-white/60 cursor-pointer"
                    : "text-slate-400 cursor-default"
                  }`}
              >
                <span className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border transition-all ${isActive
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : isCompleted
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 bg-slate-50 text-slate-400"
                  }`}>
                  {isCompleted ? "✓" : step.id}
                </span>
                <span className="truncate">{step.label}</span>
              </button>
              {!isLast && (
                <span className="text-slate-300 px-1 font-normal text-xs select-none">➔</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Form Step Container */}
      <PageCard className="border-slate-200/80 shadow-sm">
        <PageCardContent className="p-4 sm:p-5 space-y-4">
          {currentStep === 1 && (
            <ProjectStep value={wizardData.projectInfo} onChange={handleProjectInfoChange} />
          )}

          {currentStep === 2 && (
            <BillingConfigurationStep
              value={wizardData.billingConfig}
              onChange={handleBillingConfigChange}
              setupMode={wizardData.setupMode}
              projectInfo={wizardData.projectInfo}
              onProjectInfoChange={handleProjectInfoChange}
              ensureBillingConfigurationId={ensureBillingConfigurationId}
            />
          )}

          {currentStep === 3 && (
            <BillingControlsStep value={wizardData.controls} onChange={handleControlsChange} />
          )}

          {currentStep === 4 && <ReviewActivateStep wizardData={wizardData} onEditStep={handleStepClick} />}

          <div className="border-t border-slate-100 pt-4">
            <WizardNavigation
              isFirstStep={currentStep === 1}
              isLastStep={isLastStep}
              nextDisabled={nextDisabled}
              nextIncomplete={nextIncomplete}
              finalLabel={isEditingExisting ? "Update Billing Setup" : "Create Billing Setup"}
              finalLoadingText={isEditingExisting ? "Updating..." : "Creating..."}
              showSaveDraft={currentStep > 1}
              saving={saving}
              activating={activating}
              onBack={handleBack}
              onNext={isLastStep ? handleFinalSubmit : handleNext}
              onSaveDraft={handleSaveDraft}
              onCancel={handleCancel}
            />
          </div>
        </PageCardContent>
      </PageCard>

      <ActivationSuccessDialog
        isOpen={showSuccess}
        projectName={wizardData.projectInfo?.projectName}
        clientName={wizardData.projectInfo?.clientName}
        onClose={handleActivationClose}
      />
    </div>
  );
}
