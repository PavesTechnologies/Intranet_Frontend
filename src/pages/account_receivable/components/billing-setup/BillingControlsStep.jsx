import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import { Fonts } from "../../../../components/Fonts/Fonts";
import RadioCardGroup from "../common/RadioCardGroup";
import { PAYMENT_TERMS_OPTIONS } from "../../data/wizardOptions";

export default function BillingControlsStep({ value = {}, onChange }) {
  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className={Fonts.heading3}>Invoice Preferences</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure how invoices are generated and payment terms after the amount is calculated.
        </p>
      </div>

      {/* Invoice generation card */}
      <div className="rounded-xl border border-slate-200 p-6 bg-white shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Invoice generation
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Define how invoice drafts are created for this project.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Invoice Generation Mode <span className="text-red-500">*</span>
          </label>
          
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => update({ autoInvoiceGeneration: false, invoiceGenerationDay: "" })}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${
                value.autoInvoiceGeneration === false
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => update({ autoInvoiceGeneration: true })}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${
                value.autoInvoiceGeneration === true
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Automatic
            </button>
          </div>
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

      {/* Payment terms card */}
      <div className="rounded-xl border border-slate-200 p-6 bg-white shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Payment terms
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Defines when payment becomes due after an invoice is generated.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Payment Terms <span className="text-red-500">*</span>
          </label>
          <FormSelect
            name="paymentTerms"
            value={value.paymentTerms || ""}
            onChange={(event) => update({ paymentTerms: event.target.value })}
            options={PAYMENT_TERMS_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
}
