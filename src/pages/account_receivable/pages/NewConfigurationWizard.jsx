import { useEffect, useRef, useState } from "react";
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
  saveBillingConfigurationRecord,
} from "../services/billingConfigService";
import { getActiveCurrencies } from "../services/toolPricingService";

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
      // Actual client-agreed commercial value — seeded from the PMS Project Budget
      // once, then freely editable by Finance. contractValueSource tracks whether
      // it still reflects that PMS seed ("PMS") or has been overridden ("MANUAL").
      fixedPriceConfigurationId: null,
      totalContractValue: "",
      contractValueSource: "",
      advanceReceived: "",
      retentionPercent: "",
      effectiveFrom: "",
      effectiveTo: "",
      remarks: "",
      // Backend-calculated, populated after save/fetch.
      retentionAmount: "",
      billableAmount: "",
      remainingAmount: "",
    },
    milestones: [],
    milestoneSettings: { billOnlyCompletedMilestones: false, allowPartialMilestoneBilling: false },
    // Recurring billing (BillingRecurringConfiguration, via
    // /api/billing-recurring) — Billing Frequency itself (chosen above via
    // billingFrequency/billingFrequencyId) determines the recurring period;
    // there is no separate Pricing Model. The normal Recurring flow has no
    // subscription/renewal concept — it's fully described by contract
    // value/source and effective dates.
    recurring: {
      recurringConfigurationId: null,
      contractValueSource: "",
      contractValue: "",
      pmsProjectBudget: "",
      recurringStartDate: "",
      recurringEndDate: "",
      remarks: "",
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
      // billingFrequencyId is the value the frequency PillSelectGroup actually
      // selects on (BillingConfigurationStep.jsx) and what RecurringBillingForm
      // resolves its schedule/label from — validating against it here keeps
      // Next in sync with what's visibly selected instead of the separate
      // billingFrequency field, which a loaded draft doesn't always populate.
      if (!config.billingFrequencyId) missing.push("Billing Frequency");

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
        const recurring = config.recurring || {};
        const projectStartDate = project.startDate;
        const projectEndDate = project.endDate;

        if (!recurring.contractValueSource) missing.push("Contract Value Source");
        const contractValue = Number(recurring.contractValue);
        if (recurring.contractValue === "" || recurring.contractValue === null || recurring.contractValue === undefined) {
          missing.push("Contract Value");
        } else if (Number.isNaN(contractValue) || contractValue <= 0) {
          missing.push("Contract Value must be greater than 0");
        }

        if (!recurring.recurringStartDate) missing.push("Billing Start Date");
        if (!recurring.recurringEndDate) missing.push("Billing End Date");
        if (
          recurring.recurringStartDate &&
          projectStartDate &&
          recurring.recurringStartDate < projectStartDate
        ) {
          missing.push("Billing Start Date must be on or after the Project Start Date");
        }
        if (
          recurring.recurringEndDate &&
          projectEndDate &&
          recurring.recurringEndDate > projectEndDate
        ) {
          missing.push("Billing End Date must be on or before the Project End Date");
        }
        if (
          recurring.recurringStartDate &&
          recurring.recurringEndDate &&
          recurring.recurringEndDate < recurring.recurringStartDate
        ) {
          missing.push("Billing End Date must be on or after the Billing Start Date");
        }
      } else if (config.billingType === "FIXED_PRICE") {
        const fixedPrice = config.fixedPrice || {};
        if (!fixedPrice.totalContractValue) missing.push("Contract Value");
        // Fixed Price details are persisted immediately by their own "Save Fixed
        // Price Details" button, not by the final Create/Submit — so the user must
        // have successfully saved before this step lets them continue.
        else if (!fixedPrice.fixedPriceConfigurationId) missing.push("Save Fixed Price Details before continuing");

        const contractValue = Number(fixedPrice.totalContractValue) || 0;
        const retentionPercent = Number(fixedPrice.retentionPercent);
        const hasRetention =
          fixedPrice.retentionPercent !== "" &&
          fixedPrice.retentionPercent !== null &&
          fixedPrice.retentionPercent !== undefined;
        if (hasRetention && (Number.isNaN(retentionPercent) || retentionPercent < 0 || retentionPercent > 100)) {
          missing.push("Retention % must be between 0 and 100");
        }

        const advanceReceived = Number(fixedPrice.advanceReceived);
        const hasAdvance =
          fixedPrice.advanceReceived !== "" &&
          fixedPrice.advanceReceived !== null &&
          fixedPrice.advanceReceived !== undefined;
        if (hasAdvance) {
          if (Number.isNaN(advanceReceived) || advanceReceived < 0) {
            missing.push("Advance Received cannot be negative");
          } else {
            const retentionAmount =
              hasRetention && retentionPercent > 0 ? contractValue * (retentionPercent / 100) : 0;
            const billableAmount = contractValue - retentionAmount;
            if (advanceReceived > billableAmount) {
              missing.push("Advance Received cannot exceed the Billable Amount");
            }
          }
        }
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

// The backend's minimum requirement for POST .../draft — clientId, projectId, and
// billingTypeId. Called before every draft-creation attempt so a wizard with empty
// or partially-filled data never reaches the API (see the empty-payload bug this
// guards against).
function getDraftGuardMessage(wizardData) {
  const projectInfo = wizardData.projectInfo || {};
  const billingConfig = wizardData.billingConfig || {};
  if (!projectInfo.clientId) return "Please select a Client before continuing.";
  if (!projectInfo.projectId) return "Please select a Project before continuing.";
  if (!billingConfig.billingTypeId) return "Please select a Billing Type before continuing.";
  return null;
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
  const [creatingDraft, setCreatingDraft] = useState(false);
  // Currency master list (real UUID currencyId per currency code) — the only
  // currency master source in this codebase, see toolPricingService.getActiveCurrencies.
  const [currencyMasterList, setCurrencyMasterList] = useState([]);

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

  useEffect(() => {
    let isMounted = true;
    getActiveCurrencies()
      .then((currencies) => {
        if (isMounted) setCurrencyMasterList(Array.isArray(currencies) ? currencies : []);
      })
      .catch(() => {
        if (isMounted) setCurrencyMasterList([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // The backend's CurrencyMaster.currencyId is a UUID, not the small integer this
  // wizard used to fabricate from the currency code. Once the currency master list
  // has loaded and the project's/user's currency code is known, resolve it to the
  // real currencyId and stamp it onto projectInfo so buildBillingConfigurationRequestPayload
  // can send it verbatim instead of guessing.
  useEffect(() => {
    if (currencyMasterList.length === 0) return;

    const code = String(
      wizardData.projectInfo?.projectBudgetCurrency || wizardData.projectInfo?.currency || ""
    )
      .trim()
      .toUpperCase();
    if (!code) return;

    const match = currencyMasterList.find(
      (currency) => String(currency.currencyCode || "").trim().toUpperCase() === code
    );
    const matchedId = match?.currencyId || null;
    if (!matchedId || matchedId === wizardData.projectInfo?.currencyId) return;

    setWizardData((prev) => ({
      ...prev,
      projectInfo: {
        ...prev.projectInfo,
        currencyId: matchedId,
      },
    }));
  }, [
    currencyMasterList,
    wizardData.projectInfo?.projectBudgetCurrency,
    wizardData.projectInfo?.currency,
    wizardData.projectInfo?.currencyId,
  ]);

  const handleBack = () => setCurrentStep((step) => Math.max(step - 1, 1));

  // Safety net: if for some reason the automatic draft creation effect (below,
  // near ensureBillingConfigurationId) hasn't produced a billingConfigurationId by
  // the time the user leaves Step 2 — where billing type and frequency are chosen —
  // make one more attempt before letting them reach Fixed Price Save, since that
  // button never creates the draft itself.
  const ensureDraftBeforeLeavingStep2 = async () => {
    if (savedConfigId) return true;
    setCreatingDraft(true);
    try {
      const newId = await ensureBillingConfigurationId();
      return Boolean(newId);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to create billing configuration draft."), "error");
      return false;
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleNext = async () => {
    const validationMessage = getStepValidationMessage(currentStep, wizardData);
    if (validationMessage) {
      showStatusToast(validationMessage, "warning");
      return;
    }
    if (currentStep === 2 && !(await ensureDraftBeforeLeavingStep2())) return;
    setCurrentStep((step) => Math.min(step + 1, STEPS.length));
  };

  const handleStepClick = async (stepId) => {
    if (stepId < currentStep) {
      setCurrentStep(stepId);
      return;
    }
    const validationMessage = getStepValidationMessage(currentStep, wizardData);
    if (validationMessage) {
      showStatusToast(validationMessage, "warning");
      return;
    }
    if (currentStep === 2 && stepId > 2 && !(await ensureDraftBeforeLeavingStep2())) return;
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
    // [5] Stored in savedConfigId + wizardData.billingConfigurationId +
    // wizardData.billingConfig.{billingConfigurationId,id}.
    console.log("[NewConfigurationWizard] billingConfigurationId stored in wizard state:", nextId);
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
    const guardMessage = getDraftGuardMessage(wizardData);
    if (guardMessage) {
      showStatusToast(guardMessage, "warning");
      return null;
    }
    const nextId = await ensureBillingConfigurationDraft(wizardData);
    return applyBillingConfigurationId(nextId);
  };

  // BillingConfigurationDraftRequestDto only actually requires clientId, projectId,
  // and billingTypeId (see getDraftGuardMessage) — billingFrequencyId/currency/
  // currencyId are NOT required by the draft endpoint. Gating draft creation on
  // currencyId in particular was wrong: that UUID comes from a cross-service lookup
  // (Expense Management's /xms/admin/currencies, a different backend entirely — see
  // the currency-master effect above) which can fail or never resolve for reasons
  // unrelated to this wizard, and doing so silently blocked the draft POST forever,
  // which is why billingConfigurationId was never created and FixedPriceForm's
  // "billing configuration id is missing" guard tripped. Fire as soon as the three
  // DTO-required fields are present; currencyId/billingFrequencyId ride along in the
  // payload if already resolved by then, and reach the backend later via Save Draft/
  // Next otherwise.
  const draftCreationInFlightRef = useRef(false);

  useEffect(() => {
    if (configId || savedConfigId || draftCreationInFlightRef.current) return;

    const projectInfo = wizardData.projectInfo || {};
    const billingConfig = wizardData.billingConfig || {};
    const clientId = projectInfo.clientId;
    const projectId = projectInfo.projectId;
    const billingTypeId = billingConfig.billingTypeId;

    if (!clientId || !projectId || !billingTypeId) return;

    // [1] clientId/projectId/billingTypeId available — draft creation can proceed.
    console.log("[NewConfigurationWizard] draft-required fields ready:", {
      clientId,
      projectId,
      billingTypeId,
      billingFrequencyId: billingConfig.billingFrequencyId,
      currency: projectInfo.projectBudgetCurrency || projectInfo.currency,
      currencyId: projectInfo.currencyId,
    });

    let cancelled = false;
    draftCreationInFlightRef.current = true;
    setCreatingDraft(true);

    ensureBillingConfigurationId()
      .catch((error) => {
        if (!cancelled) {
          showStatusToast(getApiErrorMessage(error, "Failed to create billing configuration draft."), "error");
        }
      })
      .finally(() => {
        draftCreationInFlightRef.current = false;
        if (!cancelled) setCreatingDraft(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    configId,
    savedConfigId,
    wizardData.projectInfo?.clientId,
    wizardData.projectInfo?.projectId,
    wizardData.billingConfig?.billingTypeId,
  ]);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await persistDraft();
      showStatusToast("Draft saved successfully.", "success");
      navigate(CONFIGURATIONS_PATH);
    } catch (error) {
      showStatusToast(getApiErrorMessage(error, "Failed to save draft."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate(CONFIGURATIONS_PATH);

  const handleFinalSubmit = async () => {
    // Fixed Price creation is its own flow: the Fixed Price record itself is already
    // saved (immediately, via the "Save Fixed Price Details" button on the Fixed
    // Price screen) before the user can even reach this step — see the
    // fixedPriceConfigurationId check in getMissingFields. So final submit here only
    // persists the Billing Configuration record; it never calls the Fixed Price API
    // or the Activate API. Editing an already-active config (isEditingExisting) keeps
    // the original save+activate flow below unchanged.
    const isFixedPriceCreate = wizardData.billingConfig?.billingType === "FIXED_PRICE" && !isEditingExisting;

    setActivating(true);
    try {
      if (isFixedPriceCreate) {
        // finalize: true tells the backend to flip status to ACTIVE/isActive=true on
        // this same PUT — this is the only call site that should ever send it.
        const { configResponse, configId } = await saveBillingConfigurationRecord(wizardData, savedConfigId, {
          finalize: true,
        });
        const billingConfigurationId =
          configId ||
          extractBillingConfigurationId(configResponse) ||
          extractBillingConfigurationId(wizardData.billingConfigurationId) ||
          savedConfigId;

        if (!billingConfigurationId) {
          throw new Error("Billing configuration was saved, but the response did not include a configuration id.");
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

        showStatusToast("Billing setup created successfully.", "success");
        navigate(CONFIGURATIONS_PATH);
        return;
      }

      // Let a real save failure (e.g. a backend validation error) surface as-is via
      // the outer catch below — swallowing it here and falling through to the
      // "missing configuration id" message would hide the actual error from the user.
      // finalize: true tells the backend to flip status to ACTIVE/isActive=true on
      // this same PUT — this is the only call site that should ever send it.
      const saveResult = await saveDraftConfiguration(wizardData, savedConfigId, { finalize: true });
      const billingConfigurationId =
        extractBillingConfigurationId(saveResult) ||
        extractBillingConfigurationId(wizardData.billingConfigurationId) ||
        savedConfigId;

      if (!billingConfigurationId) {
        throw new Error("Billing configuration was saved, but the response did not include a configuration id.");
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
      const fallbackMessage = isFixedPriceCreate
        ? "Failed to create billing configuration."
        : `Failed to ${isEditingExisting ? "update" : "activate"} billing configuration.`;
      showStatusToast(getApiErrorMessage(error, fallbackMessage), "error");
    } finally {
      setActivating(false);
    }
  };

  const isLastStep = currentStep === STEPS.length;
  // Native `disabled` only reflects an in-flight request — a step with missing
  // fields stays clickable so onNext can explain what's missing via toast.
  const nextDisabled = (isLastStep && activating) || creatingDraft;
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
              activating={activating || creatingDraft}
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
