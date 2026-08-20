import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Pencil, FolderKanban, Coins, Receipt, ShieldCheck } from "lucide-react";

import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import { showStatusToast } from "../../../components/toastfy/toast";
import WizardStepper from "../components/common/WizardStepper";
import WizardNavigation from "../components/common/WizardNavigation";
import BackIconButton from "../components/common/BackIconButton";
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
  { id: 1, label: "Project Selection", shortLabel: "Project", desc: "Select project and basic info", icon: <FolderKanban className="h-5 w-5" /> },
  { id: 2, label: "Commercial Configuration", shortLabel: "Commercial", desc: "Define pricing and rate details", icon: <Coins className="h-5 w-5" /> },
  { id: 3, label: "Invoice Preferences", shortLabel: "Invoice", desc: "Configure billing rules and terms", icon: <Receipt className="h-5 w-5" /> },
  { id: 4, label: "Review & Activate", shortLabel: "Review", desc: "Verify setup before activating", icon: <ShieldCheck className="h-5 w-5" /> },
];

const CONFIGURATIONS_PATH = "/account-receivable/project-billing-setup/configurations";

// eslint-disable-next-line no-unused-vars
function isStepValid(_step, _data) {
  return true;
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
      let billingConfigurationId = savedConfigId;
      try {
        const saveResult = await saveDraftConfiguration(wizardData, savedConfigId);
        billingConfigurationId =
          extractBillingConfigurationId(saveResult) ||
          extractBillingConfigurationId(wizardData.billingConfigurationId) ||
          savedConfigId;
      } catch (saveError) {
        console.warn("Save before activate failed, proceeding with existing ID:", saveError);
      }

      if (!billingConfigurationId) {
        throw new Error("Unable to save billing configuration — missing configuration id.");
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
      await activateConfiguration(billingConfigurationId);

      showStatusToast(
        isEditingExisting ? "Billing setup updated successfully." : "Billing setup created successfully.",
        "success"
      );
      navigate(CONFIGURATIONS_PATH);
    } catch (error) {
      showStatusToast(
        getApiErrorMessage(error, `Failed to ${isEditingExisting ? "update" : "activate"} billing configuration.`),
        "error"
      );
    } finally {
      setActivating(false);
    }
  };

  const isLastStep = currentStep === STEPS.length;
  // Native `disabled` only reflects an in-flight request — a step with missing
  // fields stays clickable so onNext can explain what's missing via toast.
  const nextDisabled = isLastStep && activating;
  const nextIncomplete = !isLastStep && !isStepValid(currentStep, wizardData);

  if (loadingExisting) {
    return (
      <div className="p-6">
        <Loader />
      </div>
    );
  }

  if (viewOnly) {
    return (
      <div className="space-y-3 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BackIconButton onClick={() => navigate(CONFIGURATIONS_PATH)} label="Back to Billing Setups" />
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {wizardData.projectInfo?.projectName || "Billing Configuration"}
            </h1>
          </div>
          <Button variant="outline" size="small" onClick={() => setViewOnly(false)}>
            <Pencil className="h-4 w-4" /> Edit Configuration
          </Button>
        </div>

        <ReviewActivateStep wizardData={wizardData} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Minimal Header */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <BackIconButton onClick={handleCancel} label="Back to Billing Setups" />
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {configId ? "Edit Billing Configuration" : "Create Billing Configuration"}
          </h1>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">Configure billing details for a project</p>
      </div>

      <WizardStepper steps={STEPS} currentStep={currentStep} onStepClick={handleStepClick} />

      {/* Active Form Step Container */}
      <PageCard className="border-slate-200/80 shadow-sm rounded-2xl">
        <PageCardContent className="p-4 sm:p-6 space-y-4">
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
            />
          </div>
        </PageCardContent>
      </PageCard>
    </div>
  );
}
