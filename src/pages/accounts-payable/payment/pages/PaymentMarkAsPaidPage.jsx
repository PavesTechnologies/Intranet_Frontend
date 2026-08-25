import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import VendorPicker from "../../vendor/components/VendorPicker";
import { useInvoiceDetail } from "../../invoice/hooks/useInvoiceDetail";
import { useVendorDetail } from "../../vendor/hooks/useVendorDetail";
import { useCreatePaymentMutation } from "../hooks/usePaymentMutations";
import { useApLookups } from "../../hooks/useApLookups";
import { PAYMENT_METHOD_OPTIONS } from "../../constants/paymentStatus";
import { AP_ROUTES } from "../../constants/routes";
import { formatCurrency, calculateBalance } from "../../utils/formatters";
import { getApiErrorMessage } from "../../utils/apiError";

/**
 * Creates a payment for one invoice via POST /apm/payment. InvoiceDetailsResponse doesn't carry
 * a vendor_id (only vendor_name), so the vendor has to be resolved by name search — same
 * VendorPicker used in OCR review, seeded here with the invoice's vendor name.
 */
export default function PaymentMarkAsPaidPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { data: invoice, isLoading, isError, error } = useInvoiceDetail(invoiceId);
  const { currencyOptions } = useApLookups();
  const createPayment = useCreatePaymentMutation();

  const [vendorId, setVendorId] = useState(null);
  const [vendorLabel, setVendorLabel] = useState("");
  const { banks } = useVendorDetail(vendorId);

  const [form, setForm] = useState({
    vendor_bank_id: "",
    currency_id: "",
    payment_method: "",
    scheduled_date: "",
    reference_number: "",
    allocated_amount: "",
  });

  useEffect(() => {
    if (invoice) {
      setForm((f) => ({
        ...f,
        allocated_amount: calculateBalance(invoice.netAmount, invoice.amountPaid),
      }));
    }
  }, [invoice]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const bankOptions = (banks || []).map((bank) => ({
    value: bank.vendor_bank_id,
    label: `${bank.bank_name} — ${bank.account_holder_name}${bank.is_primary ? " (Primary)" : ""}`,
  }));

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading invoice..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <PageHeader title="Mark as Paid" />
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">{getApiErrorMessage(error, "Unable to load this invoice right now.")}</p>
        </div>
      </div>
    );
  }

  const balance = calculateBalance(invoice.netAmount, invoice.amountPaid);
  const symbol = invoice.currency?.symbol || "₹";

  const handleSubmit = () => {
    if (!vendorId) {
      toast.warning("Select the paying vendor first.");
      return;
    }
    if (!form.currency_id || !form.payment_method || !form.scheduled_date || !form.allocated_amount) {
      toast.warning("Fill in currency, payment method, scheduled date, and amount.");
      return;
    }

    createPayment.mutate(
      {
        vendor_id: Number(vendorId),
        scheduled_date: form.scheduled_date,
        currency_id: Number(form.currency_id),
        payment_method: form.payment_method,
        vendor_bank_id: form.vendor_bank_id ? Number(form.vendor_bank_id) : null,
        reference_number: form.reference_number || null,
        allocations: [{ invoice_id: Number(invoiceId), allocated_amount: Number(form.allocated_amount) }],
      },
      {
        onSuccess: () => {
          toast.success(`Payment created for invoice ${invoice.invoiceNumber}.`);
          navigate(AP_ROUTES.PAYMENT_HISTORY);
        },
        onError: (err) => toast.error(getApiErrorMessage(err, "Could not create this payment — the backend validates the remaining payable amount.")),
      },
    );
  };

  return (
    <div className="p-6">
      <PageHeader
        title={`Pay Invoice ${invoice.invoiceNumber}`}
        subtitle={`Outstanding balance: ${formatCurrency(balance, symbol)}`}
        actions={
          <Button variant="outline" onClick={() => navigate(AP_ROUTES.PAYMENT_READY)}>
            <ArrowLeft className="h-4 w-4" /> Back to Ready for Payment
          </Button>
        }
      />

      <PageCard>
        <PageCardContent>
          <div className="space-y-4">
            <VendorPicker
              vendorId={vendorId}
              vendorLabel={vendorLabel}
              initialQuery={invoice.vendor?.name || ""}
              onSelect={(id, label) => {
                setVendorId(id);
                setVendorLabel(label);
                setForm((f) => ({ ...f, vendor_bank_id: "" }));
              }}
            />
            {invoice.vendor?.name && !vendorId && (
              <p className="text-xs text-gray-500">
                Search and select "{invoice.vendor.name}" above — the invoice record doesn't carry a vendor ID directly.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormSelect
                label="Vendor Bank Account"
                name="vendor_bank_id"
                options={[{ value: "", label: bankOptions.length ? "Select bank account" : "No bank accounts on file" }, ...bankOptions]}
                value={form.vendor_bank_id}
                onChange={handleChange}
              />
              <FormSelect
                label="Currency"
                name="currency_id"
                options={[{ value: "", label: "Select currency" }, ...currencyOptions]}
                value={form.currency_id}
                onChange={handleChange}
              />
              <FormSelect
                label="Payment Method"
                name="payment_method"
                options={[{ value: "", label: "Select method" }, ...PAYMENT_METHOD_OPTIONS]}
                value={form.payment_method}
                onChange={handleChange}
              />
              <FormDatePicker label="Scheduled Date" name="scheduled_date" value={form.scheduled_date} onChange={handleChange} />
              <FormInput label="Reference Number" name="reference_number" value={form.reference_number} onChange={handleChange} placeholder="Optional" />
              <FormInput
                label="Amount to Pay"
                name="allocated_amount"
                type="number"
                value={form.allocated_amount}
                onChange={handleChange}
              />
            </div>

            <div className="flex justify-end">
              <Button variant="primary" onClick={handleSubmit} loading={createPayment.isPending}>
                Create Payment
              </Button>
            </div>
          </div>
        </PageCardContent>
      </PageCard>
    </div>
  );
}
