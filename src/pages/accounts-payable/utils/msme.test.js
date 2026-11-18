import { describe, it, expect } from "vitest";
import { isMsmeItem, withoutMsme } from "./msme";

describe("withoutMsme", () => {
  it("drops items whose key or link is MSME-specific and keeps the rest in order", () => {
    const items = [
      { key: "term_exceptions" },
      { key: "msme" },
      { key: "msme_form1" },
      { tone: "bad", link: "/accounts-payable/reports?report=msme_payments", text: "2 MSME invoices…" },
      { tone: "info", link: "/accounts-payable/reports?report=ageing", text: "Overdue" },
      { key: "gst_itc" },
    ];
    expect(withoutMsme(items)).toEqual([items[0], items[4], items[5]]);
  });

  it("tolerates a missing list and items without key or link", () => {
    expect(withoutMsme(undefined)).toEqual([]);
    expect(isMsmeItem({ text: "no key" })).toBe(false);
  });
});
