import { useEffect, useState } from "react";

import Modal from "../../../../components/ui/Modal";
import FormInput from "../../../../components/forms/FormInput";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import FormTextArea from "../../../../components/forms/FormTextArea";
import Button from "../../../../components/Button/Button";
import ToggleSwitch from "../common/ToggleSwitch";
import SearchableSelect from "../common/SearchableSelect";

const EMPTY_FORM = {
  projectId: "",
  toolId: "",
  quantity: "",
  remarks: "",
  startDate: "",
  endDate: "",
  active: true,
};

// Mirrors the touched/errors/showError validation pattern already used in
// src/pages/account_receivable/components/steps/ManualProjectCreationStep.jsx and
// src/pages/account_receivable/components/toolcatalog/ToolCatalogFormDialog.jsx.
// Overlap validation is intentionally NOT implemented here — the backend is the source of
// truth; a 400 overlap error from the API surfaces via toast in the page's submit handler.
// Billing Basis now belongs solely to ToolCatalog and is inherited through the selected Tool
// — it is not part of the assignment form, so there is nothing to validate here.
// previousEndDate is only passed in "renew" mode — the new Start Date must fall strictly
// after the assignment being renewed ended. Backend remains the source of truth for overlap.
function validate(form, previousEndDate) {
  const errors = {};

  if (!form.projectId) errors.projectId = "This field is required.";
  if (!form.toolId) errors.toolId = "This field is required.";
  if (form.quantity === "" || Number(form.quantity) <= 0) {
    errors.quantity = "Quantity must be greater than zero.";
  }
  if (!form.startDate) errors.startDate = "This field is required.";
  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = "End Date must not be earlier than Start Date.";
  }
  if (previousEndDate && form.startDate && form.startDate <= previousEndDate) {
    errors.startDate = "Renew Start Date must be after the previous assignment's End Date.";
  }

  return errors;
}

export default function ProjectToolAssignmentFormDialog({
  isOpen,
  mode = "create",
  initialValue,
  projectOptions = [],
  projectsLoading = false,
  toolOptions = [],
  toolsLoading = false,
  saving = false,
  onClose,
  onSubmit,
}) {
  const isRenew = mode === "renew";
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (isRenew && initialValue) {
      // Renew carries Project, Tool, Quantity and Remarks forward — Assignment ID, Start Date
      // and End Date are deliberately NOT copied. The user must enter a new effective period.
      setForm({
        projectId: initialValue.projectId || "",
        toolId: initialValue.toolId || "",
        quantity: initialValue.quantity ?? "",
        remarks: initialValue.remarks || "",
        startDate: "",
        endDate: "",
        active: true,
      });
    } else {
      setForm(
        initialValue
          ? {
              projectId: initialValue.projectId || "",
              toolId: initialValue.toolId || "",
              quantity: initialValue.quantity ?? "",
              remarks: initialValue.remarks || "",
              startDate: initialValue.startDate || "",
              endDate: initialValue.endDate || "",
              active: initialValue.active !== false,
            }
          : EMPTY_FORM
      );
    }
    setTouched({});
    setSubmitted(false);
  }, [isOpen, isRenew, initialValue]);

  const isViewOnly = mode === "view";
  const previousEndDate = isRenew ? initialValue?.endDate : undefined;
  const errors = validate(form, previousEndDate);
  const showError = (field) => (touched[field] || submitted) && errors[field];

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    await onSubmit({
      ...form,
      quantity: Number(form.quantity),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === "edit"
          ? "Edit Assignment"
          : mode === "view"
            ? "View Assignment"
            : isRenew
              ? "Renew Assignment"
              : "Add Assignment"
      }
      width="640px"
    >
      <fieldset disabled={isViewOnly} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SearchableSelect
            label="Project"
            requiredMark
            name="projectId"
            value={form.projectId}
            onChange={handleFieldChange}
            options={projectOptions}
            placeholder={projectsLoading ? "Loading projects..." : "Select project"}
            disabled={projectsLoading}
          />
          <SearchableSelect
            label="Tool"
            requiredMark
            name="toolId"
            value={form.toolId}
            onChange={handleFieldChange}
            options={toolOptions}
            placeholder={toolsLoading ? "Loading tools..." : "Select tool"}
            disabled={toolsLoading}
          />
        </div>
        {showError("projectId") && <p className="text-xs text-red-500">{errors.projectId}</p>}
        {showError("toolId") && <p className="text-xs text-red-500">{errors.toolId}</p>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Quantity"
            requiredMark
            type="number"
            min="1"
            step="1"
            name="quantity"
            value={form.quantity}
            onChange={handleFieldChange}
            error={showError("quantity")}
            placeholder="e.g. 10"
          />
          <div />
        </div>

        <FormTextArea
          label="Remarks"
          name="remarks"
          value={form.remarks}
          onChange={handleFieldChange}
          placeholder="Optional notes about this assignment..."
          rows={3}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <FormDatePicker
              label="Start Date"
              name="startDate"
              value={form.startDate}
              onChange={handleFieldChange}
              min={previousEndDate || undefined}
            />
            {showError("startDate") && <p className="text-xs text-red-500">{errors.startDate}</p>}
            {isRenew && !showError("startDate") && (
              <p className="text-xs text-slate-500">Must be after the previous End Date ({previousEndDate}).</p>
            )}
          </div>
          <div className="space-y-1">
            <FormDatePicker
              label="End Date"
              name="endDate"
              value={form.endDate}
              onChange={handleFieldChange}
              min={form.startDate || undefined}
            />
            {showError("endDate") && <p className="text-xs text-red-500">{errors.endDate}</p>}
          </div>
        </div>

        <ToggleSwitch
          label="Active"
          description="Inactive assignments are excluded from tool billing."
          checked={Boolean(form.active)}
          onChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))}
        />
      </fieldset>

      {!isViewOnly && (
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} loadingText="Saving...">
            {mode === "edit" ? "Save Changes" : isRenew ? "Renew" : "Add Assignment"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
