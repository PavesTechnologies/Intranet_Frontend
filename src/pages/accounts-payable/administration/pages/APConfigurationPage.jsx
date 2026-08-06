import React, { useEffect, useState } from "react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { useAPConfig, useUpdateAPConfig } from "../hooks/useAPConfig";

const PAYMENT_TERMS_OPTIONS = [
  { value: "Net 15", label: "Net 15" },
  { value: "Net 30", label: "Net 30" },
  { value: "Net 45", label: "Net 45" },
  { value: "Net 60", label: "Net 60" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
];

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const EMPTY_FORM = {
  paymentTerms: "Net 30",
  currency: "USD",
  escalationDays: "",
  matchTolerancePct: "",
  straightThroughEnabled: "yes",
};

const toFormState = (config) =>
  config
    ? {
        paymentTerms: config.paymentTerms ?? "Net 30",
        currency: config.currency ?? "USD",
        escalationDays: config.escalationDays ?? "",
        matchTolerancePct: config.matchTolerancePct ?? "",
        straightThroughEnabled: config.straightThroughEnabled ? "yes" : "no",
      }
    : EMPTY_FORM;

export default function APConfigurationPage() {
  const { data, isLoading, isError, error } = useAPConfig();
  const updateAPConfig = useUpdateAPConfig();

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (data) {
      setForm(toFormState(data));
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      paymentTerms: form.paymentTerms,
      currency: form.currency,
      escalationDays: Number(form.escalationDays),
      matchTolerancePct: Number(form.matchTolerancePct),
      straightThroughEnabled: form.straightThroughEnabled === "yes",
    };

    try {
      await updateAPConfig.mutateAsync(payload);
      showStatusToast("AP configuration saved successfully.", "success");
    } catch (err) {
      showStatusToast(err?.message || "Failed to save AP configuration.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AP Configuration"
        subtitle="General defaults applied across the Accounts Payable module."
      />

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load AP configuration{error?.message ? `: ${error.message}` : "."}
        </div>
      )}

      <PageCard>
        <PageCardContent>
          {isLoading ? (
            <LoadingSpinner text="Loading AP configuration..." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className={`${Fonts.subheading} mb-3`}>Payment Defaults</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormSelect
                    label="Default Payment Terms"
                    name="paymentTerms"
                    options={PAYMENT_TERMS_OPTIONS}
                    value={form.paymentTerms}
                    onChange={handleChange}
                  />
                  <FormSelect
                    label="Default Currency"
                    name="currency"
                    options={CURRENCY_OPTIONS}
                    value={form.currency}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <h2 className={`${Fonts.subheading} mb-3`}>Approval &amp; Matching</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormInput
                    label="Default Approval Escalation Days"
                    name="escalationDays"
                    type="number"
                    min="0"
                    step="1"
                    value={form.escalationDays}
                    onChange={handleChange}
                    placeholder="e.g. 3"
                  />
                  <FormInput
                    label="Auto-Match Tolerance (%)"
                    name="matchTolerancePct"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.matchTolerancePct}
                    onChange={handleChange}
                    placeholder="e.g. 2"
                  />
                </div>
              </div>

              <div>
                <h2 className={`${Fonts.subheading} mb-3`}>Processing</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormSelect
                    label="Enable Straight-Through Processing"
                    name="straightThroughEnabled"
                    options={YES_NO_OPTIONS}
                    value={form.straightThroughEnabled}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  loading={updateAPConfig.isPending}
                  loadingText="Saving..."
                >
                  Save Configuration
                </Button>
              </div>
            </form>
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
}
