import { useState } from "react";
import { toast } from "react-toastify";
import useApLookups from "../../hooks/useApLookups";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import { usePurchaseCategoriesByDepartment } from "../../system-configuration/hooks/usePurchaseCategories";
import { useSaveOcrReviewMutation } from "./useReviewQueue";
import { getApiErrorMessage } from "../../utils/apiError";
import { INVOICE_TYPES } from "../../constants/invoiceTypes";

export const emptyReviewLine = () => ({
  description: "",
  quantity: "",
  unit_price: "",
  line_amount: "",
  tax_amount: "",
});

export const emptyReviewFields = () => ({
  invoice_number: "",
  invoice_type: "",
  invoice_date: "",
  due_date: "",
  currency_id: "",
  gross_amount: "",
  discount_amount: "",
  tax_amount: "",
  net_amount: "",
  po_id: "",
  payment_term_id: "",
  department_id: "",
  purchase_category_id: "",
});

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Shared state/logic behind PATCH .../ocr-review — used by both OcrReviewModal (queue-based
 * correction, invoiceId may be null for Path B) and InvoiceReviewEditor (inline on the invoice
 * detail page, invoiceId always set). Backing InvoiceOCRReviewRequest has every field Optional,
 * and Backend/Business_Layer/services/invoice_process_service.py's _apply_review_updates only
 * overwrites a field when the submitted value is non-null (`if value is not None:
 * setattr(...)`) — so leaving any field here blank is always safe and never destructive, it just
 * means "don't touch this field." vendor_id is the one field that's genuinely required, but only
 * for Path B (no invoiceId yet — the backend can't create the invoice without it); for an update
 * (invoiceId present) it's fine to leave blank to keep the existing vendor.
 *
 * Per apply_ocr_review, a successful save always ends with the invoice at PENDING_APPROVAL
 * (auto-approved outright if under AUTO_APPROVAL_LIMIT with no open issues) — there's no way to
 * "just save" and stay at OCR Review Pending. Sending it into the actual approval workflow
 * (matching a policy, creating InvoiceApproval/steps) is a separate, later action — see
 * useSendForApprovalMutation / InvoiceApprovalPanel.
 * @param {{ inboundDocumentId: number|string, invoiceId?: number|string|null, initial?: {vendorId?, vendorLabel?, form?: Object, lines?: Array}, onSaved?: () => void }} args
 */
export function useInvoiceReviewForm({ inboundDocumentId, invoiceId, initial, onSaved }) {
  const { currencyOptions, paymentTermOptions } = useApLookups();
  const saveReview = useSaveOcrReviewMutation();

  const [vendorId, setVendorId] = useState(initial?.vendorId ?? null);
  const [vendorLabel, setVendorLabel] = useState(initial?.vendorLabel ?? "");
  const [form, setForm] = useState({ ...emptyReviewFields(), ...(initial?.form || {}) });
  const [lines, setLines] = useState(initial?.lines?.length ? initial.lines : [emptyReviewLine()]);
  const [errors, setErrors] = useState({});

  const { data: departments = [] } = useDepartments();
  const isNonPo = form.invoice_type === INVOICE_TYPES.NON_PO;
  // Only fetched/required for NON_PO — for a PO invoice the backend derives department/category
  // from the linked purchase order and overwrites anything sent, so there's nothing to pick.
  const selectedDepartmentId = isNonPo && form.department_id ? Number(form.department_id) : undefined;
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = usePurchaseCategoriesByDepartment(selectedDepartmentId);

  const departmentOptions = departments
    .filter((d) => d.is_active)
    .map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }));
  const categoryOptions = categories
    .filter((c) => c.is_active)
    .map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }));
  const categoryPlaceholder = !selectedDepartmentId
    ? "Select department first"
    : categoriesLoading
      ? "Loading categories..."
      : categoriesError
        ? "Unable to load purchase categories."
        : categoryOptions.length === 0
          ? "No purchase categories available for this department."
          : "Select category";

  const setVendor = (id, label) => {
    setVendorId(id);
    setVendorLabel(label);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: value,
      // Changing the department invalidates whichever category was picked for the old one.
      ...(name === "department_id" ? { purchase_category_id: "" } : {}),
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleLineChange = (index, e) => {
    const { name, value } = e.target;
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [name]: value } : line)));
  };
  const addLine = () => setLines((prev) => [...prev, emptyReviewLine()]);
  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const validate = () => {
    if (!invoiceId && !vendorId) {
      toast.warning("Select a vendor before saving.");
      return false;
    }
    if (!isNonPo) return true;
    const nextErrors = {};
    if (!form.department_id) nextErrors.department_id = "Department is required.";
    if (!form.purchase_category_id) nextErrors.purchase_category_id = "Purchase category is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.warning("Department and Purchase Category are required for a Non-PO invoice.");
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    const payload = {
      vendor_id: vendorId != null ? Number(vendorId) : null,
      invoice_number: form.invoice_number || null,
      invoice_type: form.invoice_type || null,
      invoice_date: form.invoice_date || null,
      due_date: form.due_date || null,
      currency_id: toNumberOrNull(form.currency_id),
      gross_amount: toNumberOrNull(form.gross_amount),
      discount_amount: toNumberOrNull(form.discount_amount),
      tax_amount: toNumberOrNull(form.tax_amount),
      net_amount: toNumberOrNull(form.net_amount),
      po_id: toNumberOrNull(form.po_id),
      payment_term_id: toNumberOrNull(form.payment_term_id),
      // NON_PO only — for a PO invoice these are derived server-side from the linked PO and
      // would be overwritten anyway, so omitted entirely rather than sent stale/empty.
      ...(isNonPo
        ? {
            department_id: Number(form.department_id),
            purchase_category_id: Number(form.purchase_category_id),
          }
        : {}),
      lines: lines
        .filter((line) => line.description.trim())
        .map((line, index) => ({
          line_number: index + 1,
          description: line.description,
          quantity: toNumberOrNull(line.quantity),
          unit_price: toNumberOrNull(line.unit_price),
          line_amount: toNumberOrNull(line.line_amount),
          tax_amount: toNumberOrNull(line.tax_amount),
        })),
    };

    saveReview.mutate(
      { inboundDocumentId, payload, invoiceId },
      {
        onSuccess: () => {
          toast.success("Invoice details saved.");
          onSaved?.();
        },
        onError: (error) => toast.error(getApiErrorMessage(error, "Could not save invoice review.")),
      },
    );
  };

  return {
    vendorId,
    vendorLabel,
    setVendor,
    form,
    handleChange,
    lines,
    handleLineChange,
    addLine,
    removeLine,
    errors,
    isNonPo,
    departmentOptions,
    categoryOptions,
    categoryPlaceholder,
    categoriesError,
    currencyOptions,
    paymentTermOptions,
    handleSave,
    isSaving: saveReview.isPending,
  };
}
