import { useEffect, useState } from "react";

import Modal from "../../../../components/ui/Modal";
import FormInput from "../../../../components/forms/FormInput";
import FormTextArea from "../../../../components/forms/FormTextArea";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import Button from "../../../../components/Button/Button";
import ToggleSwitch from "../ToggleSwitch";
import SearchableSelect from "../SearchableSelect";
import { BILLING_BASIS_OPTIONS } from "../../data/toolCatalogOptions";

const EMPTY_FORM = {
  assetId: "",
  description: "",
  billingBasis: "",
  currencyId: "",
  unitPrice: "",
  effectiveFrom: "",
  effectiveTo: "",
  active: true,
};

// Mirrors the touched/errors/showError validation pattern already used elsewhere in this
// module (e.g. ManualProjectCreationStep.jsx, ProjectToolAssignmentFormDialog.jsx). Asset
// selection comes from RMS — there is no free-text Tool Code/Name to validate here. The form
// only ever tracks assetId/currencyId (not assetCode/assetName/currencyCode) — those display
// fields belong to RMS/Currency Master and are never submitted back.
function validate(form) {
  const errors = {};

  if (!form.assetId) errors.assetId = "This field is required.";
  if (!form.billingBasis) errors.billingBasis = "This field is required.";
  if (!form.currencyId) errors.currencyId = "This field is required.";
  if (form.unitPrice === "" || Number(form.unitPrice) <= 0) {
    errors.unitPrice = "Price must be greater than zero.";
  }
  if (form.effectiveFrom && form.effectiveTo && form.effectiveTo < form.effectiveFrom) {
    errors.effectiveTo = "Effective To must be on or after Effective From.";
  }

  return errors;
}

export default function ToolPricingFormDialog({
  isOpen,
  mode = "create",
  initialValue,
  assetOptions = [],
  assetsLoading = false,
  currencyOptions = [],
  currenciesLoading = false,
  saving = false,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setForm(
      initialValue
        ? {
            assetId: initialValue.assetId || "",
            description: initialValue.description || "",
            billingBasis: initialValue.billingBasis || "",
            currencyId: initialValue.currencyId || "",
            unitPrice: initialValue.unitPrice ?? "",
            effectiveFrom: initialValue.effectiveFrom || "",
            effectiveTo: initialValue.effectiveTo || "",
            active: initialValue.active !== false,
          }
        : EMPTY_FORM
    );
    setTouched({});
    setSubmitted(false);
  }, [isOpen, initialValue]);

  const isViewOnly = mode === "view";
  const errors = validate(form);
  const showError = (field) => (touched[field] || submitted) && errors[field];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    await onSubmit({
      ...form,
      unitPrice: Number(form.unitPrice),
    });
  };

  const currencySelectOptions =
    currencyOptions.length > 0
      ? currencyOptions
      : [{ value: "", label: currenciesLoading ? "Loading currencies..." : "No active currencies" }];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Edit Tool Pricing" : mode === "view" ? "View Tool Pricing" : "Add Tool Pricing"}
      width="640px"
    >
      <fieldset disabled={isViewOnly} className="space-y-4">
        <div>
          <SearchableSelect
            label="Asset"
            requiredMark
            name="assetId"
            value={form.assetId}
            onChange={handleChange}
            options={assetOptions}
            placeholder={assetsLoading ? "Loading assets from RMS..." : "Select asset"}
            disabled={assetsLoading}
          />
          {showError("assetId") && <p className="mt-1 text-xs text-red-500">{errors.assetId}</p>}
        </div>

        <FormTextArea
          label="Description"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Optional notes about this pricing entry"
          rows={2}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FormSelect
              label="Billing Basis"
              name="billingBasis"
              value={form.billingBasis}
              onChange={handleChange}
              options={BILLING_BASIS_OPTIONS}
            />
            {showError("billingBasis") && <p className="mt-1 text-xs text-red-500">{errors.billingBasis}</p>}
          </div>
          <div>
            <FormSelect
              label="Currency"
              name="currencyId"
              value={form.currencyId}
              onChange={handleChange}
              options={currencySelectOptions}
            />
            {showError("currencyId") && <p className="mt-1 text-xs text-red-500">{errors.currencyId}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Unit Price"
            requiredMark
            type="number"
            min="0.01"
            step="0.01"
            name="unitPrice"
            value={form.unitPrice}
            onChange={handleChange}
            error={showError("unitPrice")}
            placeholder="0.00"
          />
          <div />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormDatePicker
            label="Effective From"
            name="effectiveFrom"
            value={form.effectiveFrom}
            onChange={handleChange}
          />
          <div className="space-y-1">
            <FormDatePicker
              label="Effective To"
              name="effectiveTo"
              value={form.effectiveTo}
              onChange={handleChange}
              min={form.effectiveFrom || undefined}
            />
            {showError("effectiveTo") && <p className="text-xs text-red-500">{errors.effectiveTo}</p>}
          </div>
        </div>

        <ToggleSwitch
          label="Active"
          description="Inactive pricing is excluded from new tool billing."
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
            {mode === "edit" ? "Save Changes" : "Add Tool Pricing"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
