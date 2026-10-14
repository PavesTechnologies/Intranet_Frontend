/** Credit / debit notes - mirrors Backend vendor_note_service.py. */
export const VENDOR_NOTE_MANAGE_PERMISSIONS = ["VENDOR_NOTE_MANAGE", "PAYMENT_PROCESS", "AP_AUTOMATION_MANAGE"];
export const VENDOR_NOTE_VIEW_PERMISSIONS = [...VENDOR_NOTE_MANAGE_PERMISSIONS, "PAYMENT_VIEW", "INVOICE_VIEW"];

export const NOTE_TYPE = {
  CREDIT_NOTE: { label: "Credit note", hint: "Issued by the vendor - lowers what we owe and the GST credit we claim" },
  DEBIT_NOTE: { label: "Debit note", hint: "Raised by us on the vendor (short supply, rate difference) - lowers what we owe, no GST" },
};

export const NOTE_STATUS = {
  OPEN: { label: "Not applied", tone: "bg-amber-50 text-amber-700 ring-amber-200" },
  APPLIED: { label: "Applied", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  CANCELLED: { label: "Cancelled", tone: "bg-slate-100 text-slate-500 ring-slate-200" },
};
