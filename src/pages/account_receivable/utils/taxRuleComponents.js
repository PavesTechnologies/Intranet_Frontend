/**
 * Expands normalized tax-rate-configuration records into one display row per
 * configured component. Every derived row keeps a reference to the source
 * record so edit/deactivate actions apply to the whole record.
 */
export const deriveTaxComponentRows = (configs = []) => {
  const rows = [];

  configs.forEach((config) => {
    const components = Array.isArray(config.components) ? config.components : [];

    if (components.length === 0) {
      // Defensive: a record with no components still needs a visible row.
      rows.push({ component: config.taxRegime || "Tax", taxRate: null, source: config });
      return;
    }

    components.forEach((comp) => {
      rows.push({
        component: comp.taxTypeCode || comp.taxTypeName || config.taxRegime || "Tax",
        taxRate: comp.taxRate ?? null,
        source: config,
      });
    });
  });

  return rows;
};

/**
 * Rendering/validation rules per component inputType. The form looks a
 * component's inputType up here, so supporting a new input type means adding
 * an entry — the form itself does not change. Unknown types fall back to
 * DEFAULT_INPUT_TYPE (a plain non-negative number).
 */
export const TAX_COMPONENT_INPUT_TYPES = {
  PERCENTAGE: {
    unitLabel: () => "%",
    step: "0.01",
    min: 0,
    max: 100,
    placeholder: "0.00",
    invalidMessage: "Enter a valid percentage",
    rangeMessage: (min, max) => `Rate must be between ${min} and ${max}%`,
  },
  FIXED_AMOUNT: {
    unitLabel: (currencyCode) => currencyCode || "Amount",
    step: "0.01",
    min: 0,
    max: null,
    placeholder: "0.00",
    invalidMessage: "Enter a valid amount",
    rangeMessage: (min, max) =>
      max === null ? `Amount cannot be less than ${min}` : `Amount must be between ${min} and ${max}`,
  },
};

const DEFAULT_INPUT_TYPE = {
  unitLabel: () => null,
  step: "any",
  min: 0,
  max: null,
  placeholder: "0",
  invalidMessage: "Enter a valid number",
  rangeMessage: (min, max) => (max === null ? `Value cannot be less than ${min}` : `Value must be between ${min} and ${max}`),
};

export const getInputTypeConfig = (inputType) =>
  TAX_COMPONENT_INPUT_TYPES[String(inputType || "").toUpperCase()] || DEFAULT_INPUT_TYPE;

// Component metadata (minValue/maxValue) overrides the input type's defaults.
export const getComponentBounds = (component = {}) => {
  const typeConfig = getInputTypeConfig(component.inputType);
  return {
    min: component.minValue ?? typeConfig.min,
    max: component.maxValue ?? typeConfig.max,
  };
};

export const getComponentLabel = (component = {}, currencyCode) => {
  const name = component.componentName || component.taxTypeName || component.componentCode || "Component";
  const unit = getInputTypeConfig(component.inputType).unitLabel(currencyCode);
  return unit ? `${name} (${unit})` : name;
};

const sameId = (a, b) => Boolean(a) && Boolean(b) && String(a).toLowerCase() === String(b).toLowerCase();

const findConfiguredComponent = (structureComponent, config) => {
  const configured = Array.isArray(config?.components) ? config.components : [];
  return (
    configured.find((c) => sameId(c.taxComponentId, structureComponent.taxComponentId)) ||
    configured.find((c) => sameId(c.taxTypeId, structureComponent.taxTypeId))
  );
};

/**
 * Picks the regime of the structure that an existing configuration belongs to:
 * by stored regime code/name/id first, then by the regime whose components
 * cover the most of the configuration's tax types.
 */
export const resolveConfiguredRegime = (taxRegimes = [], config) => {
  if (!config || taxRegimes.length === 0) return null;

  const stored = String(config.taxRegimeId || config.taxRegime || "").trim().toLowerCase();
  if (stored) {
    const byKey = taxRegimes.find((r) =>
      [r.taxRegimeId, r.taxRegimeCode, r.taxRegimeName].some((k) => String(k || "").toLowerCase() === stored)
    );
    if (byKey) return byKey;
  }

  let best = null;
  let bestScore = 0;
  taxRegimes.forEach((regime) => {
    const score = regime.components.filter((c) => findConfiguredComponent(c, config)).length;
    if (score > bestScore) {
      best = regime;
      bestScore = score;
    }
  });
  return best;
};

/**
 * Builds the generic form state for a regime: one entry per structure
 * component, pre-filled from an existing configuration when editing.
 */
export const buildComponentValues = (regime, config) =>
  (regime?.components || []).map((component) => {
    const configured = config ? findConfiguredComponent(component, config) : null;
    const rate = configured?.taxRate;
    return {
      taxComponentId: component.taxComponentId,
      value: rate === null || rate === undefined ? "" : String(rate),
      applicabilityType: configured?.applicabilityType || component.applicabilityType || "ALL",
    };
  });

// Components of an existing configuration the selected regime has no field
// for — they would be dropped on save, so the form warns about them.
export const findUnmappedConfigComponents = (regime, config) => {
  const configured = Array.isArray(config?.components) ? config.components : [];
  if (!regime) return configured;
  return configured.filter(
    (c) =>
      !regime.components.some(
        (sc) => sameId(sc.taxComponentId, c.taxComponentId) || sameId(sc.taxTypeId, c.taxTypeId)
      )
  );
};

const parseNumber = (val) => {
  if (val === "" || val === null || val === undefined) return null;
  const str = String(val).trim();
  if (str === "") return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : NaN;
};

// A component is submitted when it has a positive value, or when the backend
// marks it required (then an explicit 0 is a deliberate value).
const isSubmittedValue = (component, num) => num !== null && !Number.isNaN(num) && (num > 0 || component.required);

/**
 * Validates component values against each component's metadata.
 * Returns { [taxComponentId]: message } plus `_components` for form-level errors.
 */
export const validateComponentValues = (regime, componentValues = []) => {
  const errors = {};
  if (!regime) return errors;

  let submittedCount = 0;

  regime.components.forEach((component) => {
    const entry = componentValues.find((v) => v.taxComponentId === component.taxComponentId);
    const num = parseNumber(entry?.value);
    const typeConfig = getInputTypeConfig(component.inputType);
    const { min, max } = getComponentBounds(component);

    if (num === null) {
      if (component.required) errors[component.taxComponentId] = "This value is required";
      return;
    }
    if (Number.isNaN(num)) {
      errors[component.taxComponentId] = typeConfig.invalidMessage;
      return;
    }
    if (num < min || (max !== null && num > max)) {
      errors[component.taxComponentId] = typeConfig.rangeMessage(min, max);
      return;
    }
    if (isSubmittedValue(component, num)) submittedCount += 1;
  });

  if (regime.components.length > 0 && submittedCount === 0 && Object.keys(errors).length === 0) {
    errors._components = "Enter a value greater than 0 for at least one tax component.";
  }

  return errors;
};

/**
 * Maps the generic form state into the backend TaxConfigurationRequestDto:
 * {
 *   taxRegionId: string (UUID),
 *   taxRegimeId?: string (UUID),
 *   taxRegime: string,
 *   effectiveFrom: string (YYYY-MM-DD),
 *   effectiveTo: string | null (YYYY-MM-DD),
 *   components: [
 *     { taxTypeId: string (UUID), taxRate: number, applicabilityType: string }
 *   ]
 * }
 * Only components of the selected regime are sent, so values left over from a
 * previously selected region/regime can never leak into the payload.
 */
export const buildTaxConfigurationPayload = ({
  taxRegionId,
  regime,
  componentValues = [],
  effectiveFrom,
  effectiveTo,
} = {}) => {
  if (!taxRegionId) {
    throw new Error("Tax region is required to configure a tax rule.");
  }
  if (!regime) {
    throw new Error("Tax regime is required.");
  }
  if (!effectiveFrom) {
    throw new Error("Effective From date is required.");
  }

  const components = [];

  regime.components.forEach((component) => {
    const entry = componentValues.find((v) => v.taxComponentId === component.taxComponentId);
    const num = parseNumber(entry?.value);
    if (!isSubmittedValue(component, num)) return;

    if (!component.taxTypeId) {
      throw new Error(`Tax type for "${component.componentName}" is not configured. Please verify the tax structure.`);
    }

    components.push({
      taxTypeId: component.taxTypeId,
      taxRate: num,
      applicabilityType: entry?.applicabilityType || component.applicabilityType || "ALL",
    });
  });

  if (components.length === 0) {
    throw new Error("At least one tax component with a valid positive rate is required.");
  }

  return {
    taxRegionId,
    ...(regime.taxRegimeId ? { taxRegimeId: regime.taxRegimeId } : {}),
    taxRegime: regime.taxRegimeCode || regime.taxRegimeName,
    effectiveFrom,
    effectiveTo: effectiveTo || null,
    components,
  };
};
