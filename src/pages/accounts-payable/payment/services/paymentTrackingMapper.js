/**
 * Raw Payment Management DTOs (Backend/API_Layer/interface/payment_interface.py:
 * InvoicePaymentSummaryDTO / InvoicePaymentDetailDTO / PaymentRecordDTO / PaymentDocumentDTO)
 * -> camelCase frontend models. Decimals arrive as JSON strings ("90000.00") and are converted to
 * numbers here so formatCurrency() can render them. Every amount is taken from the backend as-is —
 * nothing (TDS, net payable, remaining) is recomputed in the UI.
 */

const toNumber = (value) => (value === null || value === undefined || value === "" ? null : Number(value));

export function mapPaymentDocument(raw) {
  return {
    id: raw.id,
    paymentId: raw.payment_id,
    documentType: raw.document_type,
    fileName: raw.file_name,
    contentType: raw.content_type,
    fileSize: raw.file_size,
    uploadedBy: raw.uploaded_by,
    uploadedAt: raw.uploaded_at,
  };
}

export function mapPaymentRecord(raw) {
  return {
    paymentId: raw.payment_id,
    paymentDate: raw.payment_date,
    scheduledDate: raw.scheduled_date,
    amount: toNumber(raw.amount),
    paymentTotal: toNumber(raw.payment_total),
    paymentMode: raw.payment_mode,
    referenceNumber: raw.reference_number,
    remarks: raw.remarks,
    statusCode: raw.status_code,
    statusName: raw.status_name,
    recordedBy: raw.recorded_by,
    recordedAt: raw.recorded_at,
    documents: (raw.documents || []).map(mapPaymentDocument),
  };
}

export function mapInvoicePaymentSummary(raw) {
  return {
    invoiceId: raw.invoice_id,
    invoiceNumber: raw.invoice_number,
    vendorId: raw.vendor_id,
    vendorName: raw.vendor_name,
    invoiceDate: raw.invoice_date,
    dueDate: raw.due_date,
    currencyCode: raw.currency_code,
    currencySymbol: raw.currency_symbol || "₹",
    grossAmount: toNumber(raw.gross_amount),
    taxAmount: toNumber(raw.tax_amount),
    invoiceAmount: toNumber(raw.invoice_amount),
    tdsApplicable: Boolean(raw.tds_applicable),
    tdsAmount: toNumber(raw.tds_amount),
    tdsDeterminationStatus: raw.tds_determination_status,
    netPayable: toNumber(raw.net_payable),
    amountPaid: toNumber(raw.amount_paid),
    pendingAmount: toNumber(raw.pending_amount),
    remainingAmount: toNumber(raw.remaining_amount),
    statusCode: raw.status_code,
    statusName: raw.status_name,
    isOverdue: Boolean(raw.is_overdue),
    paymentCount: raw.payment_count ?? 0,
    lastPaymentDate: raw.last_payment_date,
    lastPaymentMode: raw.last_payment_mode,
    lastPaymentReference: raw.last_payment_reference,
    receiptCount: raw.receipt_count ?? 0,
    // Payment-term compliance (null until the invoice has been evaluated)
    paymentTermStatus: raw.payment_term_status ?? null,
    paymentTermReason: raw.payment_term_reason ?? null,
    dueDateVerified: raw.due_date_verified ?? null,
    contractualDueDate: raw.contractual_due_date ?? null,
    statutoryDueDate: raw.statutory_due_date ?? null,
  };
}

export function mapInvoicePaymentDetail(raw) {
  return {
    ...mapInvoicePaymentSummary(raw),
    tdsTrackingStatus: raw.tds_tracking_status,
    canRecordPayment: Boolean(raw.can_record_payment),
    payments: (raw.payments || []).map(mapPaymentRecord),
    recordedPaymentId: raw.recorded_payment_id ?? null,
  };
}

export function mapInvoicePaymentPage(raw) {
  return {
    items: (raw.items || []).map(mapInvoicePaymentSummary),
    total: raw.total ?? 0,
    page: raw.page ?? 1,
    pageSize: raw.page_size ?? 20,
  };
}

export function mapPaymentMetadata(raw) {
  return {
    paymentModes: (raw.payment_modes || []).map((m) => ({
      value: m.value,
      label: m.label,
      referenceLabel: m.reference_label || "Reference",
    })),
    documentTypes: raw.document_types || [],
    referenceRequired: Boolean(raw.reference_required),
    receiptRequired: Boolean(raw.receipt_required),
    allowedFileExtensions: raw.allowed_file_extensions || [],
    maxFileSizeBytes: raw.max_file_size_bytes ?? null,
  };
}
