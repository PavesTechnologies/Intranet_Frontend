import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronRight, Pencil } from "lucide-react";

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
  { id: 1, label: "Project" },
  { id: 2, label: "Commercial Configuration" },
  { id: 3, label: "Invoice Preferences" },
  { id: 4, label: "Review & Activate" },
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
            project.endDate &&
            project.billingType &&
            project.billingFrequency
        );
      } else {
        const required = ["clientName", "projectName", "projectCode", "startDate", "endDate", "billingType", "billingFrequency"];
        const hasAllRequired = required.every((field) => Boolean(project[field]));
        const datesValid = !project.startDate || !project.endDate || project.endDate >= project.startDate;
        return hasAllRequired && datesValid;
      }
    }
    case 2: {
      const config = data.billingConfig || {};
      const project = data.projectInfo || {};
      if (!project.currency) return false;
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
      { label: "Billing Configurations", to: CONFIGURATIONS_PATH },
      { label: configId ? (viewOnly ? "View Configuration" : "Edit Configuration") : "New Configuration", to: null },
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
        title={configId ? "Edit Project Billing Configuration" : "New Project Billing Configuration"}
        subtitle="Configure commercial billing information for a client project."
      />

      <div className="sticky top-0 z-20 -mx-6 bg-slate-50/95 px-6 pb-2 pt-1 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <PageCard>
          <PageCardContent className="p-6">
            <WizardStepper steps={STEPS} currentStep={currentStep} onStepClick={handleStepClick} />
          </PageCardContent>
        </PageCard>
      </div>

      {currentStep === 1 && (
        <PageCard>
          <PageCardContent className="p-6">
            <ProjectStep value={wizardData.projectInfo} onChange={handleProjectInfoChange} />
          </PageCardContent>
        </PageCard>
      )}

      {currentStep === 2 && (
        <PageCard>
          <PageCardContent className="p-6">
            <BillingConfigurationStep
              value={wizardData.billingConfig}
              onChange={handleBillingConfigChange}
              setupMode={wizardData.setupMode}
              projectInfo={wizardData.projectInfo}
              onProjectInfoChange={handleProjectInfoChange}
            />
          </PageCardContent>
        </PageCard>
      )}

      {currentStep === 3 && (
        <PageCard>
          <PageCardContent className="p-6">
            <BillingControlsStep value={wizardData.controls} onChange={handleControlsChange} />
          </PageCardContent>
        </PageCard>
      )}

      {currentStep === 4 && <ReviewActivateStep wizardData={wizardData} onEditStep={handleStepClick} />}

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

      <ActivationSuccessDialog
        isOpen={showSuccess}
        projectName={wizardData.projectInfo?.projectName}
        clientName={wizardData.projectInfo?.clientName}
        onClose={handleActivationClose}
      />
    </div>
  );
}
