/**
 * Expands normalized tax-rate-configuration records into per-component display
 * rows: a CGST+SGST record becomes two rows ("CGST", "SGST"), an IGST-only
 * record becomes one ("IGST"). Every derived row keeps a reference to the
 * source record so edit/deactivate actions apply to the whole record.
 */
export const deriveTaxComponentRows = (configs = []) => {
  const rows = [];

  configs.forEach((config) => {
    const hasCgst = config.cgstRate !== null && config.cgstRate !== undefined;
    const hasSgst = config.sgstRate !== null && config.sgstRate !== undefined;
    const hasIgst = config.igstRate !== null && config.igstRate !== undefined;

    if (hasCgst) {
      rows.push({ component: "CGST", cgstRate: config.cgstRate, sgstRate: null, igstRate: null, source: config });
    }
    if (hasSgst) {
      rows.push({ component: "SGST", cgstRate: null, sgstRate: config.sgstRate, igstRate: null, source: config });
    }
    if (hasIgst) {
      rows.push({ component: "IGST", cgstRate: null, sgstRate: null, igstRate: config.igstRate, source: config });
    }
    if (!hasCgst && !hasSgst && !hasIgst) {
      // Defensive: a record with no populated rate still needs a visible row.
      rows.push({ component: config.taxRegime || "Tax", cgstRate: null, sgstRate: null, igstRate: null, source: config });
    }
  });

  return rows;
};

const parsePositiveRate = (val) => {
  if (val === "" || val === null || val === undefined) return null;
  const str = String(val).trim();
  if (str === "") return null;
  const num = Number(str);
  return isNaN(num) || num <= 0 ? null : num;
};

/**
 * Maps frontend UI form state and selected region into the backend
 * component-based TaxConfigurationRequestDto payload.
 *
 * Backend expects:
 * {
 *   taxRegionId: string (UUID),
 *   taxRegime: string,
 *   effectiveFrom: string (YYYY-MM-DD),
 *   effectiveTo: string | null (YYYY-MM-DD),
 *   components: [
 *     { taxTypeId: string (UUID), taxRate: number, applicabilityType: string }
 *   ]
 * }
 */
export const buildTaxConfigurationPayload = (formData = {}, region = {}, taxTypes = []) => {
  const taxRegionId = region?.taxRegionId || region?.id;
  if (!taxRegionId) {
    throw new Error("Tax region is required to configure a tax rule.");
  }

  const taxRegime = (formData?.taxRegime || region?.taxRegime || "GST").trim();
  if (!taxRegime) {
    throw new Error("Tax regime is required.");
  }

  const effectiveFrom = formData?.effectiveFrom;
  if (!effectiveFrom) {
    throw new Error("Effective From date is required.");
  }

  const effectiveTo = formData?.effectiveTo ? formData.effectiveTo : null;

  const cgstRate = parsePositiveRate(formData?.cgstRate);
  const sgstRate = parsePositiveRate(formData?.sgstRate);
  const igstRate = parsePositiveRate(formData?.igstRate);

  const findTaxType = (targetCode) => {
    return (taxTypes || []).find((t) => {
      const code = (t?.taxTypeCode || t?.code || "").trim().toUpperCase();
      return code === targetCode.toUpperCase();
    });
  };

  const components = [];

  if (cgstRate !== null) {
    const cgstType = findTaxType("CGST");
    const taxTypeId = cgstType?.taxTypeId || cgstType?.id;
    if (!taxTypeId) {
      console.error("[taxRuleComponents] Active CGST tax type master not found in taxTypes:", taxTypes);
      throw new Error("Active CGST tax type record was not found. Please verify Tax Type Master configuration.");
    }
    components.push({
      taxTypeId,
      taxRate: cgstRate,
      applicabilityType: "SAME_JURISDICTION",
    });
  }

  if (sgstRate !== null) {
    const sgstType = findTaxType("SGST");
    const taxTypeId = sgstType?.taxTypeId || sgstType?.id;
    if (!taxTypeId) {
      console.error("[taxRuleComponents] Active SGST tax type master not found in taxTypes:", taxTypes);
      throw new Error("Active SGST tax type record was not found. Please verify Tax Type Master configuration.");
    }
    components.push({
      taxTypeId,
      taxRate: sgstRate,
      applicabilityType: "SAME_JURISDICTION",
    });
  }

  if (igstRate !== null) {
    const igstType = findTaxType("IGST");
    const taxTypeId = igstType?.taxTypeId || igstType?.id;
    if (!taxTypeId) {
      console.error("[taxRuleComponents] Active IGST tax type master not found in taxTypes:", taxTypes);
      throw new Error("Active IGST tax type record was not found. Please verify Tax Type Master configuration.");
    }
    components.push({
      taxTypeId,
      taxRate: igstRate,
      applicabilityType: "DIFFERENT_JURISDICTION",
    });
  }

  if (components.length === 0) {
    throw new Error("At least one tax component with a valid positive rate is required.");
  }

  return {
    taxRegionId,
    taxRegime,
    effectiveFrom,
    effectiveTo,
    components,
  };
};
