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
  fetchBillingConfigurationById,
  saveDraftConfiguration,
  activateConfiguration,
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
      billingRate: "",
      rateEffectiveFrom: "",
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
    autoInvoiceGeneration: null,
    invoiceGenerationDay: "",
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
      if (!project.currency) return false;
      if (!config.billingType) return false;
      if (!config.billingFrequency) return false;
      if (config.billingType === "TIME_MATERIAL") {
        if (!config.billingMode) return false;
        if (config.billingMode === "STANDARD") {
          return Boolean(config.timeAndMaterial?.billingRate);
        }
        if (config.billingMode === "ROLE_BASED") {
          const roles = config.timeAndMaterial?.roles || [];
          if (roles.length === 0) return false;
          return roles.every((r) => Boolean(r.role && r.rate));
        }
      }
      if (config.billingType === "RECURRING") {
        if (!config.billingMode) return false;
      }
      return true;
    }
    case 3: {
      const controls = data.controls || {};
      if (controls.autoInvoiceGeneration === undefined || controls.autoInvoiceGeneration === null) {
        return false;
      }
      if (controls.autoInvoiceGeneration === true) {
        const day = parseInt(controls.invoiceGenerationDay, 10);
        if (Number.isNaN(day) || day < 1 || day > 31) {
          return false;
        }
      }
      return Boolean(controls.paymentTerms);
    }
    default:
      return true;
  }
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

  useEffect(() => {
    if (!configId) return;

    let isMounted = true;
    fetchBillingConfigurationById(configId).then((result) => {
      if (!isMounted || !result) return;

      const { summary, detail } = result;
      if (detail) {
        setWizardData((prev) => ({ ...prev, ...detail }));
      }
      setCurrentStep(summary.status === "Draft" ? Math.min(summary.currentStep || 1, STEPS.length) : STEPS.length);
      setLoadingExisting(false);
    });

    return () => {
      isMounted = false;
    };
  }, [configId]);

  const handleBack = () => setCurrentStep((step) => Math.max(step - 1, 1));

  const handleNext = () => {
    if (!isStepValid(currentStep, wizardData)) return;
    setCurrentStep((step) => Math.min(step + 1, STEPS.length));
  };

  const handleStepClick = (stepId) => {
    if (stepId < currentStep || isStepValid(currentStep, wizardData)) {
      setCurrentStep(stepId);
    }
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

  const handleSaveDraft = () => {
    setSaving(true);
    saveDraftConfiguration(wizardData).then(() => {
      setSaving(false);
      showStatusToast("Draft saved successfully.", "success");
    });
  };

  const handleCancel = () => navigate(CONFIGURATIONS_PATH);

  const handleActivate = () => {
    setActivating(true);
    activateConfiguration(wizardData).then(() => {
      setActivating(false);
      setShowSuccess(true);
    });
  };

  const handleActivationClose = () => {
    setShowSuccess(false);
    navigate(CONFIGURATIONS_PATH);
  };

  const isLastStep = currentStep === STEPS.length;
  const nextDisabled = isLastStep
    ? activating
    : !isStepValid(currentStep, wizardData);

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
              showSaveDraft={currentStep > 1}
              saving={saving}
              activating={activating}
              onBack={handleBack}
              onNext={isLastStep ? handleActivate : handleNext}
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
