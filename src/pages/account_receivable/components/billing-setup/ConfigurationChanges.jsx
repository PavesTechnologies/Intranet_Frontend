import { createContext, useContext, useMemo } from "react";
import { GitCompareArrows } from "lucide-react";

import { formatCurrency, formatDisplayDate } from "../../utils/format";

// Renders the backend's change set for a configuration awaiting re-approval
// (BillingConfigurationResponseDto.changes: [{ field, previousValue,
// newValue, category }]). The backend snapshot is the only source of truth —
// nothing here compares values itself, and no field is hardcoded: labels,
// grouping and value formatting are all derived generically from what the
// backend sends.

const CATEGORY_ORDER = ["COMMERCIAL", "PRICING", "BILLING", "DATES", "MILESTONE", "TAX"];
// MILESTONE changes are Milestone Plan (payment plan) changes — never PMS
// milestones, which are future scope.
const CATEGORY_LABELS = { MILESTONE: "Milestone Plan" };
const OTHER_CATEGORY = "OTHER";

const MINOR_WORDS = new Set(["of", "and", "or", "to", "in", "on", "for", "per", "by"]);
const titleCase = (value) =>
  String(value)
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word, index) => (index > 0 && MINOR_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");

// "billingDate" / "billing_date" / "BILLING_DATE" -> "Billing Date"; a label
// that already reads as words ("Billing Date") is kept as sent. A trailing
// Name/Id key suffix is dropped ("taxRegionName" -> "Tax Region",
// "billingTypeId" -> "Billing Type") so labels read like the review rows.
export const humanizeChangeField = (field) => {
  const raw = String(field ?? "").trim();
  if (!raw) return "—";
  if (/\s/.test(raw)) return raw;
  const words = raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim().split(/\s+/);
  if (words.length > 1 && /^(name|id)$/i.test(words[words.length - 1])) words.pop();
  return titleCase(words.join(" "));
};

// Payment-entry changes may arrive as "Payment 1 - Billing Date",
// "entries[0].billingDate" or "paymentEntries.1.percentage" — split them
// into a "Payment n" sub-group plus the entry field, so each entry's
// changes read together.
const ENTRY_PATTERNS = [
  /^(?:entries|paymentEntries|payments|installments|milestonePlan\.entries)\s*[[.](\d+)\]?\.?(.+)$/i,
  /^(?:payment|installment)\s*#?\s*(\d+)\s*[-:.]?\s*(.+)$/i,
];

const splitEntryField = (field) => {
  const raw = String(field ?? "").trim();
  for (const pattern of ENTRY_PATTERNS) {
    const match = raw.match(pattern);
    if (match) {
      const index = Number(match[1]);
      // Bracket/dot paths are 0-based; "Payment 1" style labels are 1-based.
      const number = pattern === ENTRY_PATTERNS[0] ? index + 1 : index;
      return { entry: `Payment ${number}`, entryNumber: number, field: match[2] };
    }
  }
  return { entry: null, entryNumber: null, field: raw };
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/;
const ENUM_VALUE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$|^[A-Z]{3,}$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;
const PERCENT_TEXT = /^(-?\d+(?:\.\d+)?)\s*%$/;

// Presentation only — formats a backend value for display. Field-name hints
// ("...Percentage", "...Amount"/"...Value"/"...Budget"/"...Rate") only decide
// how a plain number is shown; the value itself is never changed.
export const formatChangeValue = (value, field, currency) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map((item) => formatChangeValue(item, field, currency)).join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);

  const text = String(value).trim();
  const fieldName = String(field || "").toLowerCase();
  if (/^(true|false)$/i.test(text)) return /^true$/i.test(text) ? "Yes" : "No";
  if (ISO_DATE.test(text)) return formatDisplayDate(text);

  // Percentages drop formatting-only trailing zeros: 100.00 -> 100%,
  // 25.50 -> 25.5% (also when the backend already appends "%").
  const percentText = text.match(PERCENT_TEXT);
  if (percentText) return `${Number(percentText[1])}%`;
  const isNumeric = /^-?\d+(?:\.\d+)?$/.test(text);
  if (isNumeric && /percent|allocation/.test(fieldName)) return `${Number(text)}%`;
  if (isNumeric && /amount|value|budget|rate|price/.test(fieldName) && currency) return formatCurrency(text, currency);
  // Other decimals lose trailing zeros (1.00 -> 1). Integers are kept exactly
  // as sent — codes/phone numbers may carry meaningful leading zeros.
  if (/^-?\d+\.\d+$/.test(text)) return String(Number(text));
  if (ENUM_VALUE.test(text) && !CURRENCY_CODE.test(text)) return titleCase(text);
  return text;
};

// A reported change whose two sides display identically (e.g. "100.00" ->
// "100" for a percentage) differs only in formatting, not in business value —
// it is left out of the displayed changes and the change count. The backend
// is expected to exclude these itself; this only guards against formatting
// noise. Any fixed currency gives the same equality result.
const COMPARISON_CURRENCY = "USD";
const isFormattingOnlyChange = (change) => {
  const { field } = splitEntryField(change.field);
  return (
    formatChangeValue(change.previousValue, field, COMPARISON_CURRENCY) ===
    formatChangeValue(change.newValue, field, COMPARISON_CURRENCY)
  );
};

export const normalizeConfigurationChanges = (changes) =>
  (Array.isArray(changes) ? changes : [])
    .filter((change) => change && (change.field || change.fieldName))
    .map((change) => ({
      field: change.field ?? change.fieldName,
      previousValue: change.previousValue ?? change.oldValue ?? null,
      newValue: change.newValue ?? change.proposedValue ?? null,
      category: String(change.category || "").trim().toUpperCase() || OTHER_CATEGORY,
    }))
    .filter((change) => !isFormattingOnlyChange(change));

// Groups changes by category (known categories first, in a fixed reading
// order) and, inside a category, collects payment-entry changes under
// "Payment n" sub-groups after the plan-level changes.
const groupChanges = (changes) => {
  const byCategory = new Map();
  changes.forEach((change) => {
    if (!byCategory.has(change.category)) byCategory.set(change.category, []);
    byCategory.get(change.category).push(change);
  });

  const rank = (category) => {
    const index = CATEGORY_ORDER.indexOf(category);
    return index === -1 ? (category === OTHER_CATEGORY ? CATEGORY_ORDER.length + 1 : CATEGORY_ORDER.length) : index;
  };

  return [...byCategory.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([category, items]) => {
      const planLevel = [];
      const entries = new Map();
      items.forEach((change) => {
        const { entry, entryNumber, field } = splitEntryField(change.field);
        const row = { ...change, label: humanizeChangeField(field), rawField: field };
        if (!entry) {
          planLevel.push(row);
        } else {
          if (!entries.has(entry)) entries.set(entry, { entry, entryNumber, rows: [] });
          entries.get(entry).rows.push(row);
        }
      });
      return {
        category,
        label: CATEGORY_LABELS[category] || (category === OTHER_CATEGORY ? "Other" : titleCase(category)),
        planLevel,
        entries: [...entries.values()].sort((a, b) => a.entryNumber - b.entryNumber),
      };
    });
};

// Lower-cased labels of every plan-level field that changed — lets review
// rows elsewhere on the page show a "Changed" indicator by label match,
// without any hardcoded field mapping.
export const getChangedFieldLabels = (changes) =>
  new Set(
    normalizeConfigurationChanges(changes)
      .filter((change) => !splitEntryField(change.field).entry)
      .map((change) => humanizeChangeField(change.field).toLowerCase())
  );

export const ChangedFieldsContext = createContext(new Set());

export function ChangedIndicator() {
  return (
    <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1 py-px text-[10px] font-medium leading-none text-amber-800">
      Changed
    </span>
  );
}

// "Changed" chip for a review row whose label matches a changed field.
export function useIsFieldChanged(label) {
  const changed = useContext(ChangedFieldsContext);
  return typeof label === "string" && changed.has(label.trim().toLowerCase());
}

// One changed field. Every row here IS a backend-reported change, so the
// subtle marker (dot + screen-reader "Changed") only reinforces that; the
// Proposed cell is lightly highlighted, Previous Approved stays neutral.
// `separated` draws the only rule in the table: a hairline between two
// consecutive change rows.
function ChangeRow({ row, currency, indent = false, separated = false }) {
  const rule = separated ? "border-t border-slate-100" : "";
  return (
    <tr className="align-top">
      <th scope="row" className={`${rule} py-1.5 pr-3 text-left font-normal text-slate-600 ${indent ? "pl-7" : "pl-5"}`}>
        <span className="flex items-start gap-1.5">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          <span className="break-words">{row.label}</span>
          <span className="sr-only">(Changed)</span>
        </span>
      </th>
      <td className={`${rule} break-words px-3 py-1.5 tabular-nums text-slate-600`}>
        {formatChangeValue(row.previousValue, row.rawField, currency)}
      </td>
      <td className={`${rule} break-words bg-amber-50/60 px-3 py-1.5 pr-5 font-medium tabular-nums text-slate-900`}>
        {formatChangeValue(row.newValue, row.rawField, currency)}
      </td>
    </tr>
  );
}

// Plain text labels — no box, background or rule.
const CATEGORY_LABEL_CLASS = "text-[11px] font-semibold uppercase tracking-wider text-slate-500";
const ENTRY_LABEL_CLASS = "text-xs font-semibold text-slate-800";

function GroupLabelRow({ label, level = 1 }) {
  return (
    <tr>
      <th
        scope="colgroup"
        colSpan={3}
        className={`px-5 text-left ${level === 1 ? `pb-0.5 pt-3 ${CATEGORY_LABEL_CLASS}` : `pb-0.5 pt-2 ${ENTRY_LABEL_CLASS}`}`}
      >
        {label}
      </th>
    </tr>
  );
}

// The labelled blocks of rows in reading order: plan-level changes, then each
// payment entry.
const toBlocks = (group) => [
  ...(group.planLevel.length ? [{ key: "plan", entry: null, rows: group.planLevel }] : []),
  ...group.entries.map((entry) => ({ key: entry.entry, entry: entry.entry, rows: entry.rows })),
];

// "Changes Pending Approval" — ONE container with ONE comparison table (Field
// | Previous Approved | Proposed), one row per backend-reported change.
// Category ("Milestone Plan") and payment-entry ("Payment 1") labels are plain
// text: when every change belongs to a single block they sit above the table;
// otherwise they are label rows inside it, under the same single header. Only
// the backend's `changes` are shown, and nothing renders when there are none.
export default function ConfigurationChanges({ changes, currency }) {
  const normalized = useMemo(() => normalizeConfigurationChanges(changes), [changes]);
  const groups = useMemo(() => groupChanges(normalized), [normalized]);

  if (normalized.length === 0) return null;

  const showCategoryLabels = groups.some((group) => group.category !== OTHER_CATEGORY);
  const blocks = groups.flatMap((group) => toBlocks(group).map((block) => ({ ...block, group })));
  const isSingleBlock = blocks.length === 1;
  const single = isSingleBlock ? blocks[0] : null;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Changes Pending Approval">
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-amber-600" />
          <h3 className="text-[15px] font-semibold text-slate-900">Changes Pending Approval</h3>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-amber-800">
          {normalized.length} {normalized.length === 1 ? "change" : "changes"}
        </span>
      </div>

      {single && (showCategoryLabels || single.entry) && (
        <div className="space-y-0.5 px-5 pb-2">
          {showCategoryLabels && <p className={CATEGORY_LABEL_CLASS}>{single.group.label}</p>}
          {single.entry && <p className={ENTRY_LABEL_CLASS}>{single.entry}</p>}
        </div>
      )}

      <table className="w-full table-fixed text-[13px]">
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[35%]" />
          <col className="w-[35%]" />
        </colgroup>
        <thead>
          <tr className="bg-slate-50 text-left text-[11px] font-medium text-slate-500">
            <th scope="col" className="py-1.5 pl-5 pr-3 font-medium">Field</th>
            <th scope="col" className="px-3 py-1.5 font-medium">Previous Approved</th>
            <th scope="col" className="bg-amber-50 px-3 py-1.5 pr-5 font-medium text-slate-600">Proposed</th>
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>*]:pb-2.5">
          {blocks.map((block, blockIndex) => {
            const isFirstOfGroup = blockIndex === 0 || blocks[blockIndex - 1].group !== block.group;
            return [
              !isSingleBlock && showCategoryLabels && isFirstOfGroup && (
                <GroupLabelRow key={`${block.group.category}-label`} label={block.group.label} />
              ),
              !isSingleBlock && block.entry && <GroupLabelRow key={`${block.key}-label`} label={block.entry} level={2} />,
              ...block.rows.map((row, index) => (
                <ChangeRow
                  key={`${block.group.category}-${block.key}-${row.field}-${index}`}
                  row={row}
                  currency={currency}
                  indent={!isSingleBlock && Boolean(block.entry)}
                  separated={index > 0}
                />
              )),
            ];
          })}
        </tbody>
      </table>
    </section>
  );
}
