// Maps a backend billing_type_master name to the label shown in the UI.
// The backend/master-data record name ("Timesheet Based") and its
// billingTypeId are never changed — this only affects what users see.
const BILLING_TYPE_DISPLAY_NAME_OVERRIDES = {
  "Timesheet Based": "Time & Material",
};

// Some environments' billing_type_master record for the Recurring billing
// type is named "Subscription" (or a close variant) instead of "Recurring" —
// mirrors the synonyms billingConfigurationService's normalizeBillingTypeValue
// already treats as RECURRING. This is unrelated to billingMode "SUBSCRIPTION"
// (see BILLING_MODE_LABELS in wizardOptions.js), which is a distinct, legitimate
// pricing mode under Recurring and must keep showing "Subscription" as-is.
const RECURRING_TYPE_NAME_PATTERN = /^(subscription([\s_-]?based)?|recurring([\s_-]?billing)?)$/i;

export function getBillingTypeDisplayName(billingTypeName) {
  if (!billingTypeName) return billingTypeName;
  if (BILLING_TYPE_DISPLAY_NAME_OVERRIDES[billingTypeName]) {
    return BILLING_TYPE_DISPLAY_NAME_OVERRIDES[billingTypeName];
  }
  if (RECURRING_TYPE_NAME_PATTERN.test(String(billingTypeName).trim())) {
    return "Recurring";
  }
  return billingTypeName;
}
