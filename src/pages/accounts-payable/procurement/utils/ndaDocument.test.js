import { describe, it, expect } from "vitest";
import {
  buildNdaDocumentHtml,
  escapeHtml,
  NDA_EDITABLE_FIELD_CLASS,
  NDA_SYSTEM_FIELD_CLASS,
} from "./ndaDocument";

const FULL_CONTEXT = {
  vendorName: "ZIRA TECH LASER",
  vendorEmail: "zira34@gmail.com",
  vendorCode: "V-1043",
  vendorAddress: "12 Industrial Estate, Pune, MH 411001",
  vendorTaxId: "GSTIN 27AABCZ1234H1Z5",
  prNumber: "PR-25",
  prDate: "12 Mar 2026",
  departmentName: "Engineering",
  categoryName: "IT Services",
  businessRequirement: "Laser cutting subcontracting for the Q2 enclosure build",
  ndaDate: "21 Mar 2026",
  validUntil: "21 Mar 2027",
};

/** Pulls the text of every span carrying the given field class. */
const fieldsWithClass = (html, className) =>
  [...html.matchAll(new RegExp(`<span class="${className}[^"]*"[^>]*>([^<]*)</span>`, "g"))].map(
    (match) => match[1],
  );

describe("buildNdaDocumentHtml — system vs editable content", () => {
  it("locks the vendor and PR identity the requirement was decided against", () => {
    const html = buildNdaDocumentHtml(FULL_CONTEXT);

    // Every system field must be non-editable, or a keystroke could rewrite who the
    // agreement names.
    const systemSpans = [...html.matchAll(/<span class="nda-field-system"[^>]*>/g)];
    expect(systemSpans.length).toBeGreaterThan(0);
    systemSpans.forEach((span) => expect(span[0]).toContain('contenteditable="false"'));

    const systemValues = fieldsWithClass(html, NDA_SYSTEM_FIELD_CLASS);
    expect(systemValues).toContain("ZIRA TECH LASER");
    expect(systemValues).toContain("zira34@gmail.com");
    expect(systemValues).toContain("V-1043");
    expect(systemValues).toContain("PR-25");
    expect(systemValues).toContain("Engineering");
    expect(systemValues).toContain("IT Services");
  });

  it("leaves the business requirement and procurement purpose editable", () => {
    const html = buildNdaDocumentHtml(FULL_CONTEXT);
    const editable = fieldsWithClass(html, NDA_EDITABLE_FIELD_CLASS);

    expect(editable).toContain("Laser cutting subcontracting for the Q2 enclosure build");
    expect(html).toContain('data-nda-field="procurement_purpose"');
    expect(html).toContain('data-nda-field="additional_terms"');
  });

  it("populates the address and tax registration the vendor record actually carries", () => {
    const html = buildNdaDocumentHtml(FULL_CONTEXT);
    const systemValues = fieldsWithClass(html, NDA_SYSTEM_FIELD_CLASS);

    expect(systemValues).toContain("12 Industrial Estate, Pune, MH 411001");
    expect(systemValues).toContain("GSTIN 27AABCZ1234H1Z5");
  });

  it("never invents vendor or company details it was not given", () => {
    const html = buildNdaDocumentHtml({ vendorName: "ZIRA TECH LASER", prNumber: "PR-25" });

    // Missing values become visible editable placeholders, not plausible-looking text.
    expect(html).toContain("[Vendor address]");
    expect(html).toContain("[Disclosing party name]");
    expect(html).toContain("[Registered office address]");

    // Nothing claims a tax registration when the record has none.
    expect(html).not.toContain("tax registration");
    expect(html).not.toContain("GSTIN");
  });

  it("escapes vendor-supplied text so a name cannot inject markup", () => {
    const html = buildNdaDocumentHtml({
      ...FULL_CONTEXT,
      vendorName: '<img src=x onerror="alert(1)">',
    });

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("escapes the characters that would otherwise break out of an attribute or tag", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
});
