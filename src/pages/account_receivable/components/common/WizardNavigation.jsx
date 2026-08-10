import Button from "../../../../components/Button/Button";

export default function WizardNavigation({
  isFirstStep,
  isLastStep,
  nextDisabled,
  nextLabel = "Next",
  showSaveDraft = true,
  saving,
  activating,
  onBack,
  onNext,
  onSaveDraft,
  onCancel,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" onClick={onBack} disabled={isFirstStep} aria-label="Go back one step">
        Back
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {showSaveDraft && (
          <Button variant="outline" onClick={onSaveDraft} loading={saving} loadingText="Saving...">
            Save Draft
          </Button>
        )}
        <Button
          variant="primary"
          onClick={onNext}
          disabled={nextDisabled}
          loading={activating}
          loadingText="Activating..."
          aria-label={isLastStep ? "Activate billing setup" : "Continue to next step"}
        >
          {isLastStep ? "Activate Billing Setup" : nextLabel}
        </Button>
      </div>
    </div>
  );
}
