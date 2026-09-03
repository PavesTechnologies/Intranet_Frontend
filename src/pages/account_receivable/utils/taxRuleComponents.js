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
