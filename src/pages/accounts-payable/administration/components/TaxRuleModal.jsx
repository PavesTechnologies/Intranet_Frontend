import React, { useEffect, useState } from "react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { useSaveTaxRule } from "../hooks/useTaxRules";

const TAX_TYPE_OPTIONS = [
  { value: "Sales Tax", label: "Sales Tax" },
  { value: "VAT", label: "VAT" },
  { value: "GST", label: "GST" },
  { value: "Withholding Tax", label: "Withholding Tax" },
];

const ACTIVE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const EMPTY_FORM = {
  jurisdiction: "",
  taxType: "Sales Tax",
  ratePct: "",
  effectiveDate: "",
  active: "yes",
};

const toFormState = (rule) =>
  rule
    ? {
        jurisdiction: rule.jurisdiction ?? "",
        taxType: rule.taxType ?? "Sales Tax",
        ratePct: rule.ratePct ?? "",
        effectiveDate: rule.effectiveDate ?? "",
        active: rule.active ? "yes" : "no",
      }
    : EMPTY_FORM;

const TaxRuleModal = ({ isOpen, onClose, rule }) => {
  const isEditMode = Boolean(rule?.id);
  const [form, setForm] = useState(() => toFormState(rule));
  const saveTaxRule = useSaveTaxRule();

  useEffect(() => {
    if (isOpen) {
      setForm(toFormState(rule));
    }
  }, [isOpen, rule]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...(isEditMode ? { id: rule.id } : {}),
      jurisdiction: form.jurisdiction.trim(),
      taxType: form.taxType,
      ratePct: Number(form.ratePct),
      effectiveDate: form.effectiveDate,
      active: form.active === "yes",
    };

    try {
      await saveTaxRule.mutateAsync(payload);
      showStatusToast(
        isEditMode ? "Tax rule updated successfully." : "Tax rule created successfully.",
        "success"
      );
      onClose();
    } catch (error) {
      showStatusToast(error?.message || "Failed to save tax rule.", "error");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Tax Rule" : "Add Tax Rule"}
      subtitle="Define the jurisdiction, rate, and effective date for this tax rule."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saveTaxRule.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="tax-rule-form"
            variant="primary"
            loading={saveTaxRule.isPending}
            loadingText="Saving..."
          >
            {isEditMode ? "Save Changes" : "Add Rule"}
          </Button>
        </div>
      }
    >
      <form id="tax-rule-form" onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Jurisdiction"
          name="jurisdiction"
          value={form.jurisdiction}
          onChange={handleChange}
          placeholder="e.g. California, USA"
          requiredMark
          required
        />

        <FormSelect
          label="Tax Type"
          name="taxType"
          options={TAX_TYPE_OPTIONS}
          value={form.taxType}
          onChange={handleChange}
        />

        <FormInput
          label="Rate (%)"
          name="ratePct"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={form.ratePct}
          onChange={handleChange}
          placeholder="e.g. 7.25"
          requiredMark
          required
        />

        <FormDatePicker
          label="Effective Date"
          name="effectiveDate"
          value={form.effectiveDate}
          onChange={handleChange}
          required
        />

        <FormSelect
          label="Active"
          name="active"
          options={ACTIVE_OPTIONS}
          value={form.active}
          onChange={handleChange}
        />
      </form>
    </Modal>
  );
};

export default TaxRuleModal;
