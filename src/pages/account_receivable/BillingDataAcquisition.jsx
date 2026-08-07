import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban } from "lucide-react";

import PageHeader from "../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../components/Cards/PageCard";
import Button from "../../components/Button/Button";
import Loader from "../../components/ui/Loader";
import { showStatusToast } from "../../components/toastfy/toast";
import WizardStepper from "./components/WizardStepper";
import AcquisitionNavigation from "./components/acquisition/AcquisitionNavigation";
import ProjectPeriodStep from "./components/acquisition/steps/ProjectPeriodStep";
import AcquireDataStep from "./components/acquisition/steps/AcquireDataStep";
import ReviewChargesStep from "./components/acquisition/steps/ReviewChargesStep";
import ValidateReconcileStep from "./components/acquisition/steps/ValidateReconcileStep";
import InvoiceDraftStep from "./components/acquisition/steps/InvoiceDraftStep";
import InvoiceSoftwareSelection from "./components/acquisition/InvoiceSoftwareSelection";
import GeneratedSoftwareCharges from "./components/acquisition/GeneratedSoftwareCharges";
import { InvoiceDraftProvider, useInvoiceDraftContext } from "./context/InvoiceDraftContext";
import {
  fetchActiveBillingConfigurations,
  fetchBillingContext,
  acquireBillingData,
  runValidation,
  generateInvoiceDraft,
} from "./services/billingDataAcquisitionService";

const STEPS = [
  { id: 1, label: "Project" },
  { id: 2, label: "Acquire" },
  { id: 3, label: "Software" },
  { id: 4, label: "Review" },
  { id: 5, label: "Validate" },
  { id: 6, label: "Draft" },
];

const INITIAL_SELECTION = { configId: "", periodFrom: "", periodTo: "" };

function isStepValid(step, state) {
  switch (step) {
    case 1:
      return Boolean(state.selection.configId && state.selection.periodFrom && state.selection.periodTo && state.billingContext);
    case 2:
      return Boolean(state.acquisitionResults);
    case 3:
      return true;
    case 4:
      return true;
    case 5:
      return Boolean(state.validation) && state.validation.checklist.filter((item) => item.critical).every((item) => item.passed);
    default:
      return true;
  }
}

function BillingDataAcquisitionBody() {
  const navigate = useNavigate();
  const { setSelectedSoftwareItems, generatedSoftwareChargeLines } = useInvoiceDraftContext();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeConfigs, setActiveConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const [billingContext, setBillingContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);

  const [acquisitionResults, setAcquisitionResults] = useState(null);
  const [acquiring, setAcquiring] = useState(false);

  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);

  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    fetchActiveBillingConfigurations().then((configs) => {
      setActiveConfigs(configs);
      setLoadingConfigs(false);
    });
  }, []);

  useEffect(() => {
    if (!selection.configId) {
      setBillingContext(null);
      return;
    }
    let cancelled = false;
    setLoadingContext(true);
    fetchBillingContext(selection.configId).then((context) => {
      if (cancelled) return;
      setBillingContext(context);
      setLoadingContext(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selection.configId]);

  useEffect(() => {
    if (currentStep === 5 && !validation && acquisitionResults && billingContext) {
      setValidating(true);
      const softwareRecords = generatedSoftwareChargeLines.map((line) => ({
        id: line.assetId,
        assetCode: line.assetCode,
        assetName: line.assetName,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        billingBasis: line.billingBasis,
        amount: line.calculatedAmount,
        currency: line.currencyCode,
      }));
      const resultsWithSoftware = {
        ...acquisitionResults,
        software: {
          records: softwareRecords,
          amount: softwareRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
        },
      };
      const result = runValidation(billingContext, resultsWithSoftware, selection.periodFrom, selection.periodTo);
      setValidation(result);
      setValidating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, validation, acquisitionResults, billingContext, generatedSoftwareChargeLines, selection]);

  const handleSelectionChange = (next) => {
    setSelection(next);
    setAcquisitionResults(null);
    setValidation(null);
    setDraft(null);
    setSelectedSoftwareItems([]);
  };

  const handleLoadContext = () => {
    if (!selection.configId) return;
    setLoadingContext(true);
    fetchBillingContext(selection.configId).then((context) => {
      setBillingContext(context);
      setLoadingContext(false);
    });
  };

  const handleReset = () => {
    setSelection(INITIAL_SELECTION);
    setBillingContext(null);
    setAcquisitionResults(null);
    setValidation(null);
    setDraft(null);
    setSelectedSoftwareItems([]);
  };

  const runAcquisition = () => {
    setAcquiring(true);
    acquireBillingData(billingContext, selection.periodFrom, selection.periodTo).then((results) => {
      setAcquisitionResults(results);
      setValidation(null);
      setAcquiring(false);
      const totalRecords = Object.values(results).reduce((sum, result) => sum + result.records.length, 0);
      showStatusToast(
        totalRecords > 0
          ? "Billing data acquired successfully."
          : "No billable transactions were found for the selected billing period.",
        totalRecords > 0 ? "success" : "info"
      );
    });
  };

  const handleClearResults = () => {
    setAcquisitionResults(null);
    setValidation(null);
    setDraft(null);
    setSelectedSoftwareItems([]);
  };

  const handleRevalidate = () => {
    setValidating(true);
    setTimeout(() => {
      const softwareRecords = generatedSoftwareChargeLines.map((line) => ({
        id: line.assetId,
        assetCode: line.assetCode,
        assetName: line.assetName,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        billingBasis: line.billingBasis,
        amount: line.calculatedAmount,
        currency: line.currencyCode,
      }));
      const resultsWithSoftware = {
        ...acquisitionResults,
        software: {
          records: softwareRecords,
          amount: softwareRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
        },
      };
      const result = runValidation(billingContext, resultsWithSoftware, selection.periodFrom, selection.periodTo);
      setValidation(result);
      setValidating(false);
    }, 400);
  };

  const handleSaveDraft = () => {
    setSavingDraft(true);
    setTimeout(() => {
      setSavingDraft(false);
      showStatusToast("Draft saved.", "success");
    }, 400);
  };

  const handleGenerateDraft = () => {
    setGenerating(true);
    const softwareRecords = generatedSoftwareChargeLines.map((line) => ({
      id: line.assetId,
      assetCode: line.assetCode,
      assetName: line.assetName,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      billingBasis: line.billingBasis,
      amount: line.calculatedAmount,
      currency: line.currencyCode,
    }));
    const resultsWithSoftware = {
      ...acquisitionResults,
      software: {
        records: softwareRecords,
        amount: softwareRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
      },
    };
    generateInvoiceDraft(billingContext, resultsWithSoftware).then((result) => {
      setDraft(result);
      setGenerating(false);
      showStatusToast("Invoice draft generated successfully.", "success");
    });
  };

  const handleOpenDraft = () => {
    showStatusToast("Invoice Generation will be available in a future phase.", "info");
    setCurrentStep(1);
    handleReset();
  };

  const handleBack = () => setCurrentStep((step) => Math.max(step - 1, 1));

  const handleNext = () => {
    if (!isStepValid(currentStep, { selection, billingContext, acquisitionResults, validation })) return;
    setCurrentStep((step) => Math.min(step + 1, STEPS.length));
  };

  const handleStepClick = (stepId) => setCurrentStep(stepId);

  const handleCancel = () => navigate("/account-receivable/dashboard");

  const nextDisabled = useMemo(
    () => !isStepValid(currentStep, { selection, billingContext, acquisitionResults, validation }),
    [currentStep, selection, billingContext, acquisitionResults, validation]
  );

  if (loadingConfigs) {
    return (
      <div className="p-6">
        <Loader />
      </div>
    );
  }

  if (activeConfigs.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Billing Data Acquisition"
          subtitle="Acquire approved billable transactions for a project and prepare invoice draft data for a billing period."
        />
        <PageCard>
          <PageCardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <FolderKanban className="h-8 w-8 text-slate-400" />
            </div>
            <p className="max-w-md text-sm font-medium text-slate-700">
              No active billing configurations available. Create and activate a billing setup before acquiring
              billing data.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate("/account-receivable/project-billing-setup/configurations")}
            >
              Go to Project Billing Setup
            </Button>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  const isLastStep = currentStep === STEPS.length;
  const showFooter = !(isLastStep && draft);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Billing Data Acquisition"
        subtitle="Acquire approved billable transactions for a project and prepare invoice draft data for a billing period."
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
            <ProjectPeriodStep
              activeConfigs={activeConfigs}
              loadingConfigs={loadingConfigs}
              selection={selection}
              onSelectionChange={handleSelectionChange}
              billingContext={billingContext}
              loadingContext={loadingContext}
              onLoadContext={handleLoadContext}
              onReset={handleReset}
            />
          </PageCardContent>
        </PageCard>
      )}

      {currentStep === 2 && billingContext && (
        <PageCard>
          <PageCardContent className="p-6">
            <AcquireDataStep
              billingContext={billingContext}
              acquisitionResults={acquisitionResults}
              acquiring={acquiring}
              onAcquire={runAcquisition}
              onRefresh={runAcquisition}
              onClear={handleClearResults}
            />
          </PageCardContent>
        </PageCard>
      )}

      {currentStep === 3 && billingContext && (
        <PageCard>
          <PageCardContent className="p-6">
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Add Software / Tools / Licenses</h3>
            <p className="mb-4 text-xs text-slate-500">
              Select RMS-sourced software, tools, or licenses to bill on this invoice. Selected items will be factored into subsequent Review, Validation, and Draft generation steps.
            </p>
            <InvoiceSoftwareSelection
              projectId={billingContext.configId}
              periodFrom={selection.periodFrom}
              periodTo={selection.periodTo}
              onSelectionChange={setSelectedSoftwareItems}
            />
            <GeneratedSoftwareCharges />
          </PageCardContent>
        </PageCard>
      )}

      {currentStep === 4 && billingContext && (
        <PageCard>
          <PageCardContent className="p-6">
            <ReviewChargesStep billingContext={billingContext} acquisitionResults={acquisitionResults} />
          </PageCardContent>
        </PageCard>
      )}

      {currentStep === 5 && billingContext && !validation && (
        <div className="p-6">
          <Loader />
        </div>
      )}

      {currentStep === 5 && billingContext && validation && (
        <ValidateReconcileStep
          billingContext={billingContext}
          validation={validation}
          validating={validating}
          onRevalidate={handleRevalidate}
        />
      )}

      {currentStep === 6 && billingContext && (
        <PageCard>
          <PageCardContent className="p-6">
            <InvoiceDraftStep
              billingContext={billingContext}
              selection={selection}
              acquisitionResults={acquisitionResults}
              draft={draft}
              onOpenDraft={handleOpenDraft}
            />
          </PageCardContent>
        </PageCard>
      )}

      {showFooter && (
        <AcquisitionNavigation
          isFirstStep={currentStep === 1}
          nextLabel={isLastStep ? "Generate Invoice Draft" : "Next"}
          nextDisabled={isLastStep ? generating : nextDisabled}
          nextLoading={isLastStep ? generating : false}
          nextLoadingText="Generating..."
          onBack={handleBack}
          onNext={isLastStep ? handleGenerateDraft : handleNext}
          onCancel={handleCancel}
          showSecondary={isLastStep}
          secondaryLabel="Save Draft"
          secondaryLoading={savingDraft}
          onSecondary={handleSaveDraft}
        />
      )}
    </div>
  );
}

export default function BillingDataAcquisition() {
  return (
    <InvoiceDraftProvider>
      <BillingDataAcquisitionBody />
    </InvoiceDraftProvider>
  );
}
