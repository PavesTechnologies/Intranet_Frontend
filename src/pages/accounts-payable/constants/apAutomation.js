/**
 * Touchless PO-invoice automation (Backend/API_Layer/routes/ap_automation_route.py).
 * AP_AUTOMATION_MANAGE (Finance Manager): switch, tolerances, auto-approval limit, statistics.
 */
export const AP_AUTOMATION_PERMISSIONS = {
  AP_AUTOMATION_MANAGE: "AP_AUTOMATION_MANAGE",
};

/** Outcome of one automation run on an invoice (audit_log AP_AUTOMATION_RESULT). */
export const AUTOMATION_OUTCOME = {
  AUTO_APPROVED: { label: "Auto-approved", tone: "emerald" },
  AUTO_SENT: { label: "Sent for approval automatically", tone: "blue" },
  REVIEWED_NOT_SENT: { label: "Reviewed automatically, not sent", tone: "amber" },
  EXCEPTION: { label: "Needs review", tone: "amber" },
};
