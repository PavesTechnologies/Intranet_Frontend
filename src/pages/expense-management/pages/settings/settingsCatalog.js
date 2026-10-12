/**
 * The configuration keys the backend actually reads. Keys and defaults must match the backend
 * exactly - a key with no stored row uses `defaultValue` there. `defaultValue: null` means the
 * feature is off until set, shown as `defaultLabel`.
 */

export const SETTING_TYPES = {
  EMPLOYEE: "EMPLOYEE_ID",
  INTEGER: "INTEGER",
  DECIMAL: "DECIMAL",
  STRING: "STRING",
};

export const SETTINGS_CATALOG = [
  {
    group: "Approvals",
    settings: [
      {
        key: "approval.default-approver-employee-id",
        label: "Default approver",
        type: SETTING_TYPES.EMPLOYEE,
        defaultValue: null,
        defaultLabel: "Not set",
        description:
          "Takes a report when the submitter would otherwise approve their own report and no delegate or manager can. Without it, such submissions are blocked.",
      },
      {
        key: "approval.sla.business-days",
        label: "Approval deadline (business days)",
        type: SETTING_TYPES.INTEGER,
        min: 1,
        step: 1,
        defaultValue: 3,
        description: "Business days an approver has before an assignment is overdue.",
      },
    ],
  },
  {
    group: "Finance verification",
    settings: [
      {
        key: "finance.material-change.amount-threshold-percent",
        label: "Material change threshold (%)",
        type: SETTING_TYPES.DECIMAL,
        min: 0,
        step: "any",
        defaultValue: 10,
        description:
          "When a corrected report's total changes by at least this percentage, the approval chain restarts instead of resuming.",
      },
      {
        key: "finance.material-change.amount-threshold-absolute",
        label: "Material change threshold (amount)",
        type: SETTING_TYPES.DECIMAL,
        min: 0,
        step: "any",
        defaultValue: 0,
        zeroLabel: "Off",
        hint: "In base currency.",
        description: "A total change of at least this amount also restarts the chain. 0 turns this check off.",
      },
    ],
  },
  {
    group: "Cash advances",
    settings: [
      {
        key: "cash_advance.max_amount",
        label: "Maximum advance amount",
        type: SETTING_TYPES.DECIMAL,
        min: 0,
        minExclusive: true,
        step: "any",
        defaultValue: null,
        defaultLabel: "No limit",
        description: "Largest cash advance an employee can request. Leave unset for no limit.",
      },
    ],
  },
  {
    group: "Tax",
    settings: [
      {
        key: "TAX_ROUNDING_TOLERANCE_MINOR_UNITS",
        label: "Tax rounding tolerance (minor units)",
        type: SETTING_TYPES.DECIMAL,
        min: 0,
        step: "any",
        defaultValue: 1,
        description:
          "Allowed difference, per tax component, between entered and calculated tax before it counts as an override (e.g. 1 = one paisa).",
      },
      {
        key: "TAX_OCR_TOLERANCE_ABSOLUTE",
        label: "OCR tax tolerance (amount)",
        type: SETTING_TYPES.DECIMAL,
        min: 0,
        step: "any",
        defaultValue: 1,
        description: "Entered tax may differ from the receipt's scanned tax by this much without being flagged.",
      },
      {
        key: "TAX_OCR_TOLERANCE_PERCENT",
        label: "OCR tax tolerance (%)",
        type: SETTING_TYPES.DECIMAL,
        min: 0,
        step: "any",
        defaultValue: 1,
        description: "Percentage tolerance for the same check; the larger of the two tolerances applies.",
      },
      {
        key: "TAX_OCR_MIN_CONFIDENCE",
        label: "Minimum OCR confidence (%)",
        type: SETTING_TYPES.DECIMAL,
        min: 0,
        max: 100,
        step: "any",
        defaultValue: 80,
        description: "Scanned tax below this confidence isn't compared at all.",
      },
      {
        key: "TAX_JOURNAL_EMPLOYEE_PAYABLE_GL",
        label: "Employee payable GL account",
        type: SETTING_TYPES.STRING,
        maxLength: 255,
        defaultValue: "EMPLOYEE_PAYABLE",
        description: "GL account code credited for employee payables in the tax journal.",
      },
    ],
  },
];

export const CATALOG_KEYS = new Set(SETTINGS_CATALOG.flatMap((g) => g.settings.map((s) => s.key)));

export const isNumericSetting = (setting) =>
  setting.type === SETTING_TYPES.INTEGER || setting.type === SETTING_TYPES.DECIMAL;

/** Human-readable form of a value for this setting (employee values are rendered separately). */
export const formatSettingValue = (setting, value) => {
  if (value === null || value === undefined || value === "") return setting.defaultLabel || "—";
  if (setting.zeroLabel && isNumericSetting(setting) && Number(value) === 0) return `0 (${setting.zeroLabel})`;
  return String(value);
};

/** Returns an error message, or "" when `raw` is a valid value for `setting`. */
export const validateSettingValue = (setting, raw) => {
  const value = typeof raw === "string" ? raw.trim() : raw;

  if (setting.type === SETTING_TYPES.EMPLOYEE) {
    return value ? "" : "Select an employee.";
  }

  if (setting.type === SETTING_TYPES.STRING) {
    if (!value) return "Enter a value.";
    if (setting.maxLength && value.length > setting.maxLength) {
      return `Must be ${setting.maxLength} characters or fewer.`;
    }
    return "";
  }

  if (value === "" || value === null || value === undefined) return "Enter a value.";
  const pattern = setting.type === SETTING_TYPES.INTEGER ? /^-?\d+$/ : /^-?(\d+(\.\d+)?|\.\d+)$/;
  if (!pattern.test(String(value))) {
    return setting.type === SETTING_TYPES.INTEGER ? "Enter a whole number." : "Enter a number.";
  }

  const num = Number(value);
  if (setting.min !== undefined) {
    if (setting.minExclusive && num <= setting.min) return `Must be greater than ${setting.min}.`;
    if (!setting.minExclusive && num < setting.min) return `Must be at least ${setting.min}.`;
  }
  if (setting.max !== undefined && num > setting.max) return `Must be at most ${setting.max}.`;
  return "";
};
