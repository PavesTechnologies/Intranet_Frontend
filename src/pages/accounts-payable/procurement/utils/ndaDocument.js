/**
 * Builds the editable NDA document body shown in the NDA editor.
 *
 * Two kinds of content live in the document and are visually distinguished so the user can
 * tell at a glance what they may change:
 *
 *  - System-populated fields (vendor / PR identity, dates, template scope) come from data the
 *    backend already holds. They render inside `contenteditable="false"` spans so a stray
 *    keystroke cannot silently rewrite the vendor a legal document names.
 *  - Editable fields (purpose, business requirement, party details the system does not hold)
 *    stay editable, and a value the system does not have is rendered as a visible placeholder
 *    rather than a guess — nothing here invents a vendor address, tax id or company name.
 *
 * The output is a plain HTML string fed to the contentEditable surface, matching the
 * rich-text approach already used in EmployeeProfileView.jsx (contentEditable +
 * document.execCommand); no editor library is bundled for this.
 */

export const NDA_SYSTEM_FIELD_CLASS = "nda-field-system";
export const NDA_EDITABLE_FIELD_CLASS = "nda-field-editable";

/** Everything interpolated into the document goes through this — values are user/vendor data. */
export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * A value the backend supplied. Locked against editing so the NDA keeps naming the vendor and
 * requisition the requirement was decided against.
 */
const systemField = (value, field) =>
  `<span class="${NDA_SYSTEM_FIELD_CLASS}" contenteditable="false" data-nda-field="${escapeHtml(
    field,
  )}">${escapeHtml(value)}</span>`;

/**
 * A value the user may write. When the system genuinely has no value, the placeholder says so
 * instead of filling in a plausible-looking one.
 */
const editableField = (value, field, placeholder) =>
  value
    ? `<span class="${NDA_EDITABLE_FIELD_CLASS}" data-nda-field="${escapeHtml(field)}">${escapeHtml(
        value,
      )}</span>`
    : `<span class="${NDA_EDITABLE_FIELD_CLASS} ${NDA_EDITABLE_FIELD_CLASS}--empty" data-nda-field="${escapeHtml(
        field,
      )}">${escapeHtml(placeholder)}</span>`;

/**
 * Renders a value the backend holds, or — when it does not hold one — an editable placeholder.
 * Used for fields like the vendor address that the vendor record may or may not carry.
 */
const systemOrEditable = (value, field, placeholder) =>
  value ? systemField(value, field) : editableField(null, field, placeholder);

/**
 * @param {{
 *   vendorName?:string, vendorEmail?:string, vendorCode?:string, vendorAddress?:string,
 *   vendorTaxId?:string, prNumber?:string, prDate?:string, departmentName?:string,
 *   categoryName?:string, businessRequirement?:string, ndaDate?:string,
 *   companyName?:string, companyAddress?:string, validUntil?:string,
 * }} context
 * @returns {string} HTML for the editor surface.
 */
export function buildNdaDocumentHtml(context = {}) {
  const {
    vendorName,
    vendorEmail,
    vendorCode,
    vendorAddress,
    vendorTaxId,
    prNumber,
    prDate,
    departmentName,
    categoryName,
    businessRequirement,
    ndaDate,
    companyName,
    companyAddress,
    validUntil,
  } = context;

  const vendor = systemField(vendorName || "—", "vendor_name");
  const company = systemOrEditable(companyName, "company_name", "[Disclosing party name]");

  return `
<h1 style="text-align:center">NON-DISCLOSURE AGREEMENT</h1>
<p style="text-align:center">Reference: ${systemField(prNumber || "—", "pr_number")} &middot; Dated ${systemField(
    ndaDate || "—",
    "nda_date",
  )}</p>

<h2>1. Parties</h2>
<p>This Non-Disclosure Agreement (the &quot;Agreement&quot;) is entered into on ${systemField(
    ndaDate || "—",
    "nda_date",
  )} between:</p>
<p><strong>Disclosing Party:</strong> ${company}, having its registered office at ${systemOrEditable(
    companyAddress,
    "company_address",
    "[Registered office address]",
  )}.</p>
<p><strong>Receiving Party:</strong> ${vendor} (Vendor Code ${systemField(
    vendorCode || "—",
    "vendor_code",
  )}), having its place of business at ${systemOrEditable(
    vendorAddress,
    "vendor_address",
    "[Vendor address]",
  )}${
    vendorTaxId ? `, tax registration ${systemField(vendorTaxId, "vendor_tax_id")}` : ""
  }, contactable at ${systemField(vendorEmail || "—", "vendor_email")}.</p>

<h2>2. Purpose</h2>
<p>The parties wish to exchange confidential information in connection with purchase requisition ${systemField(
    prNumber || "—",
    "pr_number",
  )} dated ${systemField(prDate || "—", "pr_date")}, raised by the ${systemField(
    departmentName || "—",
    "department",
  )} department under the ${systemField(
    categoryName || "—",
    "purchase_category",
  )} purchase category (the &quot;Purpose&quot;).</p>
<p>The business requirement for this engagement is: ${editableField(
    businessRequirement,
    "business_requirement",
    "[Describe the business requirement for this engagement]",
  )}</p>
<p>Procurement-specific purpose and scope: ${editableField(
    null,
    "procurement_purpose",
    "[Add any procurement-specific purpose, scope or exclusions agreed for this vendor]",
  )}</p>

<h2>3. Confidential Information</h2>
<p>&quot;Confidential Information&quot; means all non-public information disclosed by the Disclosing Party to the Receiving Party, in any form, relating to the Purpose — including pricing, specifications, designs, processes, customer and employee data, and commercial terms — whether or not marked confidential at the time of disclosure.</p>

<h2>4. Obligations of the Receiving Party</h2>
<ol>
  <li>Keep all Confidential Information strictly confidential and use it solely for the Purpose.</li>
  <li>Disclose it only to personnel who need it for the Purpose and who are bound by equivalent obligations.</li>
  <li>Apply no lesser standard of care than it applies to its own confidential information.</li>
  <li>Not copy, reverse engineer or commercially exploit the Confidential Information.</li>
  <li>Notify the Disclosing Party promptly on becoming aware of any unauthorised use or disclosure.</li>
</ol>

<h2>5. Exclusions</h2>
<p>The obligations above do not apply to information that is or becomes public through no fault of the Receiving Party, was lawfully known to it before disclosure, is independently developed without reference to the Confidential Information, or is required to be disclosed by law or a competent authority — in which case the Receiving Party shall give prompt written notice where legally permitted.</p>

<h2>6. Term</h2>
<p>This Agreement takes effect on ${systemField(
    ndaDate || "—",
    "nda_date",
  )} and remains in force until ${systemOrEditable(
    validUntil,
    "valid_until",
    "[Validity end date]",
  )}. The confidentiality obligations survive expiry for the period stated in ${editableField(
    null,
    "survival_period",
    "[Survival period, e.g. three (3) years from expiry]",
  )}.</p>

<h2>7. No Licence or Commitment</h2>
<p>Nothing in this Agreement grants any licence or intellectual property right, nor obliges either party to proceed with any transaction, purchase order or award arising from the Purpose.</p>

<h2>8. Additional Terms</h2>
<p>${editableField(
    null,
    "additional_terms",
    "[Add any additional clauses agreed for this vendor, or leave blank]",
  )}</p>

<h2>9. Governing Law</h2>
<p>This Agreement is governed by the laws of ${editableField(
    null,
    "governing_law",
    "[Governing jurisdiction]",
  )}, and the parties submit to the exclusive jurisdiction of its courts.</p>

<h2>10. Signatures</h2>
<p>For and on behalf of the Disclosing Party:</p>
<p class="nda-sign-line">Name: ${editableField(
    null,
    "company_signatory_name",
    "[Authorised signatory name]",
  )}</p>
<p class="nda-sign-line">Designation: ${editableField(
    null,
    "company_signatory_title",
    "[Designation]",
  )}</p>
<p class="nda-sign-line">Date: ${systemField(ndaDate || "—", "nda_date")}</p>
<p>For and on behalf of ${vendor}:</p>
<p class="nda-sign-line">Name: ${editableField(
    null,
    "vendor_signatory_name",
    "[Vendor signatory name]",
  )}</p>
<p class="nda-sign-line">Designation: ${editableField(
    null,
    "vendor_signatory_title",
    "[Designation]",
  )}</p>
<p class="nda-sign-line">Date: ${editableField(
    null,
    "vendor_signature_date",
    "[Date of signature]",
  )}</p>
`.trim();
}

export default buildNdaDocumentHtml;
