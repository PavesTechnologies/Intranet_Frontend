import Button from "../../../../components/Button/Button";

export default function AcquisitionNavigation({
  isFirstStep,
  nextLabel = "Next",
  nextDisabled,
  nextLoading,
  nextLoadingText,
  onBack,
  onNext,
  onCancel,
  showSecondary = false,
  secondaryLabel = "Save Draft",
  secondaryLoading = false,
  onSecondary,
}) {
  return (
    <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
      <Button variant="outline" onClick={onBack} disabled={isFirstStep} aria-label="Go back one step">
        Back
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {showSecondary && (
          <Button variant="outline" onClick={onSecondary} loading={secondaryLoading} loadingText="Saving...">
            {secondaryLabel}
          </Button>
        )}
        <Button
          variant="primary"
          onClick={onNext}
          disabled={nextDisabled}
          loading={nextLoading}
          loadingText={nextLoadingText || "Please wait..."}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
