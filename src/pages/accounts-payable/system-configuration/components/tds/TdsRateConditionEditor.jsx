import { useMemo } from "react";
import FormSelect from "../../../../../components/forms/FormSelect";
import FormInput from "../../../../../components/forms/FormInput";

// Fallback only — /apm/tds/config/metadata is the real source of truth for which fields/
// operators the backend actually supports (see useTdsConfigMetadata). Used when metadata hasn't
// loaded yet, or doesn't (yet) return a rate-condition section in a recognized shape.
const FALLBACK_FIELD_OPTIONS = [
  { value: "ENTITY_TYPE", label: "Entity Type" },
  { value: "RESIDENCY_TYPE", label: "Residency Type" },
];
const FALLBACK_OPERATOR_OPTIONS = [
  { value: "EQUALS", label: "Equals" },
  { value: "NOT_EQUALS", label: "Not Equals" },
  { value: "IN", label: "In" },
  { value: "NOT_IN", label: "Not In" },
];

/**
 * Parses the backend's single-line rate condition string ("ENTITY_TYPE IN INDIVIDUAL,HUF") into
 * {field, operator, values}. Only supports one condition — the backend contract given doesn't
 * describe combining multiple conditions on one rule (e.g. with AND/OR), so this doesn't invent
 * that either.
 */
export function parseRateCondition(raw) {
  if (!raw) return { field: "", operator: "EQUALS", values: "" };
  const [field = "", operator = "EQUALS", ...rest] = raw.trim().split(/\s+/);
  return { field, operator, values: rest.join(" ") };
}

/** {field, operator, values} -> "ENTITY_TYPE IN INDIVIDUAL,HUF" — whitespace in values is
 * stripped so "INDIVIDUAL, HUF" and "INDIVIDUAL,HUF" both produce the same backend string. */
export function buildRateCondition({ field, operator, values }) {
  if (!field || !String(values || "").trim()) return "";
  return `${field} ${operator} ${String(values).replace(/\s+/g, "")}`;
}

/**
 * Structured Field/Operator/Value(s) editor for the backend's Rate Condition format (see spec
 * section 7/21) — the backend does not accept arbitrary free-text descriptions like
 * "Individual/HUF" or "Plant and Machinery", only ENTITY_TYPE/RESIDENCY_TYPE conditions. Emits
 * the built backend string via onChange; never sends the structured parts directly.
 *
 * NOTE: some of this feature's original example rules (194I Plant & Machinery vs. Land &
 * Buildings; 194J Remuneration to Directors, Royalty) don't obviously map onto ENTITY_TYPE/
 * RESIDENCY_TYPE alone — if /apm/tds/config/metadata turns out to only ever return those two
 * fields, those specific rule variants may not be expressible in this structured editor as-is.
 * Flagged for confirmation rather than silently working around it.
 *
 * @param {{value: string, onChange: (raw: string) => void, metadata?: object}} props
 */
export default function TdsRateConditionEditor({ value, onChange, metadata }) {
  const parsed = useMemo(() => parseRateCondition(value), [value]);

  // Metadata's exact shape for this section isn't confirmed yet — try a few plausible key names
  // before falling back, rather than assuming one and breaking silently if it's different.
  const fieldOptions = useMemo(() => {
    const raw =
      metadata?.rate_condition_fields ?? metadata?.rateConditionFields ?? metadata?.fields ?? null;
    if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_FIELD_OPTIONS;
    return raw.map((f) => (typeof f === "string" ? { value: f, label: f } : { value: f.value ?? f.code, label: f.label ?? f.name ?? f.value }));
  }, [metadata]);

  const operatorOptions = useMemo(() => {
    const raw = metadata?.operators ?? metadata?.rate_condition_operators ?? null;
    if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_OPERATOR_OPTIONS;
    return raw.map((o) => (typeof o === "string" ? { value: o, label: o } : { value: o.value ?? o.code, label: o.label ?? o.name ?? o.value }));
  }, [metadata]);

  const update = (patch) => onChange(buildRateCondition({ ...parsed, ...patch }));

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-gray-700">Rate Condition (optional)</p>
      <div className="grid grid-cols-3 gap-3">
        <FormSelect
          options={[{ value: "", label: "None" }, ...fieldOptions]}
          value={parsed.field}
          onChange={(e) => update({ field: e.target.value })}
          placeholder="Field"
        />
        <FormSelect options={operatorOptions} value={parsed.operator} onChange={(e) => update({ operator: e.target.value })} />
        <FormInput
          name="rateConditionValues"
          placeholder="e.g. INDIVIDUAL,HUF"
          value={parsed.values}
          onChange={(e) => update({ values: e.target.value })}
          disabled={!parsed.field}
        />
      </div>
      {value && <p className="mt-1 font-mono text-xs text-gray-400">{value}</p>}
    </div>
  );
}
