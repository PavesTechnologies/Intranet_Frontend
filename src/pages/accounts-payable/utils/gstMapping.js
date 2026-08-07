// src/pages/accounts-payable/utils/gstMapping.js

/**
 * Field mapping from GET /apm/system/gstin/{gstin} onto the Vendor/Vendor
 * Address forms. The endpoint passes through a third-party GST lookup
 * response verbatim as `{ data: {...} }` — these paths (lgnm, tradeNam,
 * dty, ctb, sts, pradr.addr.*) are the confirmed real field names for that
 * response, not a guess.
 */

/** GSTIN structure: 2-digit state code + 10-char PAN + entity/checksum. */
export const extractPanFromGstin = (gstin) => (gstin ? gstin.slice(2, 12).toUpperCase() : "");

/**
 * Vendor-entity-shaped fields. Only `vendor_name` (from legal_name) and
 * `pan_number` map onto real Vendor columns — the rest (trade_name,
 * tax_type, business_type, gst_status) have no backend column and are
 * for read-only display only.
 */
export const mapGstinResponseToVendorFields = (gstDetails) => ({
  vendor_name: gstDetails.lgnm || "",
  pan_number: extractPanFromGstin(gstDetails.gstin),
  registration_number: gstDetails.gstin || "",
  legal_name: gstDetails.lgnm || "",
  trade_name: gstDetails.tradeNam || "",
  tax_type: gstDetails.dty || "",
  business_type: gstDetails.ctb || "",
  gst_status: gstDetails.sts || "",
});

/**
 * VendorAddressCreateRequest-shaped fields (district has no backend
 * column, so it's folded into address_line_2 alongside the street).
 */
export const mapGstinResponseToAddressFields = (gstDetails) => {
  const addr = gstDetails?.pradr?.addr || {};

  return {
    address_line1: [addr.bno, addr.bnm].filter(Boolean).join(" ").trim(),
    address_line2: [addr.st, addr.dst].filter(Boolean).join(", "),
    city: addr.loc || "",
    state: addr.stcd || "",
    postal_code: addr.pncd || "",
  };
};

export const findIndiaCountryId = (countryOptions = []) =>
  countryOptions.find((c) => c.label?.toLowerCase() === "india")?.value;
