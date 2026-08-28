import { useState } from "react";
import { toast } from "react-toastify";
import { Plus } from "lucide-react";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import GenericTable from "../../../../components/Table/table";
import StatusBadge from "../../../../components/status/statusbadge";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate, formatCurrency } from "../../utils/formatters";
import { useCurrencies, usePoStatuses } from "../../hooks/useApLookups";
import { usePurchaseOrders } from "../../purchase-order/hooks/usePurchaseOrders";
import { useCreatePurchaseOrder } from "../../purchase-order/hooks/usePurchaseOrderMutations";
import VendorPoForm, { DEFAULT_PO_FORM, DEFAULT_PO_LINE } from "./VendorPoForm";

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const computeLineAmount = (quantity, unitPrice) => {
  const amount = toNumber(quantity) * toNumber(unitPrice);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0";
};

const validatePoForm = (formData, lines) => {
  const errors = {};
  if (!formData.po_number?.trim()) errors.po_number = "This field is required.";

  const lineErrors = lines.map((line) => {
    const lineError = {};
    if (!line.description?.trim()) lineError.description = "Required.";
    if (!(toNumber(line.quantity) > 0)) lineError.quantity = "Must be greater than 0.";
    if (toNumber(line.unit_price) < 0) lineError.unit_price = "Must be 0 or more.";
    if (toNumber(line.tax_amount) < 0) lineError.tax_amount = "Must be 0 or more.";
    return lineError;
  });

  return { errors, lineErrors };
};

const buildPoPayload = (formData, lines, vendorId, totals) => ({
  po_number: formData.po_number.trim(),
  vendor_id: Number(vendorId),
  po_date: formData.po_date || null,
  expected_delivery_date: formData.expected_delivery_date || null,
  currency_id: formData.currency_id ? Number(formData.currency_id) : null,
  subtotal: totals.subtotal,
  tax_amount: totals.taxAmount,
  total_amount: totals.totalAmount,
  lines: lines.map((line) => ({
    item_code: line.item_code?.trim() || null,
    description: line.description.trim(),
    quantity: toNumber(line.quantity),
    unit_price: toNumber(line.unit_price),
    tax_amount: toNumber(line.tax_amount),
    line_amount: toNumber(line.line_amount),
  })),
});

/**
 * Purchase Orders for the selected vendor — Vendor Detail > PO tab.
 * @param {string} vendorId
 * @param {string} vendorName
 */
const VendorPoTab = ({ vendorId, vendorName }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_PO_FORM);
  const [lines, setLines] = useState([{ ...DEFAULT_PO_LINE }]);
  const [errors, setErrors] = useState({});
  const [lineErrors, setLineErrors] = useState([]);

  const { purchaseOrders, isLoading, isError, error } = usePurchaseOrders(vendorId);
  const { data: currencies = [] } = useCurrencies();
  const { data: poStatuses = [] } = usePoStatuses();
  const createMutation = useCreatePurchaseOrder(vendorId);

  const currencyOptions = currencies.map((c) => ({
    value: c.currency_id,
    label: `${c.currency_code} — ${c.currency_name}`,
  }));

  const openAdd = () => {
    setFormData(DEFAULT_PO_FORM);
    setLines([{ ...DEFAULT_PO_LINE }]);
    setErrors({});
    setLineErrors([]);
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleLineChange = (index, field, value) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const nextLine = { ...line, [field]: value };
        if (field === "quantity" || field === "unit_price") {
          nextLine.line_amount = computeLineAmount(nextLine.quantity, nextLine.unit_price);
        }
        return nextLine;
      }),
    );
  };

  const handleAddLine = () => setLines((prev) => [...prev, { ...DEFAULT_PO_LINE }]);

  const handleRemoveLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const totals = lines.reduce(
    (acc, line) => ({
      subtotal: acc.subtotal + toNumber(line.line_amount),
      taxAmount: acc.taxAmount + toNumber(line.tax_amount),
    }),
    { subtotal: 0, taxAmount: 0 },
  );
  totals.totalAmount = totals.subtotal + totals.taxAmount;

  const selectedCurrencySymbol =
    currencies.find((c) => c.currency_id === Number(formData.currency_id))?.symbol || "₹";

  const handleSubmit = async () => {
    const { errors: nextErrors, lineErrors: nextLineErrors } = validatePoForm(formData, lines);
    setErrors(nextErrors);
    setLineErrors(nextLineErrors);
    const hasLineErrors = nextLineErrors.some((le) => Object.keys(le).length > 0);
    if (Object.keys(nextErrors).length > 0 || hasLineErrors) return;

    const payload = buildPoPayload(formData, lines, vendorId, totals);

    try {
      await createMutation.mutateAsync(payload);
      toast.success("Purchase order created.");
      setIsModalOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to create purchase order."));
    }
  };

  const rows = purchaseOrders.map((po) => {
    const status = poStatuses.find((s) => s.status_id === po.status_id);
    const currency = currencies.find((c) => c.currency_id === po.currency_id);
    const symbol = currency?.symbol || "₹";
    return {
      poNumber: po.po_number,
      poDate: formatDate(po.po_date),
      expectedDelivery: formatDate(po.expected_delivery_date),
      currency: currency?.currency_code || "—",
      status: status ? <StatusBadge label={status.status_name} size="sm" /> : "—",
      subtotal: formatCurrency(Number(po.subtotal) || 0, symbol),
      tax: formatCurrency(Number(po.tax_amount) || 0, symbol),
      total: formatCurrency(Number(po.total_amount) || 0, symbol),
    };
  });

  if (isError) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
        {getApiErrorMessage(error, "Unable to load purchase orders right now.")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add PO
        </Button>
      </div>

      {!isLoading && purchaseOrders.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No purchase orders found for this vendor.
        </div>
      ) : (
        <GenericTable
          headers={["PO Number", "PO Date", "Expected Delivery", "Currency", "Status", "Subtotal", "Tax", "Total"]}
          columns={["poNumber", "poDate", "expectedDelivery", "currency", "status", "subtotal", "tax", "total"]}
          rows={rows}
          loading={isLoading}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add PO"
        size="3xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending} loadingText="Saving...">
              Save
            </Button>
          </div>
        }
      >
        <VendorPoForm
          vendorName={vendorName}
          formData={formData}
          errors={errors}
          onChange={handleChange}
          currencyOptions={currencyOptions}
          lines={lines}
          lineErrors={lineErrors}
          onLineChange={handleLineChange}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
          totals={totals}
          currencySymbol={selectedCurrencySymbol}
        />
      </Modal>
    </div>
  );
};

export default VendorPoTab;
