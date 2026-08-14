import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { getActivePaymentTerms, getActiveTaxRegions, getApiErrorMessage } from "../../services/billingConfigurationService";
import RadioCardGroup from "../common/RadioCardGroup";
import { useEffect, useState } from "react";

const INVOICE_GENERATION_OPTIONS = [
  {
    value: "MANUAL",
    label: "Manual",
    description: "Invoices must be generated manually by finance administrators.",
  },
  {
    value: "AUTOMATIC",
    label: "Automatic",
    description: "System automatically generates draft invoices at the end of each billing cycle.",
  },
];

function getOrdinalSuffix(i) {
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

function getDuePreviewText(genDayStr, term) {
  const day = parseInt(genDayStr, 10);
  if (Number.isNaN(day) || day < 1 || day > 31) return "";
  
  let daysToAdd = 0;
  if (term === "NET_15") daysToAdd = 15;
  else if (term === "NET_30") daysToAdd = 30;
  else if (term === "NET_45") daysToAdd = 45;
  else if (term === "NET_60") daysToAdd = 60;
  else if (term === "IMMEDIATE") daysToAdd = 0;
  else return "";

  const baseDate = new Date(2026, 9, day);
  const dueDate = new Date(2026, 9, day + daysToAdd);

  const baseFormat = `Invoice generated on ${day}${getOrdinalSuffix(day)}`;
  
  const diffMonth = dueDate.getMonth() - baseDate.getMonth() + (12 * (dueDate.getFullYear() - baseDate.getFullYear()));
  let monthText = "the same month";
  if (diffMonth === 1) monthText = "next month";
  else if (diffMonth > 1) monthText = `${diffMonth} months later`;

  const dueDay = dueDate.getDate();
  const dueFormat = `Payment due: ${dueDay}${getOrdinalSuffix(dueDay)} of ${monthText}`;
  
  return `${baseFormat} ➔ ${dueFormat}`;
}

export default function BillingControlsStep({ value = {}, onChange }) {
  const update = (patch) => onChange({ ...value, ...patch });

  const [paymentTermOptions, setPaymentTermOptions] = useState([]);
  const [taxRegionOptions, setTaxRegionOptions] = useState([]);
  const [loadingPaymentTerms, setLoadingPaymentTerms] = useState(true);
  const [loadingTaxRegions, setLoadingTaxRegions] = useState(true);
  const [paymentTermsError, setPaymentTermsError] = useState("");
  const [taxRegionsError, setTaxRegionsError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadPaymentTerms = async () => {
      setLoadingPaymentTerms(true);
      setPaymentTermsError("");
      try {
        const terms = await getActivePaymentTerms();
        if (!mounted) return;
        setPaymentTermOptions(
          terms.map((term) => ({
            value: term.paymentTermId,
            label: term.paymentTermName,
            paymentTerms: term.value,
          })),
        );
      } catch (error) {
        if (!mounted) return;
        setPaymentTermsError(getApiErrorMessage(error, "Unable to load payment terms."));
        setPaymentTermOptions([]);
        showStatusToast(getApiErrorMessage(error, "Unable to load payment terms."), "error");
      } finally {
        if (mounted) setLoadingPaymentTerms(false);
      }
    };

    const loadTaxRegions = async () => {
      setLoadingTaxRegions(true);
      setTaxRegionsError("");
      try {
        const taxRegions = await getActiveTaxRegions();
        if (!mounted) return;
        setTaxRegionOptions(
          taxRegions.map((region) => ({
            value: region.taxRegionId,
            label: region.taxRegionName,
          })),
        );
      } catch (error) {
        if (!mounted) return;
        setTaxRegionsError(getApiErrorMessage(error, "Unable to load tax regions."));
        setTaxRegionOptions([]);
        showStatusToast(getApiErrorMessage(error, "Unable to load tax regions."), "error");
      } finally {
        if (mounted) setLoadingTaxRegions(false);
      }
    };

    loadPaymentTerms();
    loadTaxRegions();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const selected = paymentTermOptions.find((option) => String(option.value) === String(value.paymentTermId));
    if (!selected) return;
    if (value.paymentTermName === selected.label && value.paymentTerms === selected.paymentTerms) return;
    update({ paymentTermName: selected.label, paymentTerms: selected.paymentTerms });
  }, [paymentTermOptions, value.paymentTermId, value.paymentTermName, value.paymentTerms]);

  useEffect(() => {
    const selected = taxRegionOptions.find((option) => String(option.value) === String(value.taxRegionId));
    if (!selected) return;
    if (value.taxRegionName === selected.label) return;
    update({ taxRegionName: selected.label });
  }, [taxRegionOptions, value.taxRegionId, value.taxRegionName]);

  const previewText = getDuePreviewText(value.invoiceGenerationDay, value.paymentTerms);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className={Fonts.heading3}>Invoice Preferences</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure how invoices are generated and payment terms after the amount is calculated.
        </p>
      </div>

      {/* Section 1: Invoice generation */}
      <div className="space-y-5">
        <div>
          <h3 className={Fonts.subheading}>
            Invoice generation
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Define how invoice drafts are created for this project.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Invoice Generation Mode <span className="text-red-500">*</span>
          </label>

          <RadioCardGroup
            name="invoiceGenerationMode"
            options={INVOICE_GENERATION_OPTIONS}
            value={
              value.autoInvoiceGeneration === true
                ? "AUTOMATIC"
                : value.autoInvoiceGeneration === false
                ? "MANUAL"
                : ""
            }
            onChange={(next) => {
              if (next === "MANUAL") {
                update({ autoInvoiceGeneration: false, invoiceGenerationType: "MANUAL", invoiceGenerationDay: "" });
              } else {
                update({ autoInvoiceGeneration: true, invoiceGenerationType: "AUTOMATIC" });
              }
            }}
            columns={2}
          />
        </div>

        {/* Dynamic field for Automatic Generation */}
        {value.autoInvoiceGeneration === true && (
          <div className="pt-4 border-t border-slate-100 max-w-md animate-fade-in">
            <FormInput
              label="Generation Day *"
              name="invoiceGenerationDay"
              type="number"
              min="1"
              max="31"
              value={value.invoiceGenerationDay || ""}
              onChange={(event) => update({ invoiceGenerationDay: event.target.value })}
              placeholder="e.g. 25"
            />
            <p className="mt-1 text-xs text-slate-400">
              Specifies on which day invoices should automatically be generated within the billing cycle.
            </p>
          </div>
        )}
      </div>

      {/* Section 2: Payment terms */}
      <div className="space-y-6 pt-6 border-t border-slate-100">
        <div>
          <h3 className={Fonts.subheading}>
            Payment terms
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Defines when payment becomes due after an invoice is generated.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Payment Terms <span className="text-red-500">*</span>
            </label>
            {loadingPaymentTerms ? (
              <p className="text-sm text-slate-500">Loading payment terms…</p>
            ) : (
              <FormSelect
                name="paymentTermId"
                value={value.paymentTermId || ""}
                onChange={(event) => {
                  const selected = paymentTermOptions.find((opt) => String(opt.value) === String(event.target.value));
                  update({
                    paymentTermId: event.target.value,
                    paymentTermName: selected?.label || "",
                    paymentTerms: selected?.paymentTerms || "",
                  });
                }}
                options={[{ value: "", label: paymentTermsError ? "Payment terms unavailable" : "Select payment terms" }, ...paymentTermOptions]}
              />
            )}
            {paymentTermsError && <p className="text-xs text-red-600">{paymentTermsError}</p>}
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Tax Region <span className="text-red-500">*</span>
            </label>
            {loadingTaxRegions ? (
              <p className="text-sm text-slate-500">Loading tax regions...</p>
            ) : (
              <FormSelect
                name="taxRegionId"
                value={value.taxRegionId || ""}
                onChange={(event) => {
                  const selected = taxRegionOptions.find((opt) => String(opt.value) === String(event.target.value));
                  update({ taxRegionId: event.target.value, taxRegionName: selected?.label || "" });
                }}
                options={[{ value: "", label: taxRegionsError ? "Tax regions unavailable" : "Select tax region" }, ...taxRegionOptions]}
              />
            )}
            {taxRegionsError && <p className="text-xs text-red-600">{taxRegionsError}</p>}
          </div>
          </div>

          <div className="max-w-md rounded-lg border border-slate-200 p-3.5">
            <label className="flex items-start gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(value.expenseBillingEligible)}
                onChange={(event) => update({ expenseBillingEligible: event.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span>
                Expense billing eligible
                <span className="mt-0.5 block text-xs font-normal text-slate-400">
                  Project expenses can be included on generated invoices.
                </span>
              </span>
            </label>
          </div>

          {/* Payment preview summary block */}
          {previewText && (
            <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-4 text-sm text-blue-800">
              <span className="font-semibold block mb-1">Invoice timeline preview</span>
              <span className="font-medium">{previewText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
