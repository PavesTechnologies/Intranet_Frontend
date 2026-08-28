import Button from "../../../../components/Button/Button";
import BackIconButton from "./BackIconButton";

export default function WizardNavigation({
  isFirstStep,
  isLastStep,
  nextDisabled,
  nextIncomplete = false,
  nextLabel = "Next",
  finalLabel = "Save Billing Setup",
  finalLoadingText = "Saving...",
  showSaveDraft = true,
  saving,
  activating,
  onBack,
  onNext,
  onSaveDraft,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <BackIconButton onClick={onBack} disabled={isFirstStep} label="Previous Step" />

      <div className="flex flex-wrap items-center gap-3">
        {showSaveDraft && (
          <Button variant="outline" onClick={onSaveDraft} loading={saving} loadingText="Saving...">
            Save Draft
          </Button>
        )}
        <Button
          variant="primary"
          onClick={onNext}
          disabled={nextDisabled}
          className={nextIncomplete ? "opacity-50" : ""}
          loading={activating}
          loadingText={isLastStep ? finalLoadingText : "Loading..."}
          aria-label={isLastStep ? finalLabel : "Continue to next step"}
        >
          {isLastStep ? finalLabel : nextLabel}
        </Button>
      </div>
    </div>
  );
}
